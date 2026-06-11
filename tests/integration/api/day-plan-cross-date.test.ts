/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte Testdatenbank, echte Rollen, Sessions und HTTP-Requests.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Auth, Permissions, Services, Repositories und DB-Junctions laufen real.
 *
 * Isolation:
 * - Temporäre Testdatenbank, Truncate vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - GET /day-plans/tasks liefert alle Aufgaben aller Tagespläne des Users datumsübergreifend, dedupliziert und inklusive abgeschlossener.
 * - GET /day-plans/events liefert alle Termine aller Tagespläne des Users datumsübergreifend, dedupliziert.
 * - DELETE /day-plans/tasks/:taskId löst die Aufgabe aus allen Tagesplänen des Users, ohne die Aufgabe zu löschen.
 * - Fremde Aufgaben/Termine anderer User werden nicht ausgeliefert; fremde Verknüpfungen können nicht gelöst werden.
 *
 * Fehlerfälle:
 * - Ohne Session liefern die Routen 401, Reader ohne dayPlans:delete erhalten 403, nicht verknüpfte Aufgaben liefern 404.
 *
 * Ziel:
 * Die datumsunabhängige Persönliche Planung (entfernter Datumsfilter) als geschützte, user-isolierte API absichern.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { dayPlanTasks, tasks } from "../../../apps/api/src/db/schema.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

async function createUserAgent(app: FastifyInstance, roleKey: string, email: string) {
  const admin = await loginAdmin(app);
  const roles = await admin.get("/api/admin/roles").expect(200);
  const role = roles.body.find((entry: { key: string }) => entry.key === roleKey) as { id: number };
  await admin
    .post("/api/admin/users")
    .send({ firstName: "Test", lastName: roleKey, email, roleId: role.id, password: "password123", isActive: true })
    .expect(201);

  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
  return agent;
}

async function closedWorkStatusKey(agent: ReturnType<typeof supertest.agent>): Promise<string> {
  const catalogs = await agent.get("/api/catalogs").expect(200);
  const closed = (catalogs.body as Array<{ kind: string; key: string; isClosed?: boolean }>).find(
    (entry) => entry.kind === "workStatus" && entry.isClosed === true,
  );
  if (!closed) {
    throw new Error("No closed workStatus catalog entry available for test setup");
  }
  return closed.key;
}

