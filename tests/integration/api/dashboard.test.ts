/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Dashboard-Listen erzeugen System-Standarddashboards je Kontext.
 * - Leser dürfen Dashboards lesen, aber nicht erstellen.
 * - Editoren dürfen eigene Dashboards speichern und persönliche Standards setzen.
 * - Nur Admins dürfen System-Dashboards und globale Standards verwalten.
 *
 * Fehlerfälle:
 * - Anonyme Zugriffe, fehlende Schreibrechte, System-Schreibzugriff ohne Adminrecht und globale Defaults ohne Adminrecht.
 *
 * Ziel:
 * Rollen, Defaults, Versionierung und Eigentümergrenzen der Dashboard-Domäne absichern.
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

async function createUser(app: FastifyInstance, roleKey: "reader" | "editor", email: string) {
  const admin = await loginAdmin(app);
  const roles = await admin.get("/api/admin/roles").expect(200);
  const role = roles.body.find((item: { key: string }) => item.key === roleKey) as { id: number };
  await admin
    .post("/api/admin/users")
    .send({ firstName: roleKey, lastName: "Dashboard", email, roleId: role.id, password: "password123", isActive: true })
    .expect(201);
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
  return agent;
}

describe("Dashboard API", () => {
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

  it("liefert System-Standarddashboards für Leser und blockiert anonyme oder schreibende Leser-Zugriffe", async () => {
    await supertest(app.server).get("/api/dashboards?context=project").expect(401);
    const reader = await createUser(app, "reader", "dashboard.reader@example.test");

    const list = await reader.get("/api/dashboards?context=project").expect(200);

    expect(list.body.globalDefaultDashboardId).toEqual(expect.any(Number));
    expect(list.body.dashboards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Standard: Projektübersicht",
          context: "project",
          isSystem: true,
          widgets: expect.arrayContaining([expect.objectContaining({ widgetId: "milestoneProgress" })])
        })
      ])
    );

    await reader
      .post("/api/dashboards")
      .send({ name: "Nicht erlaubt", context: "project", widgets: [{ widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 }] })
      .expect(403);
  });

  it("erzeugt das Startseiten-Dashboard für den home-Kontext und validiert erlaubte Widgets", async () => {
    await supertest(app.server).get("/api/dashboards?context=home").expect(401);
    const reader = await createUser(app, "reader", "dashboard.home.reader@example.test");

    const list = await reader.get("/api/dashboards?context=home").expect(200);

    expect(list.body.globalDefaultDashboardId).toEqual(expect.any(Number));
    expect(list.body.dashboards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Standard: Startseite",
          context: "home",
          isSystem: true,
          widgets: expect.arrayContaining([
            expect.objectContaining({ widgetId: "taskStatusReport" }),
            expect.objectContaining({ widgetId: "ticketStatusReport" })
          ])
        })
      ])
    );

    const editor = await createUser(app, "editor", "dashboard.home.editor@example.test");
    await editor
      .post("/api/dashboards")
      .send({ name: "Falsche Startseite", context: "home", widgets: [{ widgetId: "milestoneProgress", col: 0, row: 0, colSpan: 2 }] })
      .expect(400);

    const created = await editor
      .post("/api/dashboards")
      .send({
        name: "Meine Startseite",
        context: "home",
        widgets: [
          { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 },
          { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 }
        ]
      })
      .expect(201);

    expect(created.body).toMatchObject({ name: "Meine Startseite", context: "home", isSystem: false, version: 1 });
  });

  it("verwaltet persönliche Editor-Dashboards versioniert und setzt USER-Defaults", async () => {
    const editor = await createUser(app, "editor", "dashboard.editor@example.test");

    const created = await editor
      .post("/api/dashboards")
      .send({
        name: "Meine Projektlage",
        context: "project",
        widgets: [
          { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 },
          { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 }
        ]
      })
      .expect(201);

    expect(created.body).toMatchObject({ name: "Meine Projektlage", context: "project", isSystem: false, version: 1 });
    expect(created.body.ownerId).toEqual(expect.any(Number));

    const updated = await editor
      .put(`/api/dashboards/${created.body.id}`)
      .send({
        name: "Meine Projektlage kompakt",
        context: "project",
        widgets: [{ widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 2 }],
        expectedVersion: created.body.version
      })
      .expect(200);
    expect(updated.body.version).toBe(2);

    const defaults = await editor.post(`/api/dashboards/${created.body.id}/default`).send({ scopeType: "USER", expectedVersion: 0 }).expect(200);
    expect(defaults.body.userDefaultDashboardId).toBe(created.body.id);
    expect(defaults.body.userDefaultVersion).toBe(1);

    await editor.post(`/api/dashboards/${created.body.id}/default`).send({ scopeType: "GLOBAL", expectedVersion: 1 }).expect(403);
    await editor
      .post("/api/dashboards")
      .send({ name: "Systemversuch", context: "project", isSystem: true, widgets: [{ widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 }] })
      .expect(403);
  });

  it("erlaubt Admins System-Dashboards und globale Standards", async () => {
    const admin = await loginAdmin(app);
    const initial = await admin.get("/api/dashboards?context=project").expect(200);

    const systemDashboard = await admin
      .post("/api/dashboards")
      .send({
        name: "Admin Projektstandard",
        context: "project",
        isSystem: true,
        widgets: [{ widgetId: "milestoneProgress", col: 0, row: 0, colSpan: 2 }]
      })
      .expect(201);

    const defaults = await admin
      .post(`/api/dashboards/${systemDashboard.body.id}/default`)
      .send({ scopeType: "GLOBAL", expectedVersion: initial.body.globalDefaultVersion })
      .expect(200);

    expect(defaults.body.globalDefaultDashboardId).toBe(systemDashboard.body.id);
    expect(defaults.body.globalDefaultVersion).toBe(initial.body.globalDefaultVersion + 1);
  });
});
