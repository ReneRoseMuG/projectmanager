/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App + MySQL Temp-DB, echte Rollen, Sessions und HTTP-Requests.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Auth, DayPlan-Service, Task-Repository und alle Joins laufen real.
 *
 * Isolation:
 * - Temporäre MySQL-Datenbank, Truncate vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Eine neue Task kann über POST /day-plans/:date/tasks erstellt und automatisch verknüpft werden.
 * - Eine bestehende Task kann über POST /day-plans/:date/tasks/:taskId verknüpft werden.
 * - Nach dem Verknüpfen erscheint die Task in GET /day-plans/:date → body.tasks.
 * - DELETE /day-plans/:date/tasks/:taskId löst nur die Zuordnung; die Task selbst bleibt erhalten.
 * - Tasks eines anderen Users sind im eigenen DayPlan nicht sichtbar.
 *
 * Fehlerfälle:
 * - Ohne Session: 401
 * - Reader kann keine Task am DayPlan anlegen: 403
 * - Unlink einer nicht-verknüpften Task: 404
 *
 * Ziel:
 * Die Link/Unlink-Sequenz von DayPlan und Task als isolierten API-Flow absichern.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { dayPlanTasks, tasks } from "../../../apps/api/src/db/schema.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb, type TestTask } from "../../fixtures/api/index.js";

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
    .send({ firstName: "Reader", lastName: "Only", email: "reader-dayplan-flow@example.test", roleId: readerRole.id, password: "password123", isActive: true })
    .expect(201);
  const reader = supertest.agent(app.server);
  await reader.post("/api/auth/login").send({ email: "reader-dayplan-flow@example.test", password: "password123" }).expect(200);
  return reader;
}

async function createSecondUserAgent(app: FastifyInstance) {
  const admin = await loginAdmin(app);
  const roles = await admin.get("/api/admin/roles").expect(200);
  const editorRole = roles.body.find((role: { key: string }) => role.key === "editor") as { id: number };
  await admin
    .post("/api/admin/users")
    .send({ firstName: "Second", lastName: "User", email: "second-user-dayplan@example.test", roleId: editorRole.id, password: "password123", isActive: true })
    .expect(201);
  const second = supertest.agent(app.server);
  await second.post("/api/auth/login").send({ email: "second-user-dayplan@example.test", password: "password123" }).expect(200);
  return second;
}

const TEST_DATE = "2026-06-10";

