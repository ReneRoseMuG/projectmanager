/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Dashboard-Widgetendpunkte liefern echte Aufgaben-, Ticket-, Kommentar- und Datei-Daten.
 * - Owner-Filter grenzen Projekt- und Meilenstein-Daten ein.
 * - Startseiten-/Global-Widgetdaten ohne Owner liefern globale statt nur eigene Aktivität.
 * - Überfällige Aufgaben berücksichtigen offene Status und Fälligkeitsdatum.
 * - Aktuelle Aufgaben und Tickets werten geschlossene Katalogeinträge über isClosed aus.
 * - Neue Widgetdaten-Endpunkte bleiben authentifizierungspflichtig.
 *
 * Fehlerfälle:
 * - Anonyme Widgetdaten-Abfrage und unvollständige Owner-Query.
 *
 * Ziel:
 * Die Backend-Datenbasis der Dashboard-Widgets gegen falsche Zählungen, falsche Filter und offene API-Zugriffe absichern.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-dashboard-widgets-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-dashboard-widget-previews-${process.pid}`);

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

describe("Dashboard widget data API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let previousUploadDir: string | undefined;
  let previousPreviewCacheDir: string | undefined;

  beforeAll(async () => {
    previousUploadDir = process.env.UPLOAD_DIR;
    previousPreviewCacheDir = process.env.PREVIEW_CACHE_DIR;
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true });
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    testDb.sqlite.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    if (previousUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = previousUploadDir;
    }
    if (previousPreviewCacheDir === undefined) {
      delete process.env.PREVIEW_CACHE_DIR;
    } else {
      process.env.PREVIEW_CACHE_DIR = previousPreviewCacheDir;
    }
  });

  it("zählt Aufgaben und Tickets nach Status und filtert überfällige Aufgaben nach Projekt", async () => {
    await supertest(app.server).get("/api/tasks/stats").expect(401);
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Dashboarddaten" }).expect(201);
    const closedStatus = await admin
      .post("/api/catalogs/workStatus")
      .send({ key: "review_passed", label: "Abnahme passiert", sortOrder: 1300, isClosed: true, color: "var(--color-steel-500)" })
      .expect(201);

    await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Offen überfällig", status: "todo", priority: "high", dueDate: "2026-05-01" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "In Arbeit", status: "in_progress", priority: "medium", dueDate: "2026-06-01" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Erledigt alt", status: "done", priority: "low", dueDate: "2026-05-01" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Frei geschlossener Status", status: closedStatus.body.key, priority: "low", dueDate: "2026-05-01" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: "Bug offen", type: "bug", status: "open", priority: "urgent" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: "Bug gelöst", type: "bug", status: "resolved", priority: "medium" }).expect(201);

    const taskStats = await admin.get(`/api/tasks/stats?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(taskStats.body).toEqual({ total: 4, statusCounts: { done: 1, in_progress: 1, review_passed: 1, todo: 1 } });

    const overdue = await admin.get(`/api/tasks/overdue?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(overdue.body.map((task: { title: string }) => task.title)).toEqual(["Offen überfällig"]);

    const recentTasks = await admin.get(`/api/tasks/recent?ownerType=project&ownerId=${project.body.id}&limit=10&sort=createdAt`).expect(200);
    const recentTaskTitles = recentTasks.body.map((task: { title: string }) => task.title);
    expect(recentTaskTitles).toContain("In Arbeit");
    expect(recentTaskTitles).not.toContain("Erledigt alt");
    expect(recentTaskTitles).not.toContain("Frei geschlossener Status");

    const ticketStats = await admin.get(`/api/tickets/stats?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(ticketStats.body).toEqual({ total: 2, statusCounts: { open: 1, resolved: 1 } });

    await admin.get("/api/tasks/stats?ownerType=project").expect(400);
  });

  it("liefert aktuelle Aufgaben, Tickets und Kommentare owner-bezogen", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Aktivitätsdaten" }).expect(201);
    const milestone = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Meilenstein A", status: "active" }).expect(201);
    const closedStatus = await admin
      .post("/api/catalogs/workStatus")
      .send({ key: "ready_for_archive", label: "Bereit für Archiv", sortOrder: 1300, isClosed: true, color: "var(--color-steel-500)" })
      .expect(201);

    const projectTask = await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Projektaufgabe", status: "todo", priority: "medium" }).expect(201);
    const milestoneTask = await admin.post(`/api/milestones/${milestone.body.id}/tasks`).send({ title: "Meilensteinaufgabe", status: "in_progress", priority: "high" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: "Projektticket", type: "bug", status: "open", priority: "medium" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: "Geschlossenes Projektticket", type: "bug", status: closedStatus.body.key, priority: "medium" }).expect(201);
    await admin.post(`/api/milestones/${milestone.body.id}/tickets`).send({ title: "Meilensteinticket", type: "task", status: "open", priority: "medium" }).expect(201);
    await admin.post(`/api/tasks/${milestoneTask.body.id}/comments`).send({ body: "Kommentar am Meilenstein-Task" }).expect(201);

    const recentTasks = await admin.get(`/api/tasks/recent?ownerType=project&ownerId=${project.body.id}&limit=10&sort=createdAt`).expect(200);
    expect(recentTasks.body.map((task: { title: string }) => task.title)).toEqual(expect.arrayContaining(["Projektaufgabe", "Meilensteinaufgabe"]));

    const projectTaskStats = await admin.get(`/api/tasks/stats?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(projectTaskStats.body.total).toBe(2);
    expect(projectTaskStats.body.statusCounts).toMatchObject({ todo: 1, in_progress: 1 });

    const milestoneTickets = await admin.get(`/api/tickets/recent?ownerType=milestone&ownerId=${milestone.body.id}`).expect(200);
    expect(milestoneTickets.body.map((ticket: { title: string }) => ticket.title)).toEqual(["Meilensteinticket"]);

    const projectTickets = await admin.get(`/api/tickets/recent?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(projectTickets.body.map((ticket: { title: string }) => ticket.title)).toEqual(expect.arrayContaining(["Projektticket", "Meilensteinticket"]));
    expect(projectTickets.body.map((ticket: { title: string }) => ticket.title)).not.toContain("Geschlossenes Projektticket");

    const projectTicketStats = await admin.get(`/api/tickets/stats?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(projectTicketStats.body.total).toBe(3);
    expect(projectTicketStats.body.statusCounts).toMatchObject({ open: 2, ready_for_archive: 1 });

    const comments = await admin.get(`/api/comments/recent?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(comments.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          body: "Kommentar am Meilenstein-Task",
          entityType: "task",
          entityId: milestoneTask.body.id,
          entityLabel: "Meilensteinaufgabe"
        })
      ])
    );

    const taskStats = await admin.get(`/api/tasks/stats?ownerType=task&ownerId=${projectTask.body.id}`).expect(200);
    expect(taskStats.body.total).toBe(0);
  });

  it("liefert no-owner Widgetdaten global und begrenzt eigene Aktivität nur mit mine=true", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Globales Dashboard" }).expect(201);
    const otherProject = await admin.post("/api/projects").send({ name: "Anderer Kontext" }).expect(201);
    const feature = await admin.post("/api/features").send({ title: "Kommentiertes Feature" }).expect(201);
    const useCase = await admin.post(`/api/features/${feature.body.id}/use-cases`).send({ title: "Kommentierter Use Case" }).expect(201);
    const backlogItem = await admin.post(`/api/projects/${project.body.id}/backlog`).send({ title: "Kommentierter Backlog" }).expect(201);
    const wikiPage = await admin.post("/api/wiki").send({ title: "Kommentiertes Wiki" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Globaler Meilenstein", status: "active" }).expect(201);
    const task = await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Kommentierte Aufgabe", status: "todo", priority: "medium" }).expect(201);
    const otherTask = await admin.post(`/api/projects/${otherProject.body.id}/tasks`).send({ title: "Anderer Kommentarträger", status: "todo", priority: "medium" }).expect(201);
    const editedComment = await admin.post(`/api/tasks/${task.body.id}/comments`).send({ body: "Alter Kommentar" }).expect(201);
    await admin.post(`/api/tasks/${otherTask.body.id}/comments`).send({ body: "Kommentar im anderen Projekt" }).expect(201);
    await admin.post(`/api/features/${feature.body.id}/comments`).send({ body: "Feature-Kommentar global" }).expect(201);
    await admin.post(`/api/use-cases/${useCase.body.id}/comments`).send({ body: "Use-Case-Kommentar global" }).expect(201);
    await admin.post(`/api/backlog/${backlogItem.body.id}/comments`).send({ body: "Backlog-Kommentar global" }).expect(201);
    await admin.post(`/api/wiki/${wikiPage.body.id}/comments`).send({ body: "Wiki-Kommentar global" }).expect(201);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const updatedComment = await admin
      .patch(`/api/comments/${editedComment.body.id}`)
      .send({ body: "Bearbeiteter Kommentar", expectedVersion: editedComment.body.version })
      .expect(200);
    await admin
      .post(`/api/projects/${otherProject.body.id}/attachments`)
      .attach("file", Buffer.from("Dashboard-Datei"), { filename: "global-widget.txt", contentType: "text/plain" })
      .expect(201);
    await admin
      .post(`/api/features/${feature.body.id}/attachments`)
      .attach("file", Buffer.from("Feature-Datei"), { filename: "feature-widget.txt", contentType: "text/plain" })
      .expect(201);

    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Widget", lastName: "Reader", email: "widget-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "widget-reader@example.test", password: "password123" }).expect(200);

    const globalComments = await reader.get("/api/comments/recent?limit=10").expect(200);
    expect(globalComments.body[0]).toEqual(
      expect.objectContaining({
        id: editedComment.body.id,
        body: "Bearbeiteter Kommentar",
        updatedAt: updatedComment.body.updatedAt,
        entityType: "task",
        entityId: task.body.id
      })
    );
    expect(globalComments.body.map((comment: { body: string }) => comment.body)).toEqual(
      expect.arrayContaining([
        "Kommentar im anderen Projekt",
        "Feature-Kommentar global",
        "Use-Case-Kommentar global",
        "Backlog-Kommentar global",
        "Wiki-Kommentar global"
      ])
    );

    const ownComments = await reader.get("/api/comments/recent?mine=true&limit=10").expect(200);
    expect(ownComments.body).toEqual([]);

    const globalAttachments = await reader.get("/api/attachments/recent?limit=10").expect(200);
    expect(globalAttachments.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: "global-widget.txt",
          entityType: "project",
          entityId: otherProject.body.id
        }),
        expect.objectContaining({
          filename: "feature-widget.txt",
          entityType: "feature",
          entityId: feature.body.id
        })
      ])
    );

    const ownAttachments = await reader.get("/api/attachments/recent?mine=true&limit=10").expect(200);
    expect(ownAttachments.body).toEqual([]);
  });
});
