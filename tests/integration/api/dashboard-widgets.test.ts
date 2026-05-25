/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Dashboard-Widgetendpunkte liefern echte Aufgaben-, Ticket- und Kommentar-Daten.
 * - Owner-Filter grenzen Projekt- und Meilenstein-Daten ein.
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
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

describe("Dashboard widget data API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
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
});