describe("DayPlan-Task-Flow API", () => {
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

  it("schützt DayPlan-Routen vor anonymem Zugriff (401)", async () => {
    await supertest(app.server).get(`/api/day-plans/${TEST_DATE}`).expect(401);
    await supertest(app.server).post(`/api/day-plans/${TEST_DATE}/tasks`).send({ title: "X" }).expect(401);
  });

  it("neue Task via POST /day-plans/:date/tasks wird erstellt und im DayPlan sichtbar", async () => {
    const admin = await loginAdmin(app);

    const created = (
      await admin
        .post(`/api/day-plans/${TEST_DATE}/tasks`)
        .send({ title: "Tagesaufgabe A", status: "todo", priority: "medium" })
        .expect(201)
    ).body as TestTask;

    expect(created.id).toBeTypeOf("number");
    expect(created.title).toBe("Tagesaufgabe A");

    const dayPlan = (await admin.get(`/api/day-plans/${TEST_DATE}`).expect(200)).body as { tasks: TestTask[] };
    expect(dayPlan.tasks.map((t) => t.id)).toContain(created.id);

    const joins = await testDb.db.select().from(dayPlanTasks).where(eq(dayPlanTasks.taskId, created.id));
    expect(joins).toHaveLength(1);
  });

  it("bestehende Task kann via POST /day-plans/:date/tasks/:taskId verknüpft werden", async () => {
    const admin = await loginAdmin(app);

    const project = (await admin.post("/api/projects").send({ name: "Testprojekt", status: "active" }).expect(201)).body as { id: number };
    const task = (
      await admin.post(`/api/projects/${project.id}/tasks`).send({ title: "Bestehende Aufgabe", status: "todo", priority: "medium" }).expect(201)
    ).body as TestTask;

    await admin.post(`/api/day-plans/${TEST_DATE}/tasks/${task.id}`).expect(200);

    const dayPlan = (await admin.get(`/api/day-plans/${TEST_DATE}`).expect(200)).body as { tasks: TestTask[] };
    expect(dayPlan.tasks.map((t) => t.id)).toContain(task.id);
  });

  it("DELETE /day-plans/:date/tasks/:taskId löst nur die Zuordnung — Task bleibt erhalten", async () => {
    const admin = await loginAdmin(app);

    const created = (
      await admin.post(`/api/day-plans/${TEST_DATE}/tasks`).send({ title: "Zu lösende Aufgabe", status: "todo", priority: "medium" }).expect(201)
    ).body as TestTask;

    await admin.delete(`/api/day-plans/${TEST_DATE}/tasks/${created.id}`).expect(204);

    const dayPlan = (await admin.get(`/api/day-plans/${TEST_DATE}`).expect(200)).body as { tasks: TestTask[] };
    expect(dayPlan.tasks.map((t) => t.id)).not.toContain(created.id);

    const taskRows = await testDb.db.select().from(tasks).where(eq(tasks.id, created.id));
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0]?.title).toBe("Zu lösende Aufgabe");

    const joinRows = await testDb.db.select().from(dayPlanTasks).where(eq(dayPlanTasks.taskId, created.id));
    expect(joinRows).toHaveLength(0);
  });

  it("vollständige Link/Unlink-Sequenz: create → verify → unlink → verify", async () => {
    const admin = await loginAdmin(app);

    const task1 = (
      await admin.post(`/api/day-plans/${TEST_DATE}/tasks`).send({ title: "Sequenz Task 1", status: "todo", priority: "medium" }).expect(201)
    ).body as TestTask;
    const task2 = (
      await admin.post(`/api/day-plans/${TEST_DATE}/tasks`).send({ title: "Sequenz Task 2", status: "todo", priority: "medium" }).expect(201)
    ).body as TestTask;

    const afterLink = (await admin.get(`/api/day-plans/${TEST_DATE}`).expect(200)).body as { tasks: TestTask[] };
    const ids = afterLink.tasks.map((t) => t.id);
    expect(ids).toContain(task1.id);
    expect(ids).toContain(task2.id);

    await admin.delete(`/api/day-plans/${TEST_DATE}/tasks/${task1.id}`).expect(204);

    const afterUnlink = (await admin.get(`/api/day-plans/${TEST_DATE}`).expect(200)).body as { tasks: TestTask[] };
    const idsAfter = afterUnlink.tasks.map((t) => t.id);
    expect(idsAfter).not.toContain(task1.id);
    expect(idsAfter).toContain(task2.id);
  });

  it("Tasks eines anderen Users erscheinen nicht im eigenen DayPlan", async () => {
    const admin = await loginAdmin(app);
    const second = await createSecondUserAgent(app);

    await second.post(`/api/day-plans/${TEST_DATE}/tasks`).send({ title: "Aufgabe von User 2", status: "todo", priority: "medium" }).expect(201);

    const adminPlan = (await admin.get(`/api/day-plans/${TEST_DATE}`).expect(200)).body as { tasks: TestTask[] };
    expect(adminPlan.tasks).toHaveLength(0);
  });

  it("Reader darf keine Task am DayPlan anlegen (403)", async () => {
    const reader = await createReaderAgent(app);
    await reader.post(`/api/day-plans/${TEST_DATE}/tasks`).send({ title: "Nicht erlaubt", status: "todo", priority: "medium" }).expect(403);
  });

  it("Unlink einer nicht-verknüpften Task liefert 404", async () => {
    const admin = await loginAdmin(app);
    const project = (await admin.post("/api/projects").send({ name: "Projekt X", status: "active" }).expect(201)).body as { id: number };
    const task = (
      await admin.post(`/api/projects/${project.id}/tasks`).send({ title: "Nicht verknüpft", status: "todo", priority: "medium" }).expect(201)
    ).body as TestTask;

    await admin.get(`/api/day-plans/${TEST_DATE}`).expect(200);

    await admin.delete(`/api/day-plans/${TEST_DATE}/tasks/${task.id}`).expect(404);
  });
});
