/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte SQLite-Testdatenbank, echte Rollen, Sessions und HTTP-Requests.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Auth, Permissions, Services, Repositories und DB-Junctions laufen real.
 *
 * Isolation:
 * - Temporäre SQLite-Datei aus `tests/.runtime`, Truncate vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Persönliche Pläne werden pro User und Datum eindeutig angelegt und versioniert aktualisiert.
 * - Aufgaben, Termine, Notizen und Kommentare können einem persönlichen Plan zugeordnet und ohne Datenverlust wieder gelöst werden.
 * - Day-Plan-Routen sind authentifizierungspflichtig und unterscheiden read/write/delete-Permissions.
 *
 * Fehlerfälle:
 * - Ohne Session liefert die API 401, Reader-Schreibzugriffe liefern 403, ungültige Daten 400 und veraltete Versionen 409.
 *
 * Ziel:
 * Die persönliche Planung als geschützte, versionierte API-Domäne mit echten Relationen absichern.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { comments, dayPlanComments, dayPlanEvents, dayPlanNotes, dayPlans, dayPlanTasks, notes, tasks } from "../../../apps/api/src/db/schema.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

async function createReaderAgent(app: FastifyInstance) {
  const admin = await loginAdmin(app);
  const roles = await admin.get("/api/admin/roles").expect(200);
  const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
  await admin
    .post("/api/admin/users")
    .send({ firstName: "Read", lastName: "Only", email: "reader-day-plan@example.test", roleId: readerRole.id, password: "password123", isActive: true })
    .expect(201);

  const reader = supertest.agent(app.server);
  await reader.post("/api/auth/login").send({ email: "reader-day-plan@example.test", password: "password123" }).expect(200);
  return reader;
}

