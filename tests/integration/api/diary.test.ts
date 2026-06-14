/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte temporäre MySQL-Test-DB, echte Auth-Hooks, echte Sessions/Rollen.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temp-DB pro Suite (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Pro Projekt genau ein lebender, versionierter Tagebuch-Eintrag.
 * - POST legt den Eintrag mit version 1 an; GET liefert ihn inkl. coveredUntil/sourceCount.
 * - GET ohne Eintrag liefert null (kein 500), wenn das Projekt existiert.
 * - PATCH erhöht die version und erzwingt expectedVersion.
 * - Tagebuch-Routen prüfen die diary-Permission (read/write), nicht projects.
 *
 * Fehlerfälle:
 * - PATCH mit veralteter version -> 409.
 * - Zweiter POST für dasselbe Projekt -> 409 (Unique pro Projekt).
 * - GET/POST für nicht existierendes Projekt -> 404.
 * - Projekt gelöscht -> Eintrag per Cascade entfernt.
 * - Ohne Session -> 401; Reader ohne diary:write auf POST/PATCH -> 403.
 *
 * Ziel:
 * Persistenz, Versionierung, Projektbindung und Berechtigungen des Tagebuchs (FT(16)/MS-70) absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createProject, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Diary API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  it("POST legt einen Eintrag mit version 1 an, GET liefert ihn inkl. Metadaten", async () => {
    const project = await createProject(app, { name: "Tagebuch-Projekt" });

    const created = await supertest(app.server)
      .post(`/api/projects/${project.id}/diary`)
      .send({ title: "Verlauf", content: "<p>Erster Eintrag</p>", coveredUntil: "2026-06-14T00:00:00.000Z", sourceCount: 3 })
      .expect(201);

    expect(created.body.projectId).toBe(project.id);
    expect(created.body.version).toBe(1);
    expect(created.body.title).toBe("Verlauf");
    expect(created.body.content).toBe("<p>Erster Eintrag</p>");
    expect(created.body.coveredUntil).toBe("2026-06-14T00:00:00.000Z");
    expect(created.body.sourceCount).toBe(3);

    const fetched = await supertest(app.server).get(`/api/projects/${project.id}/diary`).expect(200);
    expect(fetched.body.id).toBe(created.body.id);
    expect(fetched.body.content).toBe("<p>Erster Eintrag</p>");
    expect(fetched.body.version).toBe(1);

    const [rows] = await testDb.pool.execute("SELECT content, source_count FROM diary_entries WHERE project_id = ?", [project.id]);
    const row = (rows as Array<{ content: string; source_count: number }>)[0];
    expect(row.content).toBe("<p>Erster Eintrag</p>");
    expect(row.source_count).toBe(3);
  });

  it("GET ohne vorhandenen Eintrag liefert null", async () => {
    const project = await createProject(app, { name: "Leeres Tagebuch" });

    const res = await supertest(app.server).get(`/api/projects/${project.id}/diary`).expect(200);
    expect(res.body).toBeNull();
  });

  it("GET /diary/:id liefert den Eintrag direkt per id, unbekannte id liefert 404", async () => {
    const project = await createProject(app, { name: "Direkt-Projekt" });
    const created = await supertest(app.server).post(`/api/projects/${project.id}/diary`).send({ title: "Verlauf", content: "<p>X</p>" }).expect(201);

    const byId = await supertest(app.server).get(`/api/diary/${created.body.id}`).expect(200);
    expect(byId.body.id).toBe(created.body.id);
    expect(byId.body.content).toBe("<p>X</p>");

    await supertest(app.server).get("/api/diary/999999").expect(404);
  });

  it("GET /diary liefert alle Tagebücher projektübergreifend, ohne Projekte ohne Eintrag", async () => {
    const projectA = await createProject(app, { name: "Sammel-Projekt A" });
    const projectB = await createProject(app, { name: "Sammel-Projekt B" });
    const projectC = await createProject(app, { name: "Sammel-Projekt C ohne Tagebuch" });
    await supertest(app.server).post(`/api/projects/${projectA.id}/diary`).send({ title: "A", content: "<p>A</p>" }).expect(201);
    await supertest(app.server).post(`/api/projects/${projectB.id}/diary`).send({ title: "B", content: "<p>B</p>" }).expect(201);

    const res = await supertest(app.server).get("/api/diary").expect(200);
    const projectIds = (res.body as Array<{ projectId: number }>).map((entry) => entry.projectId).sort((left, right) => left - right);
    expect(projectIds).toEqual([projectA.id, projectB.id].sort((left, right) => left - right));
    expect(projectIds).not.toContain(projectC.id);
  });

  it("GET /diary liefert eine leere Liste, wenn keine Tagebücher existieren", async () => {
    const res = await supertest(app.server).get("/api/diary").expect(200);
    expect(res.body).toEqual([]);
  });

  it("PATCH aktualisiert den Inhalt und erhöht die version", async () => {
    const project = await createProject(app, { name: "Patch-Projekt" });
    const created = await supertest(app.server).post(`/api/projects/${project.id}/diary`).send({ title: "Verlauf", content: "<p>Alt</p>" }).expect(201);

    const updated = await supertest(app.server)
      .patch(`/api/diary/${created.body.id}`)
      .send({ content: "<p>Neu</p>", expectedVersion: created.body.version })
      .expect(200);

    expect(updated.body.version).toBe(2);
    expect(updated.body.content).toBe("<p>Neu</p>");

    const [rows] = await testDb.pool.execute("SELECT content, version FROM diary_entries WHERE id = ?", [created.body.id]);
    const row = (rows as Array<{ content: string; version: number }>)[0];
    expect(row.content).toBe("<p>Neu</p>");
    expect(row.version).toBe(2);
  });

  it("PATCH mit veralteter version wird mit 409 abgelehnt", async () => {
    const project = await createProject(app, { name: "Konflikt-Projekt" });
    const created = await supertest(app.server).post(`/api/projects/${project.id}/diary`).send({ title: "Verlauf" }).expect(201);

    await supertest(app.server).patch(`/api/diary/${created.body.id}`).send({ content: "<p>v2</p>", expectedVersion: created.body.version }).expect(200);

    const conflict = await supertest(app.server).patch(`/api/diary/${created.body.id}`).send({ content: "<p>stale</p>", expectedVersion: created.body.version }).expect(409);
    expect(conflict.body.error).toBe("CONFLICT");
  });

  it("Zweiter POST für dasselbe Projekt wird mit 409 abgelehnt", async () => {
    const project = await createProject(app, { name: "Unique-Projekt" });
    await supertest(app.server).post(`/api/projects/${project.id}/diary`).send({ title: "Erster" }).expect(201);

    const second = await supertest(app.server).post(`/api/projects/${project.id}/diary`).send({ title: "Zweiter" }).expect(409);
    expect(second.body.error).toBe("CONFLICT");
  });

  it("GET und POST für ein nicht existierendes Projekt liefern 404", async () => {
    await supertest(app.server).get("/api/projects/999999/diary").expect(404);
    await supertest(app.server).post("/api/projects/999999/diary").send({ title: "X" }).expect(404);
  });

  it("Projekt löschen entfernt das Tagebuch per Cascade", async () => {
    const project = await createProject(app, { name: "Cascade-Projekt" });
    await supertest(app.server).post(`/api/projects/${project.id}/diary`).send({ title: "Verlauf" }).expect(201);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

    const [rows] = await testDb.pool.execute("SELECT id FROM diary_entries WHERE project_id = ?", [project.id]);
    expect((rows as unknown[]).length).toBe(0);
  });
});

