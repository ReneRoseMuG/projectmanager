/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte Services und Repositories sowie eine isolierte MySQL-Testdatenbank.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Eigene Testdatenbank über createTestDb; vollständiges truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Globales Tag-CRUD, Zuweisungen, Ersetzungssemantik, Kaskaden und PM-/DMS-Domänen.
 * - usageCounts umfasst Projekte, Meilensteine, Aufgaben, Tickets und Dokumente.
 *
 * Fehlerfälle:
 * - Ungültige Domäne, unbekannte IDs, Duplikate und Versionskonflikte.
 *
 * Ziel:
 * Den vollständigen Tags-API-Vertrag einschließlich realer Nutzungszahlen absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { attachmentRepository } from "../../../apps/api/src/repositories/attachment.repository.js";
import { setDocumentTags } from "../../../apps/api/src/services/document.service.js";
import { buildTestApp, createMilestone, createProject, createTag, createTask, createTicket, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Tags API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(async () => { await truncateAll(testDb.pool); });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  it("POST /api/tags erstellt einen Tag", async () => {
    const res = await supertest(app.server).post("/api/tags").send({ name: "backend", color: "#3b82f6" }).expect(201);
    expect(res.body).toMatchObject({ name: "backend", color: "#3b82f6" });
  });

  it("POST /api/tags mit doppeltem Namen gibt 409 zurueck", async () => {
    await createTag(app, { name: "doppelt" });
    await supertest(app.server).post("/api/tags").send({ name: "doppelt", color: "#ff0000" }).expect(409);
  });

  it("GET /api/tags gibt alle Tags zurueck", async () => {
    await createTag(app, { name: "tag-a" });
    await createTag(app, { name: "tag-b" });

    const res = await supertest(app.server).get("/api/tags").expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("PATCH /api/tags/:id aendert Name und Farbe", async () => {
    const tag = await createTag(app, { name: "alt", color: "#000000" });

    const res = await supertest(app.server)
      .patch(`/api/tags/${tag.id}`)
      .send({ name: "neu", color: "#ffffff", expectedVersion: tag.version })
      .expect(200);

    expect(res.body.name).toBe("neu");
    expect(res.body.color).toBe("#ffffff");
  });

  it("DELETE /api/tags/:id loescht den Tag", async () => {
    const tag = await createTag(app);

    await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

    const res = await supertest(app.server).get("/api/tags").expect(200);
    expect(res.body.find((item: { id: number }) => item.id === tag.id)).toBeUndefined();
  });

  it("PUT /api/projects/:id/tags weist Tags zu", async () => {
    const project = await createProject(app);
    const tag1 = await createTag(app, { name: "a" });
    const tag2 = await createTag(app, { name: "b" });

    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag1.id, tag2.id] }).expect(200);

    const res = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    const tagIds = res.body.tags.map((tag: { id: number }) => tag.id);

    expect(tagIds).toContain(tag1.id);
    expect(tagIds).toContain(tag2.id);
  });

  it("PUT /api/projects/:id/tags ersetzt vorhandene Zuweisung vollstaendig", async () => {
    const project = await createProject(app);
    const tag1 = await createTag(app, { name: "x" });
    const tag2 = await createTag(app, { name: "y" });

    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag1.id] }).expect(200);
    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag2.id] }).expect(200);

    const res = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    const tagIds = res.body.tags.map((tag: { id: number }) => tag.id);

    expect(tagIds).not.toContain(tag1.id);
    expect(tagIds).toContain(tag2.id);
  });

  it("PUT /api/projects/:id/tags mit leerem Array entfernt alle Tags", async () => {
    const project = await createProject(app);
    const tag = await createTag(app);

    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [] }).expect(200);

    const res = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    expect(res.body.tags).toHaveLength(0);
  });

  it("DELETE eines Tags entfernt auch seine Projektzuweisungen", async () => {
    const project = await createProject(app);
    const tag = await createTag(app);

    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    expect(res.body.tags).toHaveLength(0);
  });

  it("GET /api/tags liefert korrekte usageCounts", async () => {
    const project = await createProject(app);
    const tag = await createTag(app, { name: "gezählt" });

    const before = await supertest(app.server).get("/api/tags").expect(200);
    const tagBefore = before.body.find((t: { id: number }) => t.id === tag.id);
    expect(tagBefore.usageCounts).toEqual({ projects: 0, milestones: 0, tasks: 0, tickets: 0, documents: 0 });

    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag.id] }).expect(200);

    const after = await supertest(app.server).get("/api/tags").expect(200);
    const tagAfter = after.body.find((t: { id: number }) => t.id === tag.id);
    expect(tagAfter.usageCounts).toMatchObject({ projects: 1, tasks: 0, milestones: 0, tickets: 0, documents: 0 });
  });

  it("PUT /api/tasks/:id/tags weist Tags zu und ersetzt vollstaendig", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const tag1 = await createTag(app, { name: "task-tag-1" });
    const tag2 = await createTag(app, { name: "task-tag-2" });

    await supertest(app.server).put(`/api/tasks/${task.id}/tags`).send({ tagIds: [tag1.id, tag2.id] }).expect(200);

    const res1 = await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    expect(res1.body.tags).toHaveLength(2);

    await supertest(app.server).put(`/api/tasks/${task.id}/tags`).send({ tagIds: [tag1.id] }).expect(200);

    const res2 = await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    expect(res2.body.tags).toHaveLength(1);
    expect(res2.body.tags[0].id).toBe(tag1.id);
  });

  it("PUT /api/tasks/:id/tags mit leerem Array entfernt alle Tags", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const tag = await createTag(app);

    await supertest(app.server).put(`/api/tasks/${task.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    await supertest(app.server).put(`/api/tasks/${task.id}/tags`).send({ tagIds: [] }).expect(200);

    const res = await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    expect(res.body.tags).toHaveLength(0);
  });

  it("PUT /api/milestones/:id/tags weist Tags zu", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const tag1 = await createTag(app, { name: "mile-tag-a" });
    const tag2 = await createTag(app, { name: "mile-tag-b" });

    const res = await supertest(app.server)
      .put(`/api/milestones/${milestone.id}/tags`)
      .send({ tagIds: [tag1.id, tag2.id] })
      .expect(200);

    const tagIds = res.body.map((t: { id: number }) => t.id);
    expect(tagIds).toContain(tag1.id);
    expect(tagIds).toContain(tag2.id);
  });

  it("PUT /api/milestones/:id/tags ersetzt vorhandene Zuweisung vollstaendig", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const tag1 = await createTag(app, { name: "mile-x" });
    const tag2 = await createTag(app, { name: "mile-y" });

    await supertest(app.server).put(`/api/milestones/${milestone.id}/tags`).send({ tagIds: [tag1.id] }).expect(200);
    const res = await supertest(app.server)
      .put(`/api/milestones/${milestone.id}/tags`)
      .send({ tagIds: [tag2.id] })
      .expect(200);

    const tagIds = res.body.map((t: { id: number }) => t.id);
    expect(tagIds).not.toContain(tag1.id);
    expect(tagIds).toContain(tag2.id);
  });

  it("PUT /api/milestones/:id/tags mit leerem Array entfernt alle Tags", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const tag = await createTag(app);

    await supertest(app.server).put(`/api/milestones/${milestone.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    const res = await supertest(app.server)
      .put(`/api/milestones/${milestone.id}/tags`)
      .send({ tagIds: [] })
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it("PUT /api/tickets/:id/tags weist Tags zu und ersetzt vollstaendig", async () => {
    const ticket = await createTicket(app, null);
    const tag1 = await createTag(app, { name: "tick-a" });
    const tag2 = await createTag(app, { name: "tick-b" });

    await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [tag1.id, tag2.id] }).expect(200);

    const res1 = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(res1.body.tags).toHaveLength(2);

    const res2 = await supertest(app.server)
      .put(`/api/tickets/${ticket.id}/tags`)
      .send({ tagIds: [tag2.id] })
      .expect(200);

    expect(res2.body).toHaveLength(1);
    expect(res2.body[0].id).toBe(tag2.id);
  });

  it("PUT /api/tickets/:id/tags mit leerem Array entfernt alle Tags", async () => {
    const ticket = await createTicket(app, null);
    const tag = await createTag(app);

    await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    const res = await supertest(app.server)
      .put(`/api/tickets/${ticket.id}/tags`)
      .send({ tagIds: [] })
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it("GET /api/tags usageCounts zaehlt ueber alle Entity-Typen", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const task = await createTask(app, project.id);
    const ticket = await createTicket(app, null);
    const tag = await createTag(app, { name: "all-entities" });

    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    await supertest(app.server).put(`/api/milestones/${milestone.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    await supertest(app.server).put(`/api/tasks/${task.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [tag.id] }).expect(200);

    const res = await supertest(app.server).get("/api/tags").expect(200);
    const found = res.body.find((t: { id: number }) => t.id === tag.id);

    expect(found.usageCounts).toEqual({ projects: 1, milestones: 1, tasks: 1, tickets: 1, documents: 0 });
  });

  it("PATCH /api/tags/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server)
      .patch("/api/tags/99999")
      .send({ name: "ghost", expectedVersion: 1 })
      .expect(404);
  });

  it("DELETE /api/tags/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).delete("/api/tags/99999").expect(404);
  });

  it("PATCH /api/tags/:id mit veralteter Version gibt 409 zurueck", async () => {
    const tag = await createTag(app, { name: "version-test" });

    await supertest(app.server)
      .patch(`/api/tags/${tag.id}`)
      .send({ name: "aktuell", expectedVersion: tag.version })
      .expect(200);

    await supertest(app.server)
      .patch(`/api/tags/${tag.id}`)
      .send({ name: "veraltet", expectedVersion: tag.version })
      .expect(409);
  });

  describe("Tag-Domänen (PM/DMS)", () => {
    it("POST /api/tags ordnet ohne domain der PM-Domäne zu (Default-Backfill)", async () => {
      const res = await supertest(app.server).post("/api/tags").send({ name: "pm-default", color: "#3b82f6" }).expect(201);
      expect(res.body.domain).toBe("pm");
    });

    it("POST /api/tags legt ein DMS-Tag mit domain='dms' an und persistiert es", async () => {
      const res = await supertest(app.server).post("/api/tags").send({ name: "dms-tag", color: "#7c3aed", domain: "dms" }).expect(201);
      expect(res.body.domain).toBe("dms");

      const all = await supertest(app.server).get("/api/tags").expect(200);
      const persisted = (all.body as Array<{ id: number; domain: string }>).find((tag) => tag.id === res.body.id);
      expect(persisted?.domain).toBe("dms");
    });

    it("GET /api/tags zählt reale DMS-Dokumentzuordnungen in usageCounts", async () => {
      const activeTag = (await supertest(app.server).post("/api/tags").send({ name: "dms-aktiv", domain: "dms" }).expect(201)).body as { id: number };
      const orphanTag = (await supertest(app.server).post("/api/tags").send({ name: "dms-verwaist", domain: "dms" }).expect(201)).body as { id: number };
      const document = await attachmentRepository.create(testDb.db, {
        originalName: "tag-nutzung.txt",
        filename: "tag-nutzung.txt",
        mimetype: "text/plain",
        size: 1,
        isInDocumentLibrary: true
      });

      await setDocumentTags(testDb.db, document.id, [activeTag.id], document.version);

      const response = await supertest(app.server).get("/api/tags?domain=dms").expect(200);
      const rows = response.body as Array<{ id: number; usageCounts: { projects: number; milestones: number; tasks: number; tickets: number; documents: number } }>;

      expect(rows.find((tag) => tag.id === activeTag.id)?.usageCounts).toEqual({ projects: 0, milestones: 0, tasks: 0, tickets: 0, documents: 1 });
      expect(rows.find((tag) => tag.id === orphanTag.id)?.usageCounts).toEqual({ projects: 0, milestones: 0, tasks: 0, tickets: 0, documents: 0 });
    });

    it("POST /api/tags mit ungültiger domain gibt 400 zurueck", async () => {
      await supertest(app.server).post("/api/tags").send({ name: "bad-domain", color: "#000000", domain: "xyz" }).expect(400);
    });

    it("GET /api/tags?domain=pm liefert ausschliesslich PM-Tags (DMS ausgeschlossen)", async () => {
      const pmTag = (await supertest(app.server).post("/api/tags").send({ name: "pm-only", domain: "pm" }).expect(201)).body as { id: number };
      const dmsTag = (await supertest(app.server).post("/api/tags").send({ name: "dms-only", domain: "dms" }).expect(201)).body as { id: number };

      const res = await supertest(app.server).get("/api/tags?domain=pm").expect(200);
      const rows = res.body as Array<{ id: number; domain: string }>;
      const ids = rows.map((tag) => tag.id);

      expect(ids).toContain(pmTag.id);
      expect(ids).not.toContain(dmsTag.id);
      expect(rows.every((tag) => tag.domain === "pm")).toBe(true);
    });

    it("GET /api/tags?domain=dms liefert ausschliesslich DMS-Tags (PM ausgeschlossen)", async () => {
      const pmTag = (await supertest(app.server).post("/api/tags").send({ name: "pm-x", domain: "pm" }).expect(201)).body as { id: number };
      const dmsTag = (await supertest(app.server).post("/api/tags").send({ name: "dms-x", domain: "dms" }).expect(201)).body as { id: number };

      const res = await supertest(app.server).get("/api/tags?domain=dms").expect(200);
      const rows = res.body as Array<{ id: number; domain: string }>;
      const ids = rows.map((tag) => tag.id);

      expect(ids).toContain(dmsTag.id);
      expect(ids).not.toContain(pmTag.id);
      expect(rows.every((tag) => tag.domain === "dms")).toBe(true);
    });

    it("GET /api/tags ohne Filter liefert beide Domänen", async () => {
      const pmTag = (await supertest(app.server).post("/api/tags").send({ name: "pm-both", domain: "pm" }).expect(201)).body as { id: number };
      const dmsTag = (await supertest(app.server).post("/api/tags").send({ name: "dms-both", domain: "dms" }).expect(201)).body as { id: number };

      const res = await supertest(app.server).get("/api/tags").expect(200);
      const ids = (res.body as Array<{ id: number }>).map((tag) => tag.id);

      expect(ids).toContain(pmTag.id);
      expect(ids).toContain(dmsTag.id);
    });
  });

  describe("Auth-Schutz: Reader-Negativfall", () => {
    let authApp: FastifyInstance;
    let originalAuthBypassAdmin: boolean;
    let originalApiKey: string | null;

    beforeAll(async () => {
      originalAuthBypassAdmin = config.authBypassAdmin;
      originalApiKey = config.apiKey;
      authApp = await buildTestApp(testDb, { enableAuth: true });
    });

    beforeEach(async () => {
      config.authBypassAdmin = false;
      config.apiKey = null;
      await truncateAll(testDb.pool);
    });

    afterAll(async () => {
      config.authBypassAdmin = originalAuthBypassAdmin;
      config.apiKey = originalApiKey;
      await authApp?.close();
    });

    it("Reader darf Tags nicht anlegen und nicht setzen (403)", async () => {
      const admin = supertest.agent(authApp.server);
      await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
      const project = (await admin.post("/api/projects").send({ name: "Reader Tag Test", status: "active" }).expect(201)).body as { id: number };
      const tag = (await admin.post("/api/tags").send({ name: "admin-tag", color: "#6366f1" }).expect(201)).body as { id: number };
      const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
      const readerRole = roles.find((r) => r.key === "reader")!;
      await admin.post("/api/admin/users").send({
        firstName: "Reader", lastName: "Tags",
        email: "reader-tags-auth@example.test",
        roleId: readerRole.id, password: "password123", isActive: true
      }).expect(201);

      const reader = supertest.agent(authApp.server);
      await reader.post("/api/auth/login").send({ email: "reader-tags-auth@example.test", password: "password123" }).expect(200);

      await reader.post("/api/tags").send({ name: "reader-tag", color: "#ef4444" }).expect(403);
      await reader.put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag.id] }).expect(403);
      await reader.get("/api/tags").expect(200);
    });
  });
});
