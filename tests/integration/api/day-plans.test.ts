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
 * - Tagespläne werden pro User und Datum eindeutig angelegt und versioniert aktualisiert.
 * - Aufgaben und Termine können einem Tagesplan zugeordnet und ohne Datenverlust wieder gelöst werden.
 * - Day-Plan-Routen sind authentifizierungspflichtig und unterscheiden read/write/delete-Permissions.
 *
 * Fehlerfälle:
 * - Ohne Session liefert die API 401, Reader-Schreibzugriffe liefern 403, ungültige Daten 400 und veraltete Versionen 409.
 *
 * Ziel:
 * Die Tagesplanung als geschützte, versionierte API-Domäne mit echten Relationen absichern.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { dayPlanEvents, dayPlans, dayPlanTasks, tasks } from "../../../apps/api/src/db/schema.js";
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
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(() => {
    config.authBypassAdmin = false;
    config.apiKey = null;
    truncateAll(testDb.sqlite);
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    config.apiKey = originalApiKey;
    await app.close();
    testDb.sqlite.close();
  });

  it("schützt Tagespläne vor anonymem Zugriff und erzeugt pro User und Datum genau einen Plan", async () => {
    await supertest(app.server).get("/api/day-plans/2026-05-27").expect(401);

    const admin = await loginAdmin(app);
    const first = await admin.get("/api/day-plans/2026-05-27").expect(200);
    const second = await admin.get("/api/day-plans/2026-05-27").expect(200);

    expect(first.body).toMatchObject({
      date: "2026-05-27",
      status: "open",
      notes: null,
      version: 1,
      tasks: [],
      events: []
    });
    expect(second.body.id).toBe(first.body.id);
    expect(testDb.db.select().from(dayPlans).where(eq(dayPlans.date, "2026-05-27")).all()).toHaveLength(1);
  });

  it("validiert Datum und aktualisiert Tagesstatus mit Versionsschutz", async () => {
    const admin = await loginAdmin(app);
    await admin.get("/api/day-plans/2026-13-01").expect(400);

    const current = await admin.get("/api/day-plans/2026-05-27").expect(200);
    const updated = await admin
      .patch("/api/day-plans/2026-05-27")
      .send({ status: "completed", notes: "Fokus: Kalender", expectedVersion: current.body.version })
      .expect(200);

    expect(updated.body).toMatchObject({ status: "completed", notes: "Fokus: Kalender", version: current.body.version + 1 });

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
    expect(testDb.db.select().from(dayPlanTasks).all()).toEqual([expect.objectContaining({ taskId: created.body.id, ownerId: dayPlan.body.id })]);

    await admin.delete(`/api/day-plans/2026-05-27/tasks/${created.body.id}`).expect(204);
    const afterUnlink = await admin.get("/api/day-plans/2026-05-27").expect(200);
    expect(afterUnlink.body.tasks).toEqual([]);
    expect(testDb.db.select().from(tasks).where(eq(tasks.id, created.body.id)).get()).toBeTruthy();
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
    expect(testDb.db.select().from(dayPlanEvents).all()).toEqual([expect.objectContaining({ eventId: created.body.id, ownerId: dayPlan.body.id })]);

    await admin.delete(`/api/day-plans/2026-05-27/events/${created.body.id}`).expect(204);
    const afterUnlink = await admin.get("/api/day-plans/2026-05-27").expect(200);
    expect(afterUnlink.body.events).toEqual([]);
    const persisted = await admin.get(`/api/events/${created.body.id}`).expect(200);
    expect(persisted.body.id).toBe(created.body.id);
  });

  it("erlaubt Readern lesenden Zugriff und blockiert Tagesplan-Schreiboperationen", async () => {
    const reader = await createReaderAgent(app);
    await reader.get("/api/day-plans/2026-05-27").expect(200);
    await reader.post("/api/day-plans/2026-05-27/tasks").send({ title: "Nicht erlaubt" }).expect(403);
  });
});