describe("Day Plans API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAuthBypassAdmin: boolean;
  let originalApiKey: string | null;

  beforeAll(async () => {
    originalAuthBypassAdmin = config.authBypassAdmin;
    originalApiKey = config.apiKey;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    config.authBypassAdmin = false;
    config.apiKey = null;
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    config.apiKey = originalApiKey;
    await app?.close();
    await testDb?.close();
  });

  it("schützt persönliche Pläne vor anonymem Zugriff und erzeugt pro User und Datum genau einen Plan", async () => {
    await supertest(app.server).get("/api/day-plans/2026-05-27").expect(401);

    const admin = await loginAdmin(app);
    const first = await admin.get("/api/day-plans/2026-05-27").expect(200);
    const second = await admin.get("/api/day-plans/2026-05-27").expect(200);

    expect(first.body).toMatchObject({
      date: "2026-05-27",
      status: "open",
      version: 1,
      tasks: [],
      events: []
    });
    expect(first.body.notes).toBeUndefined();
    expect(second.body.id).toBe(first.body.id);
    expect((await testDb.db.select().from(dayPlans).where(eq(dayPlans.date, "2026-05-27")))).toHaveLength(1);
  });

  it("validiert Datum und aktualisiert Tagesstatus mit Versionsschutz", async () => {
    const admin = await loginAdmin(app);
    await admin.get("/api/day-plans/2026-13-01").expect(400);

    const current = await admin.get("/api/day-plans/2026-05-27").expect(200);
    const updated = await admin
      .patch("/api/day-plans/2026-05-27")
      .send({ status: "completed", expectedVersion: current.body.version })
      .expect(200);

    expect(updated.body).toMatchObject({ status: "completed", version: current.body.version + 1 });
    expect(updated.body.notes).toBeUndefined();

    await admin.patch("/api/day-plans/2026-05-27").send({ status: "open", expectedVersion: current.body.version }).expect(409);
  });

  it("erstellt und löst Tagesplan-Aufgaben ohne die Aufgabe zu löschen", async () => {
    const admin = await loginAdmin(app);
    const created = await admin
      .post("/api/day-plans/2026-05-27/tasks")
      .send({ title: "Tagesaufgabe", status: "active", priority: "medium", dueDate: "2026-05-27" })
      .expect(201);

    expect(created.body).toMatchObject({ title: "Tagesaufgabe", boardPosition: 1024 });
    const dayPlan = await admin.get("/api/day-plans/2026-05-27").expect(200);
    expect(dayPlan.body.tasks.map((task: { id: number }) => task.id)).toEqual([created.body.id]);
    expect((await testDb.db.select().from(dayPlanTasks))).toEqual([expect.objectContaining({ taskId: created.body.id, ownerId: dayPlan.body.id })]);

    await admin.delete(`/api/day-plans/2026-05-27/tasks/${created.body.id}`).expect(204);
    const afterUnlink = await admin.get("/api/day-plans/2026-05-27").expect(200);
    expect(afterUnlink.body.tasks).toEqual([]);
    expect((await testDb.db.select().from(tasks).where(eq(tasks.id, created.body.id)))[0]).toBeTruthy();
  });

  it("erstellt Tagesplan-Termine mit DayPlan-Owner und löst nur die Zuordnung", async () => {
    const admin = await loginAdmin(app);
    const created = await admin
      .post("/api/day-plans/2026-05-27/events")
      .send({
        title: "Planung",
        startTime: "2026-05-27T08:00:00.000Z",
        endTime: "2026-05-27T09:00:00.000Z",
        isAllDay: false,
        color: "var(--color-teal)"
      })
      .expect(201);

    const dayPlan = await admin.get("/api/day-plans/2026-05-27").expect(200);
    expect(created.body.owners).toEqual([{ type: "dayPlan", id: dayPlan.body.id }]);
    expect(dayPlan.body.events.map((event: { id: number }) => event.id)).toEqual([created.body.id]);
    expect((await testDb.db.select().from(dayPlanEvents))).toEqual([expect.objectContaining({ eventId: created.body.id, ownerId: dayPlan.body.id })]);

    await admin.delete(`/api/day-plans/2026-05-27/events/${created.body.id}`).expect(204);
    const afterUnlink = await admin.get("/api/day-plans/2026-05-27").expect(200);
    expect(afterUnlink.body.events).toEqual([]);
    const persisted = await admin.get(`/api/events/${created.body.id}`).expect(200);
    expect(persisted.body.id).toBe(created.body.id);
  });

  it("erstellt und löst Notizen und Kommentare am persönlichen Plan", async () => {
    const admin = await loginAdmin(app);
    const dayPlan = await admin.get("/api/day-plans/2026-05-27").expect(200);

    const createdNote = await admin
      .post(`/api/day-plans/${dayPlan.body.id}/notes`)
      .send({ title: "Planungsnotiz", contentJson: { type: "doc", content: [] } })
      .expect(201);
    const noteList = await admin.get(`/api/day-plans/${dayPlan.body.id}/notes`).expect(200);
    expect(noteList.body.map((note: { id: number }) => note.id)).toEqual([createdNote.body.id]);
    expect((await testDb.db.select().from(dayPlanNotes))).toEqual([expect.objectContaining({ dayPlanId: dayPlan.body.id, noteId: createdNote.body.id })]);

    await admin.delete(`/api/day-plans/${dayPlan.body.id}/notes/${createdNote.body.id}`).expect(204);
    await admin.get(`/api/day-plans/${dayPlan.body.id}/notes`).expect(200).expect((response) => expect(response.body).toEqual([]));
    expect((await testDb.db.select().from(notes).where(eq(notes.id, createdNote.body.id)))[0]).toBeTruthy();

    const createdComment = await admin.post(`/api/day-plans/${dayPlan.body.id}/comments`).send({ body: "Kommentar zur Planung" }).expect(201);
    const commentList = await admin.get(`/api/day-plans/${dayPlan.body.id}/comments`).expect(200);
    expect(commentList.body.map((comment: { id: number }) => comment.id)).toEqual([createdComment.body.id]);
    expect((await testDb.db.select().from(dayPlanComments))).toEqual([expect.objectContaining({ dayPlanId: dayPlan.body.id, commentId: createdComment.body.id })]);

    await admin.delete(`/api/day-plans/${dayPlan.body.id}/comments/${createdComment.body.id}`).expect(204);
    await admin.get(`/api/day-plans/${dayPlan.body.id}/comments`).expect(200).expect((response) => expect(response.body).toEqual([]));
    expect((await testDb.db.select().from(comments).where(eq(comments.id, createdComment.body.id)))[0]).toBeTruthy();
  });

  it("blockiert DayPlan-ID-Zugriff auf persönliche Pläne anderer User", async () => {
    const admin = await loginAdmin(app);
    const reader = await createReaderAgent(app);
    const readerPlan = await reader.get("/api/day-plans/2026-05-27").expect(200);

    await admin.get(`/api/day-plans/${readerPlan.body.id}/notes`).expect(404);
    await admin.get(`/api/day-plans/${readerPlan.body.id}/comments`).expect(404);
    await admin.get(`/api/journal/objects/dayPlan/${readerPlan.body.id}`).expect(404);
  });

  it("erlaubt Readern lesenden Zugriff und blockiert Tagesplan-Schreiboperationen", async () => {
    const reader = await createReaderAgent(app);
    await reader.get("/api/day-plans/2026-05-27").expect(200);
    await reader.post("/api/day-plans/2026-05-27/tasks").send({ title: "Nicht erlaubt" }).expect(403);
  });
});
