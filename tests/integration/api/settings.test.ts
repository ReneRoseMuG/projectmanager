/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Settings werden aus Registry-Defaults und gespeicherten USER/GLOBAL-Werten aufgelöst.
 * - USER-Settings dürfen von jedem authentifizierten Nutzer für sich selbst geschrieben und zurückgesetzt werden.
 * - GLOBAL-Settings dürfen nur mit Settings-Adminrechten geschrieben werden.
 *
 * Fehlerfälle:
 * - Nicht authentifiziert, ungültiger Wert, fremder USER-Scope und Versionskonflikt.
 *
 * Ziel:
 * Das Settings-System gegen Lost Updates, fehlerhafte Scope-Auflösung und Berechtigungsumgehungen absichern.
 */

import type { ResolvedSetting, Role, WikiTreeState } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

function settingByKey(settings: ResolvedSetting[], key: ResolvedSetting["key"]): ResolvedSetting {
  const setting = settings.find((entry) => entry.key === key);
  if (!setting) {
    throw new Error(`Setting ${key} not found`);
  }
  return setting;
}

async function loginAdmin(app: FastifyInstance): Promise<supertest.SuperAgentTest> {
  const admin = supertest.agent(app.server);
  await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return admin;
}

async function createUser(app: FastifyInstance, roleKey: string, email: string): Promise<supertest.SuperAgentTest> {
  const admin = await loginAdmin(app);
  const roles = await admin.get("/api/admin/roles").expect(200);
  const role = (roles.body as Role[]).find((entry) => entry.key === roleKey);
  if (!role) {
    throw new Error(`Role ${roleKey} not found`);
  }
  await admin
    .post("/api/admin/users")
    .send({ firstName: "Settings", lastName: roleKey, email, roleId: role.id, password: "password123", isActive: true })
    .expect(201);

  const user = supertest.agent(app.server);
  await user.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
  return user;
}