describe("Day Plans cross-date API", () => {
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

  it("liefert Tagesplan-Aufgaben datumsübergreifend, dedupliziert, inklusive abgeschlossener und ohne fremde", async () => {
    await supertest(app.server).get("/api/day-plans/tasks").expect(401);

    const admin = await loginAdmin(app);
    const closedKey = await closedWorkStatusKey(admin);

    const taskA = await admin.post("/api/day-plans/2026-05-27/tasks").send({ title: "Aufgabe A", status: "active", priority: "medium" }).expect(201);
    const taskB = await admin.post("/api/day-plans/2026-05-28/tasks").send({ title: "Aufgabe B", status: closedKey, priority: "medium" }).expect(201);
    // taskA zusätzlich an einem zweiten Tag verknüpfen → muss dedupliziert genau einmal erscheinen.
    await admin.post(`/api/day-plans/2026-05-28/tasks/${taskA.body.id}`).expect(200);

    const other = await createUserAgent(app, "admin", "other-task-user@example.test");
    const foreignTask = await other.post("/api/day-plans/2026-05-27/tasks").send({ title: "Fremd", status: "active", priority: "medium" }).expect(201);

    const list = await admin.get("/api/day-plans/tasks").expect(200);
    const ids = (list.body as Array<{ id: number }>).map((task) => task.id).sort((left, right) => left - right);
    expect(ids).toEqual([taskA.body.id, taskB.body.id].sort((left, right) => left - right));
    expect(ids).not.toContain(foreignTask.body.id);
    // abgeschlossene Aufgabe ist enthalten (keine Statusfilterung)
    expect((list.body as Array<{ id: number; status: string }>).find((task) => task.id === taskB.body.id)?.status).toBe(closedKey);
  });

  it("liefert Tagesplan-Termine datumsübergreifend, dedupliziert und ohne fremde", async () => {
    await supertest(app.server).get("/api/day-plans/events").expect(401);

    const admin = await loginAdmin(app);
    const eventA = await admin
      .post("/api/day-plans/2026-05-27/events")
      .send({ title: "Termin A", startTime: "2026-05-27T08:00:00.000Z", endTime: "2026-05-27T09:00:00.000Z", isAllDay: false })
      .expect(201);
    const eventB = await admin
      .post("/api/day-plans/2026-05-28/events")
      .send({ title: "Termin B", startTime: "2026-05-28T08:00:00.000Z", endTime: "2026-05-28T09:00:00.000Z", isAllDay: false })
      .expect(201);
    await admin.post(`/api/day-plans/2026-05-28/events/${eventA.body.id}`).expect(200);

    const other = await createUserAgent(app, "admin", "other-event-user@example.test");
    const foreignEvent = await other
      .post("/api/day-plans/2026-05-27/events")
      .send({ title: "Fremd", startTime: "2026-05-27T10:00:00.000Z", endTime: "2026-05-27T11:00:00.000Z", isAllDay: false })
      .expect(201);

    const list = await admin.get("/api/day-plans/events").expect(200);
    const ids = (list.body as Array<{ id: number }>).map((event) => event.id).sort((left, right) => left - right);
    expect(ids).toEqual([eventA.body.id, eventB.body.id].sort((left, right) => left - right));
    expect(ids).not.toContain(foreignEvent.body.id);
  });

  it("löst eine Aufgabe datumsunabhängig aus allen Tagesplänen, ohne sie zu löschen", async () => {
    const admin = await loginAdmin(app);
    const task = await admin.post("/api/day-plans/2026-05-27/tasks").send({ title: "Aufgabe", status: "active", priority: "medium" }).expect(201);
    await admin.post(`/api/day-plans/2026-05-28/tasks/${task.body.id}`).expect(200);

    expect(await testDb.db.select().from(dayPlanTasks).where(eq(dayPlanTasks.taskId, task.body.id))).toHaveLength(2);

    await admin.delete(`/api/day-plans/tasks/${task.body.id}`).expect(204);

    expect(await testDb.db.select().from(dayPlanTasks).where(eq(dayPlanTasks.taskId, task.body.id))).toHaveLength(0);
    expect((await testDb.db.select().from(tasks).where(eq(tasks.id, task.body.id)))[0]).toBeTruthy();
    expect((await admin.get("/api/day-plans/tasks").expect(200)).body).toEqual([]);

    // Erneutes Lösen → nicht mehr verknüpft → 404
    await admin.delete(`/api/day-plans/tasks/${task.body.id}`).expect(404);
  });

  it("verhindert das Lösen fremder Verknüpfungen und Reader-Löschzugriff", async () => {
    const admin = await loginAdmin(app);
    const other = await createUserAgent(app, "admin", "other-delete-user@example.test");
    const reader = await createUserAgent(app, "reader", "reader-cross-date@example.test");
    const foreignTask = await other.post("/api/day-plans/2026-05-27/tasks").send({ title: "Fremd", status: "active", priority: "medium" }).expect(201);

    // Admin darf fremde Verknüpfung nicht lösen (nicht an seinen Plänen) → 404
    await admin.delete(`/api/day-plans/tasks/${foreignTask.body.id}`).expect(404);
    // Reader hat keine dayPlans:delete-Permission → 403
    await reader.delete(`/api/day-plans/tasks/${foreignTask.body.id}`).expect(403);
    // Verknüpfung des anderen Users besteht weiter
    expect(await testDb.db.select().from(dayPlanTasks).where(eq(dayPlanTasks.taskId, foreignTask.body.id))).toHaveLength(1);
  });
});
