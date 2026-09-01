/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Dashboard-Widgetendpunkte liefern echte Aufgaben-, Ticket-, Kommentar- und Datei-Daten.
 * - Owner-Filter grenzen Projekt- und Meilenstein-Daten ein.
 * - Startseiten-/Global-Widgetdaten ohne Owner liefern globale statt nur eigene Aktivität.
 * - Überfällige Aufgaben berücksichtigen offene Status und Fälligkeitsdatum.
 * - Aktuelle Aufgaben und Tickets werten geschlossene Katalogeinträge über isClosed aus.
 * - tasks/recent mit includeClosed=true behält geschlossene Aufgaben für Board-/Listen-Widgets.
 * - tasks/recent und tasks/stats mit dayPlan-Owner liefern Aufgaben datumsübergreifend über alle Tagespläne des Users (dedupliziert), nicht nur des übergebenen Plans.
 * - Neue Widgetdaten-Endpunkte bleiben authentifizierungspflichtig.
 *
 * Fehlerfälle:
 * - Anonyme Widgetdaten-Abfrage und unvollständige Owner-Query.
 * - Fremder dayPlan-Owner liefert 404 (keine Fremddaten über fremde Plan-IDs).
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
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-dashboard-widgets-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-dashboard-widget-previews-${process.pid}`);
let originalUploadDir: string;
let originalPreviewCacheDir: string;

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

describe("Dashboard widget data API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    originalUploadDir = config.uploadDir;
    originalPreviewCacheDir = config.previewCacheDir;
    config.uploadDir = uploadDir;
    config.previewCacheDir = previewCacheDir;
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    config.uploadDir = originalUploadDir;
    config.previewCacheDir = originalPreviewCacheDir;
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
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
    await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "In Arbeit", status: "in_progress", priority: "medium", dueDate: "2999-06-01" }).expect(201);
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
          body: "<p>Kommentar am Meilenstein-Task</p>",
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
        body: "<p>Bearbeiteter Kommentar</p>",
        updatedAt: updatedComment.body.updatedAt,
        entityType: "task",
        entityId: task.body.id
      })
    );
    expect(globalComments.body.map((comment: { body: string }) => comment.body)).toEqual(
      expect.arrayContaining([
        "<p>Kommentar im anderen Projekt</p>",
        "<p>Feature-Kommentar global</p>",
        "<p>Use-Case-Kommentar global</p>",
        "<p>Backlog-Kommentar global</p>",
        "<p>Wiki-Kommentar global</p>"
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

  // =========================================================================
  // Schritt 1: Meilenstein-Kontext
  // =========================================================================

  it("Schritt 1 – filtert Widget-Daten korrekt auf Meilenstein-Owner", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "MS-Widget Projekt" }).expect(201);
    const ms = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Meilenstein A", status: "active" }).expect(201);
    const otherMs = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Meilenstein B", status: "active" }).expect(201);

    const closedStatus = await admin
      .post("/api/catalogs/workStatus")
      .send({ key: "ms_closed_x", label: "MS Geschlossen", sortOrder: 1350, isClosed: true, color: "var(--color-steel-500)" })
      .expect(201);

    // Tasks für Meilenstein A: 1 offen, 1 abgeschlossen
    const taskA = await admin.post(`/api/milestones/${ms.body.id}/tasks`).send({ title: "MS-A Task offen", status: "todo", priority: "medium" }).expect(201);
    await admin.post(`/api/milestones/${ms.body.id}/tasks`).send({ title: "MS-A Task erledigt", status: closedStatus.body.key, priority: "low" }).expect(201);

    // Task für anderen Meilenstein – darf nicht erscheinen
    await admin.post(`/api/milestones/${otherMs.body.id}/tasks`).send({ title: "MS-B Task", status: "todo", priority: "medium" }).expect(201);

    // Ticket für Meilenstein A
    await admin.post(`/api/milestones/${ms.body.id}/tickets`).send({ title: "MS-A Ticket", type: "bug", status: "open", priority: "medium" }).expect(201);

    // Kommentar direkt am Meilenstein A
    await admin.post(`/api/milestones/${ms.body.id}/comments`).send({ body: "Direkter Meilenstein-Kommentar" }).expect(201);
    // Kommentar am Task des Meilensteins A
    await admin.post(`/api/tasks/${taskA.body.id}/comments`).send({ body: "Task-Kommentar im Meilenstein" }).expect(201);

    // Attachment für Meilenstein A
    await admin
      .post(`/api/milestones/${ms.body.id}/attachments`)
      .attach("file", Buffer.from("MS-Anhang"), { filename: "ms-anhang.txt", contentType: "text/plain" })
      .expect(201);

    // taskStatusReport für Meilenstein A: beide Tasks zählen, closed ist dabei
    const taskStats = await admin.get(`/api/tasks/stats?ownerType=milestone&ownerId=${ms.body.id}`).expect(200);
    expect(taskStats.body.total).toBe(2);
    expect(taskStats.body.statusCounts).toMatchObject({ todo: 1, [closedStatus.body.key]: 1 });

    // ticketStatusReport für Meilenstein A
    const ticketStats = await admin.get(`/api/tickets/stats?ownerType=milestone&ownerId=${ms.body.id}`).expect(200);
    expect(ticketStats.body.total).toBe(1);
    expect(ticketStats.body.statusCounts).toMatchObject({ open: 1 });

    // taskJournal – geschlossene Tasks werden ausgeblendet, fremde Meilensteine isoliert
    const recentTasks = await admin.get(`/api/tasks/recent?ownerType=milestone&ownerId=${ms.body.id}`).expect(200);
    const taskTitles = recentTasks.body.map((t: { title: string }) => t.title);
    expect(taskTitles).toContain("MS-A Task offen");
    expect(taskTitles).not.toContain("MS-A Task erledigt");
    expect(taskTitles).not.toContain("MS-B Task");

    // ticketJournal für Meilenstein A
    const recentTickets = await admin.get(`/api/tickets/recent?ownerType=milestone&ownerId=${ms.body.id}`).expect(200);
    expect(recentTickets.body.map((t: { title: string }) => t.title)).toContain("MS-A Ticket");

    // commentJournal für Meilenstein A: direkter Kommentar und Task-Kommentar
    const recentComments = await admin.get(`/api/comments/recent?ownerType=milestone&ownerId=${ms.body.id}`).expect(200);
    const commentBodies = recentComments.body.map((c: { body: string }) => c.body);
    expect(commentBodies).toContain("<p>Direkter Meilenstein-Kommentar</p>");
    expect(commentBodies).toContain("<p>Task-Kommentar im Meilenstein</p>");

    // attachmentJournal für Meilenstein A
    const recentAttachments = await admin.get(`/api/attachments/recent?ownerType=milestone&ownerId=${ms.body.id}`).expect(200);
    expect(recentAttachments.body.map((a: { filename: string }) => a.filename)).toContain("ms-anhang.txt");

    // Meilenstein B bleibt isoliert
    const otherTaskStats = await admin.get(`/api/tasks/stats?ownerType=milestone&ownerId=${otherMs.body.id}`).expect(200);
    expect(otherTaskStats.body.total).toBe(1);
    expect(otherTaskStats.body.statusCounts).not.toHaveProperty("ms_closed_x");
  });

  // =========================================================================
  // Schritt 2: Task-Kontext (Subtask-Zählung und Kommentare)
  // =========================================================================

  it("Schritt 2 – filtert Widget-Daten korrekt auf Task-Owner (Subtasks und Kommentare)", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Task-Widget Projekt" }).expect(201);
    const parentTask = await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Eltern-Task", status: "in_progress", priority: "high" }).expect(201);
    const otherTask = await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Anderer Task", status: "todo", priority: "medium" }).expect(201);

    // Subtasks des Eltern-Tasks
    await admin.post(`/api/tasks/${parentTask.body.id}/subtasks`).send({ title: "Subtask offen", status: "todo" }).expect(201);
    await admin.post(`/api/tasks/${parentTask.body.id}/subtasks`).send({ title: "Subtask in Arbeit", status: "in_progress" }).expect(201);

    // Kommentar am Eltern-Task
    await admin.post(`/api/tasks/${parentTask.body.id}/comments`).send({ body: "Eltern-Kommentar" }).expect(201);
    // Kommentar am anderen Task – darf nicht erscheinen
    await admin.post(`/api/tasks/${otherTask.body.id}/comments`).send({ body: "Fremder Kommentar" }).expect(201);

    // taskStatusReport für Task-Kontext: zählt Subtasks
    const taskStats = await admin.get(`/api/tasks/stats?ownerType=task&ownerId=${parentTask.body.id}`).expect(200);
    expect(taskStats.body.total).toBe(2);
    expect(taskStats.body.statusCounts).toMatchObject({ todo: 1, in_progress: 1 });

    // taskStats für Task ohne Subtasks → total 0
    const emptyStats = await admin.get(`/api/tasks/stats?ownerType=task&ownerId=${otherTask.body.id}`).expect(200);
    expect(emptyStats.body.total).toBe(0);

    // commentJournal für Task-Kontext: nur eigene Kommentare
    const recentComments = await admin.get(`/api/comments/recent?ownerType=task&ownerId=${parentTask.body.id}`).expect(200);
    const commentBodies = recentComments.body.map((c: { body: string }) => c.body);
    expect(commentBodies).toContain("<p>Eltern-Kommentar</p>");
    expect(commentBodies).not.toContain("<p>Fremder Kommentar</p>");
  });

  // =========================================================================
  // Schritt 3: Widget-Parameter (limit und sort)
  // =========================================================================

  it("Schritt 3 – respektiert limit- und sort-Parameter für taskJournal, ticketJournal und overdueTasks", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Param-Widget Projekt" }).expect(201);

    // 3 offene Tasks sequenziell anlegen (minimaler Abstand für stabile Sortierung)
    for (let i = 1; i <= 3; i++) {
      await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: `Task ${i}`, status: "todo", priority: "medium" }).expect(201);
      await new Promise<void>((r) => setTimeout(r, 10));
    }

    // 3 Tickets anlegen
    for (let i = 1; i <= 3; i++) {
      await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: `Ticket ${i}`, type: "bug", status: "open", priority: "medium" }).expect(201);
    }

    // limit=1 gibt genau 1 Aufgabe zurück
    const tasks1 = await admin.get(`/api/tasks/recent?ownerType=project&ownerId=${project.body.id}&limit=1`).expect(200);
    expect(tasks1.body).toHaveLength(1);

    // limit=2 gibt genau 2 Tickets zurück
    const tickets2 = await admin.get(`/api/tickets/recent?ownerType=project&ownerId=${project.body.id}&limit=2`).expect(200);
    expect(tickets2.body).toHaveLength(2);

    // sort=createdAt: zuletzt angelegter Task steht zuerst (Task 3)
    const byCreatedAt = await admin.get(`/api/tasks/recent?ownerType=project&ownerId=${project.body.id}&sort=createdAt`).expect(200);
    expect(byCreatedAt.body).toHaveLength(3);
    expect((byCreatedAt.body[0] as { title: string }).title).toBe("Task 3");

    // sort=updatedAt: ohne Updates gleiche Reihenfolge wie createdAt
    const byUpdatedAt = await admin.get(`/api/tasks/recent?ownerType=project&ownerId=${project.body.id}&sort=updatedAt`).expect(200);
    expect(byUpdatedAt.body).toHaveLength(3);
    expect((byUpdatedAt.body[0] as { title: string }).title).toBe("Task 3");

    // overdueTasks: limit begrenzt Ergebnisse
    const project2 = await admin.post("/api/projects").send({ name: "Overdue-Limit Projekt" }).expect(201);
    for (let i = 1; i <= 4; i++) {
      await admin.post(`/api/projects/${project2.body.id}/tasks`).send({ title: `Überfällig ${i}`, status: "todo", priority: "medium", dueDate: "2026-01-01" }).expect(201);
    }
    const overdueLimit2 = await admin.get(`/api/tasks/overdue?ownerType=project&ownerId=${project2.body.id}&limit=2`).expect(200);
    expect(overdueLimit2.body).toHaveLength(2);
  });

  // =========================================================================
  // Schritt 4: Widget-Counter nach Datenänderung
  // =========================================================================

  it("Schritt 4 – Widget-Daten spiegeln Statuswechsel und Abschluss sofort wider", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Mutation-Widget Projekt" }).expect(201);
    const task = await admin
      .post(`/api/projects/${project.body.id}/tasks`)
      .send({ title: "Mutations-Task", status: "todo", priority: "high", dueDate: "2026-01-01" })
      .expect(201);

    // Ausgangszustand: todo in taskStatusReport, erscheint in overdueTasks und taskJournal
    const statsBefore = await admin.get(`/api/tasks/stats?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(statsBefore.body).toMatchObject({ total: 1, statusCounts: { todo: 1 } });

    const overdueBefore = await admin.get(`/api/tasks/overdue?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(overdueBefore.body.map((t: { title: string }) => t.title)).toContain("Mutations-Task");

    const recentBefore = await admin.get(`/api/tasks/recent?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(recentBefore.body.map((t: { title: string }) => t.title)).toContain("Mutations-Task");

    // Task auf "done" (geschlossener Systemstatus) setzen
    await admin.patch(`/api/tasks/${task.body.id}`).send({ status: "done", expectedVersion: task.body.version }).expect(200);

    // taskStatusReport: zeigt jetzt "done"
    const statsAfter = await admin.get(`/api/tasks/stats?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(statsAfter.body.statusCounts).toHaveProperty("done", 1);
    expect(statsAfter.body.statusCounts).not.toHaveProperty("todo");

    // overdueTasks: abgeschlossener Task verschwindet
    const overdueAfter = await admin.get(`/api/tasks/overdue?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(overdueAfter.body.map((t: { title: string }) => t.title)).not.toContain("Mutations-Task");

    // taskJournal: geschlossener Task wird gefiltert
    const recentAfter = await admin.get(`/api/tasks/recent?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(recentAfter.body.map((t: { title: string }) => t.title)).not.toContain("Mutations-Task");

    // Ticket-Mutation: Ticket anlegen → Stats steigen, schließen → aus recent herausgefiltert
    const closedTicketStatus = await admin
      .post("/api/catalogs/workStatus")
      .send({ key: "ticket_closed_m", label: "Ticket Geschlossen", sortOrder: 1450, isClosed: true, color: "var(--color-steel-500)" })
      .expect(201);
    const ticket = await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: "Mutations-Ticket", type: "bug", status: "open", priority: "medium" }).expect(201);

    const ticketStatsBefore = await admin.get(`/api/tickets/stats?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(ticketStatsBefore.body.statusCounts).toMatchObject({ open: 1 });

    await admin.patch(`/api/tickets/${ticket.body.id}`).send({ status: closedTicketStatus.body.key, expectedVersion: ticket.body.version }).expect(200);

    const ticketRecentAfter = await admin.get(`/api/tickets/recent?ownerType=project&ownerId=${project.body.id}`).expect(200);
    expect(ticketRecentAfter.body.map((t: { title: string }) => t.title)).not.toContain("Mutations-Ticket");
  });

  // =========================================================================
  // Schritt 5: DayPlan-Kontext (noteList, overdueTasks, commentJournal)
  // =========================================================================

  it("Schritt 5 – liefert noteList, overdueTasks und commentJournal für DayPlan-Owner", async () => {
    const admin = await loginAdmin(app);
    const date = "2026-08-15";

    // DayPlan für dieses Datum holen/anlegen (ID-basiert)
    const dayPlanRes = await admin.get(`/api/day-plans/${date}`).expect(200);
    const dayPlanId = (dayPlanRes.body as { id: number }).id;

    // noteList: Note direkt am DayPlan anlegen
    await admin.post(`/api/day-plans/${dayPlanId}/notes`).send({ title: "Tagesplan-Notiz", contentJson: { type: "doc", content: [] } }).expect(201);

    // overdueTasks: überfälligen Task und Zukunfts-Task in DayPlan einbinden
    const project = await admin.post("/api/projects").send({ name: "DayPlan-Projekt" }).expect(201);
    const overdueTask = await admin
      .post(`/api/projects/${project.body.id}/tasks`)
      .send({ title: "DayPlan-Überfälliger-Task", status: "todo", priority: "high", dueDate: "2026-01-01" })
      .expect(201);
    const futureTask = await admin
      .post(`/api/projects/${project.body.id}/tasks`)
      .send({ title: "DayPlan-Zukunfts-Task", status: "todo", priority: "medium", dueDate: "2030-12-31" })
      .expect(201);
    await admin.post(`/api/day-plans/${date}/tasks/${overdueTask.body.id}`).expect(200);
    await admin.post(`/api/day-plans/${date}/tasks/${futureTask.body.id}`).expect(200);

    // commentJournal: Kommentar direkt am DayPlan anlegen
    await admin.post(`/api/day-plans/${dayPlanId}/comments`).send({ body: "Tagesplan-Kommentar" }).expect(201);

    // noteList: GET /api/day-plans/:id/notes
    const notes = await admin.get(`/api/day-plans/${dayPlanId}/notes`).expect(200);
    expect(notes.body.map((n: { title: string }) => n.title)).toContain("Tagesplan-Notiz");

    // overdueTasks für DayPlan-Owner: nur überfällige, nicht Zukunfts-Task
    const overdueTasks = await admin.get(`/api/tasks/overdue?ownerType=dayPlan&ownerId=${dayPlanId}`).expect(200);
    const overdueTitles = overdueTasks.body.map((t: { title: string }) => t.title);
    expect(overdueTitles).toContain("DayPlan-Überfälliger-Task");
    expect(overdueTitles).not.toContain("DayPlan-Zukunfts-Task");

    // commentJournal für DayPlan-Owner
    const recentComments = await admin.get(`/api/comments/recent?ownerType=dayPlan&ownerId=${dayPlanId}`).expect(200);
    expect(recentComments.body.map((c: { body: string }) => c.body)).toContain("<p>Tagesplan-Kommentar</p>");
  });

  // =========================================================================
  // Schritt 6: includeClosed für Board-/Listen-Widgets (taskBoard, taskList)
  // =========================================================================

  it("Schritt 6 – tasks/recent mit includeClosed hält geschlossene Aufgaben für Board-/Listen-Widgets sichtbar", async () => {
    const admin = await loginAdmin(app);
    const date = "2026-09-20";

    const dayPlanRes = await admin.get(`/api/day-plans/${date}`).expect(200);
    const dayPlanId = (dayPlanRes.body as { id: number }).id;

    const openTask = await admin.post(`/api/day-plans/${date}/tasks`).send({ title: "Offene DayPlan-Aufgabe", status: "todo", priority: "medium" }).expect(201);
    const closingTask = await admin.post(`/api/day-plans/${date}/tasks`).send({ title: "Zu schließende DayPlan-Aufgabe", status: "todo", priority: "high" }).expect(201);

    // Aufgabe auf "done" (geschlossener Systemstatus) setzen – wie im Widget
    await admin.patch(`/api/tasks/${closingTask.body.id}`).send({ status: "done", expectedVersion: closingTask.body.version }).expect(200);

    // Default (Journal-Verhalten): geschlossene Aufgabe wird ausgeblendet
    const recentDefault = await admin.get(`/api/tasks/recent?ownerType=dayPlan&ownerId=${dayPlanId}`).expect(200);
    const defaultTitles = recentDefault.body.map((t: { title: string }) => t.title);
    expect(defaultTitles).toContain("Offene DayPlan-Aufgabe");
    expect(defaultTitles).not.toContain("Zu schließende DayPlan-Aufgabe");

    // Board/Liste: includeClosed=true behält die geschlossene Aufgabe für die Geschlossen-Gruppe
    const recentWithClosed = await admin.get(`/api/tasks/recent?ownerType=dayPlan&ownerId=${dayPlanId}&includeClosed=true`).expect(200);
    const withClosedTitles = recentWithClosed.body.map((t: { title: string }) => t.title);
    expect(withClosedTitles).toContain("Offene DayPlan-Aufgabe");
    expect(withClosedTitles).toContain("Zu schließende DayPlan-Aufgabe");
    expect(openTask.body.title).toBe("Offene DayPlan-Aufgabe");
  });

  it("liefert Tagesplan-Widgetdaten datumsübergreifend über alle Pläne des Users und isoliert fremde", async () => {
    const admin = await loginAdmin(app);

    // Aufgaben an zwei verschiedenen Tagen → zwei verschiedene Tagespläne desselben Users.
    const taskTag1 = await admin.post("/api/day-plans/2026-09-21/tasks").send({ title: "Aufgabe Tag 1", status: "todo", priority: "medium" }).expect(201);
    const taskTag2 = await admin.post("/api/day-plans/2026-09-22/tasks").send({ title: "Aufgabe Tag 2", status: "todo", priority: "high" }).expect(201);
    // Dieselbe Aufgabe zusätzlich an einem dritten Tag → muss dedupliziert genau einmal erscheinen.
    await admin.post(`/api/day-plans/2026-09-23/tasks/${taskTag1.body.id}`).expect(200);

    // Fremde Aufgabe eines anderen Users darf nie erscheinen.
    const roles = await admin.get("/api/admin/roles").expect(200);
    const adminRole = roles.body.find((role: { key: string }) => role.key === "admin") as { id: number };
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Cross", lastName: "Other", email: "cross-date-widget-other@example.test", roleId: adminRole.id, password: "password123", isActive: true })
      .expect(201);
    const other = supertest.agent(app.server);
    await other.post("/api/auth/login").send({ email: "cross-date-widget-other@example.test", password: "password123" }).expect(200);
    const foreignTask = await other.post("/api/day-plans/2026-09-21/tasks").send({ title: "Fremd", status: "todo", priority: "medium" }).expect(201);

    // Owner ist NUR der Plan von Tag 1; das Widget muss dennoch alle Tage des Users liefern.
    const planTag1 = await admin.get("/api/day-plans/2026-09-21").expect(200);
    const ownerId = (planTag1.body as { id: number }).id;
    const recent = await admin.get(`/api/tasks/recent?ownerType=dayPlan&ownerId=${ownerId}&includeClosed=true`).expect(200);
    const ids = (recent.body as Array<{ id: number }>).map((task) => task.id);
    expect(ids).toEqual(expect.arrayContaining([taskTag1.body.id, taskTag2.body.id]));
    expect(ids).not.toContain(foreignTask.body.id);
    // Dedupliziert: Aufgabe an zwei Plänen erscheint nur einmal.
    expect(ids.filter((id) => id === taskTag1.body.id)).toHaveLength(1);

    // Statistik-Widget zählt ebenfalls datumsübergreifend (2 Aufgaben des Users).
    const stats = await admin.get(`/api/tasks/stats?ownerType=dayPlan&ownerId=${ownerId}`).expect(200);
    expect(stats.body.total).toBe(2);

    // Sicherheit: fremder Plan-Owner ist für den Admin nicht zugreifbar (kein Datenleck über fremde Plan-IDs).
    const foreignPlan = await other.get("/api/day-plans/2026-09-21").expect(200);
    await admin.get(`/api/tasks/recent?ownerType=dayPlan&ownerId=${(foreignPlan.body as { id: number }).id}`).expect(404);
  });
});