describe("Diary API Berechtigungen", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAuthBypassAdmin: boolean;
  let originalApiKey: string | null;

  async function loginAdmin() {
    const agent = supertest.agent(app.server);
    await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
    return agent;
  }

  async function createReaderAndLogin(admin: ReturnType<typeof supertest.agent>) {
    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = (roles.body as Array<{ key: string; id: number }>).find((role) => role.key === "reader");
    if (!readerRole) {
      throw new Error("Reader-Rolle nicht gefunden");
    }
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Rea", lastName: "Der", email: "reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);
    const agent = supertest.agent(app.server);
    await agent.post("/api/auth/login").send({ email: "reader@example.test", password: "password123" }).expect(200);
    return agent;
  }

  async function createProjectAs(admin: ReturnType<typeof supertest.agent>): Promise<number> {
    const res = await admin.post("/api/projects").send({ name: "Auth-Projekt", status: "active", color: "#6366f1" }).expect(201);
    return res.body.id as number;
  }

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

  it("ohne Session werden GET, POST und PATCH mit 401 abgelehnt", async () => {
    const admin = await loginAdmin();
    const projectId = await createProjectAs(admin);

    await supertest(app.server).get(`/api/projects/${projectId}/diary`).expect(401);
    await supertest(app.server).get("/api/diary").expect(401);
    await supertest(app.server).post(`/api/projects/${projectId}/diary`).send({ title: "X" }).expect(401);
    await supertest(app.server).patch("/api/diary/1").send({ title: "X", expectedVersion: 1 }).expect(401);
  });

  it("Reader darf das Tagebuch lesen, aber nicht schreiben", async () => {
    const admin = await loginAdmin();
    const projectId = await createProjectAs(admin);
    const entry = await admin.post(`/api/projects/${projectId}/diary`).send({ title: "Verlauf" }).expect(201);

    const reader = await createReaderAndLogin(admin);

    await reader.get(`/api/projects/${projectId}/diary`).expect(200);
    await reader.post(`/api/projects/${projectId}/diary`).send({ title: "X" }).expect(403);
    await reader.patch(`/api/diary/${entry.body.id}`).send({ title: "X", expectedVersion: entry.body.version }).expect(403);
  });

  it("Admin mit diary:write darf anlegen und aktualisieren", async () => {
    const admin = await loginAdmin();
    const projectId = await createProjectAs(admin);

    const created = await admin.post(`/api/projects/${projectId}/diary`).send({ title: "Verlauf", content: "<p>Start</p>" }).expect(201);
    expect(created.body.version).toBe(1);

    const updated = await admin.patch(`/api/diary/${created.body.id}`).send({ content: "<p>Fortgeschrieben</p>", expectedVersion: created.body.version }).expect(200);
    expect(updated.body.version).toBe(2);
  });
});