describe("Settings API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAdminInitialPassword: string | null;

  beforeAll(async () => {
    originalAdminInitialPassword = config.adminInitialPassword;
    config.adminInitialPassword = "password123";
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    config.adminInitialPassword = originalAdminInitialPassword;
    await app?.close();
    await testDb?.close();
  });

  it("schützt Settings-Routen vor nicht authentifizierten Zugriffen", async () => {
    await supertest(app.server).get("/api/settings/resolved").expect(401);
    await supertest(app.server)
      .put("/api/settings/values")
      .send({ key: "taskBoard.viewMode", scopeType: "USER", value: "kanban", expectedVersion: 0 })
      .expect(401);
  });

  it("löst Defaults auf und speichert USER-Settings für Leser versioniert", async () => {
    const reader = await createUser(app, "reader", "settings-reader@example.test");

    const initialResponse = await reader.get("/api/settings/resolved").expect(200);
    const initialTaskSetting = settingByKey(initialResponse.body.settings as ResolvedSetting[], "taskBoard.viewMode");
    expect(initialTaskSetting).toMatchObject({ resolvedValue: "list", resolvedScope: "DEFAULT", resolvedVersion: null });

    const updatedResponse = await reader
      .put("/api/settings/values")
      .send({ key: "taskBoard.viewMode", scopeType: "USER", value: "kanban", expectedVersion: 0 })
      .expect(200);
    const updatedTaskSetting = settingByKey(updatedResponse.body.settings as ResolvedSetting[], "taskBoard.viewMode");
    expect(updatedTaskSetting.resolvedValue).toBe("kanban");
    expect(updatedTaskSetting.resolvedScope).toBe("USER");
    expect(updatedTaskSetting.values.USER?.version).toBe(1);

    const resetResponse = await reader
      .delete("/api/settings/values")
      .send({ key: "taskBoard.viewMode", scopeType: "USER", expectedVersion: 1 })
      .expect(200);
    const resetTaskSetting = settingByKey(resetResponse.body.settings as ResolvedSetting[], "taskBoard.viewMode");
    expect(resetTaskSetting).toMatchObject({ resolvedValue: "list", resolvedScope: "DEFAULT", resolvedVersion: null });
  });

  it("erkennt Versionskonflikte und ungültige Werte", async () => {
    const reader = await createUser(app, "reader", "settings-conflict@example.test");

    await reader
      .put("/api/settings/values")
      .send({ key: "ticketBoard.viewMode", scopeType: "USER", value: "list", expectedVersion: 0 })
      .expect(200);

    const conflict = await reader
      .put("/api/settings/values")
      .send({ key: "ticketBoard.viewMode", scopeType: "USER", value: "kanban", expectedVersion: 0 })
      .expect(409);
    expect(conflict.body).toMatchObject({ error: "CONFLICT", statusCode: 409 });

    const invalid = await reader
      .put("/api/settings/values")
      .send({ key: "ticketBoard.viewMode", scopeType: "USER", value: "table", expectedVersion: 1 })
      .expect(400);
    expect(invalid.body).toMatchObject({ error: "BAD_REQUEST", statusCode: 400 });
  });

  it("blockiert fremde USER-Scopes und normale Nutzer bei GLOBAL-Settings", async () => {
    const reader = await createUser(app, "reader", "settings-scope@example.test");

    await reader
      .put("/api/settings/values")
      .send({ key: "taskBoard.viewMode", scopeType: "USER", scopeId: "999", value: "kanban", expectedVersion: 0 })
      .expect(403);

    await reader
      .put("/api/settings/values")
      .send({ key: "taskBoard.viewMode", scopeType: "GLOBAL", value: "kanban", expectedVersion: 0 })
      .expect(403);

    await reader
      .put("/api/settings/values")
      .send({ key: "ui.toastPosition", scopeType: "GLOBAL", value: "bottom-left", expectedVersion: 0 })
      .expect(403);
  });

  it("erlaubt Admins GLOBAL-Defaults, die für andere Nutzer wirksam werden", async () => {
    const admin = await loginAdmin(app);
    await admin
      .put("/api/settings/values")
      .send({ key: "taskBoard.viewMode", scopeType: "GLOBAL", value: "kanban", expectedVersion: 0 })
      .expect(200);

    const reader = await createUser(app, "reader", "settings-global@example.test");
    const response = await reader.get("/api/settings/resolved").expect(200);
    const taskSetting = settingByKey(response.body.settings as ResolvedSetting[], "taskBoard.viewMode");

    expect(taskSetting).toMatchObject({ resolvedValue: "kanban", resolvedScope: "GLOBAL", resolvedVersion: 1 });
    expect(taskSetting.values.GLOBAL?.value).toBe("kanban");
  });
  it("persistiert Wiki-Tree-State als getrenntes USER-Setting", async () => {
    const reader = await createUser(app, "reader", "settings-wiki-tree@example.test");
    const otherReader = await createUser(app, "reader", "settings-wiki-tree-other@example.test");
    const treeState: WikiTreeState = { sidebarCollapsed: true, collapsedPageIds: [1, 3, 7] };

    const initialResponse = await reader.get("/api/settings/resolved").expect(200);
    const initialTreeSetting = settingByKey(initialResponse.body.settings as ResolvedSetting[], "wiki.treeState");
    expect(initialTreeSetting).toMatchObject({
      resolvedValue: { sidebarCollapsed: false, collapsedPageIds: [] },
      resolvedScope: "DEFAULT",
      resolvedVersion: null,
    });

    const savedResponse = await reader
      .put("/api/settings/values")
      .send({ key: "wiki.treeState", scopeType: "USER", value: treeState, expectedVersion: 0 })
      .expect(200);
    const savedTreeSetting = settingByKey(savedResponse.body.settings as ResolvedSetting[], "wiki.treeState");
    expect(savedTreeSetting.resolvedValue).toEqual(treeState);
    expect(savedTreeSetting.resolvedScope).toBe("USER");
    expect(savedTreeSetting.values.USER?.version).toBe(1);

    const reloadedResponse = await reader.get("/api/settings/resolved").expect(200);
    expect(settingByKey(reloadedResponse.body.settings as ResolvedSetting[], "wiki.treeState").resolvedValue).toEqual(treeState);

    const otherResponse = await otherReader.get("/api/settings/resolved").expect(200);
    expect(settingByKey(otherResponse.body.settings as ResolvedSetting[], "wiki.treeState")).toMatchObject({
      resolvedValue: { sidebarCollapsed: false, collapsedPageIds: [] },
      resolvedScope: "DEFAULT",
      resolvedVersion: null,
    });

    const invalid = await reader
      .put("/api/settings/values")
      .send({ key: "wiki.treeState", scopeType: "USER", value: { sidebarCollapsed: true, collapsedPageIds: [1, 1] }, expectedVersion: 1 })
      .expect(400);
    expect(invalid.body).toMatchObject({ error: "BAD_REQUEST", statusCode: 400 });
  });

  it("persistiert Toast-Position global und fällt bei ungültigem gespeicherten Wert zurück", async () => {
    const admin = await loginAdmin(app);

    const invalid = await admin
      .put("/api/settings/values")
      .send({ key: "ui.toastPosition", scopeType: "GLOBAL", value: "center", expectedVersion: 0 })
      .expect(400);
    expect(invalid.body).toMatchObject({ error: "BAD_REQUEST", statusCode: 400 });

    const savedResponse = await admin
      .put("/api/settings/values")
      .send({ key: "ui.toastPosition", scopeType: "GLOBAL", value: "bottom-left", expectedVersion: 0 })
      .expect(200);
    const savedToastSetting = settingByKey(savedResponse.body.settings as ResolvedSetting[], "ui.toastPosition");
    expect(savedToastSetting).toMatchObject({ resolvedValue: "bottom-left", resolvedScope: "GLOBAL", resolvedVersion: 1 });
    expect(savedToastSetting.values.GLOBAL?.value).toBe("bottom-left");

    const reader = await createUser(app, "reader", "settings-toast-global@example.test");
    const readerResponse = await reader.get("/api/settings/resolved").expect(200);
    const readerToastSetting = settingByKey(readerResponse.body.settings as ResolvedSetting[], "ui.toastPosition");
    expect(readerToastSetting).toMatchObject({ resolvedValue: "bottom-left", resolvedScope: "GLOBAL", resolvedVersion: 1 });

    await testDb.pool.execute(`UPDATE settings_values SET value_json = '"center"' WHERE setting_key = 'ui.toastPosition' AND scope_type = 'GLOBAL'`);

    const fallbackResponse = await reader.get("/api/settings/resolved").expect(200);
    const fallbackToastSetting = settingByKey(fallbackResponse.body.settings as ResolvedSetting[], "ui.toastPosition");
    expect(fallbackToastSetting).toMatchObject({ resolvedValue: "top-right", resolvedScope: "DEFAULT", resolvedVersion: null });
    expect(fallbackToastSetting.values.GLOBAL).toBeUndefined();
  });
});
