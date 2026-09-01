/**
 * Test Scope: Projects API
 *
 * Covers project CRUD, defaults, card-footer counts, timestamps, and cascade behavior.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createMilestone, createNoteForProject, createProject, createTask, createTestDb, createTicket, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const uploadDir = path.join(os.tmpdir(), `taskmanager-api-project-counts-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-project-count-previews-${process.pid}`);

async function insertWikiPage(testDb: TestDb, title = "Projekt-Wiki"): Promise<number> {
  const [result] = await testDb.pool.execute("INSERT INTO wiki_pages (title, sort_order, version, created_at, updated_at) VALUES (?, 0, 1, NOW(), NOW())", [title]);
  return (result as { insertId: number }).insertId;
}

describe("Projects API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalUploadDir: string;
  let originalPreviewCacheDir: string;

  beforeAll(async () => {
    originalUploadDir = config.uploadDir;
    originalPreviewCacheDir = config.previewCacheDir;
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    config.uploadDir = uploadDir;
    config.previewCacheDir = previewCacheDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableMultipart: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    config.uploadDir = originalUploadDir;
    config.previewCacheDir = originalPreviewCacheDir;
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  it("GET /api/projects gibt leere Liste zurueck wenn keine Projekte existieren", async () => {
    const res = await supertest(app.server).get("/api/projects").expect(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/projects erstellt ein neues Projekt", async () => {
    const res = await supertest(app.server)
      .post("/api/projects")
      .send({ name: "Neues Projekt", description: "Beschreibung", status: "active", color: "#123456" })
      .expect(201);

    expect(res.body).toMatchObject({
      name: "Neues Projekt",
      description: "Beschreibung",
      status: "active",
      color: "#123456",
      milestoneCount: 0,
      openTaskCount: 0,
      ticketCount: 0,
      tags: []
    });
    expect(res.body.id).toEqual(expect.any(Number));
  });

  it("POST /api/projects ohne name gibt 400 zurueck", async () => {
    await supertest(app.server).post("/api/projects").send({ status: "active" }).expect(400);
  });

  it("POST /api/projects mit ungueltigem Status gibt 400 zurueck", async () => {
    await supertest(app.server).post("/api/projects").send({ name: "Projekt", status: "invalid" }).expect(400);
  });

  it("POST /api/projects setzt Default-Werte wenn optionale Felder fehlen", async () => {
    const res = await supertest(app.server).post("/api/projects").send({ name: "Defaults" }).expect(201);

    expect(res.body.status).toBe("active");
    expect(res.body.color).toBe("#6366f1");
    expect(res.body.description).toBeNull();
    expect(res.body.milestoneCount).toBe(0);
    expect(res.body.openTaskCount).toBe(0);
    expect(res.body.ticketCount).toBe(0);
    expect(res.body.tags).toEqual([]);
  });

  it("GET /api/projects gibt alle Projekte zurueck", async () => {
    const first = await createProject(app, { name: "Projekt A" });
    const second = await createProject(app, { name: "Projekt B" });

    const res = await supertest(app.server).get("/api/projects").expect(200);
    const ids = res.body.map((project: { id: number }) => project.id);

    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it("GET /api/projects/:id gibt das korrekte Projekt zurueck", async () => {
    const project = await createProject(app, { name: "Einzelprojekt" });

    const res = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    expect(res.body.id).toBe(project.id);
    expect(res.body.name).toBe("Einzelprojekt");
  });

  it("GET /api/projects/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).get("/api/projects/9999").expect(404);
  });

  it("GET /api/projects enthaelt offene Aufgabenanzahl", async () => {
    const project = await createProject(app);
    const closedStatus = await supertest(app.server)
      .post("/api/catalogs/workStatus")
      .send({ key: "accepted", label: "Akzeptiert", sortOrder: 1300, isClosed: true, color: "var(--color-steel-500)" })
      .expect(201);
    await createTask(app, project.id, { title: "Todo", status: "todo" });
    await createTask(app, project.id, { title: "In Arbeit", status: "in_progress" });
    await createTask(app, project.id, { title: "Fertig", status: "done" });
    await createTask(app, project.id, { title: "Akzeptiert", status: closedStatus.body.key });

    const res = await supertest(app.server).get("/api/projects").expect(200);
    const found = res.body.find((item: { id: number }) => item.id === project.id);

    expect(found.openTaskCount).toBe(2);
    expect(found.doneTaskCount).toBe(2);
    expect(found.totalTaskCount).toBe(4);
  });

  it("GET /api/projects zählt Meilensteine und Tickets für Karten-Footer", async () => {
    const project = await createProject(app);
    const otherProject = await createProject(app, { name: "Anderes Projekt" });

    await createMilestone(app, project.id, { name: "Meilenstein A" });
    await createMilestone(app, project.id, { name: "Meilenstein B" });
    await createMilestone(app, otherProject.id, { name: "Fremder Meilenstein" });
    await createTicket(app, { type: "project", id: project.id }, { title: "Ticket A" });
    await createTicket(app, { type: "project", id: project.id }, { title: "Ticket B" });
    await createTicket(app, { type: "project", id: otherProject.id }, { title: "Fremdes Ticket" });

    const res = await supertest(app.server).get("/api/projects").expect(200);
    const found = res.body.find((item: { id: number }) => item.id === project.id);

    expect(found).toMatchObject({
      milestoneCount: 2,
      ticketCount: 2
    });
  });

  it("GET /api/projects zählt Support-Objekte für Karten-Footer", async () => {
    const project = await createProject(app);

    await createNoteForProject(app, project.id, { title: "Projekt-Notiz" });
    await supertest(app.server).post(`/api/projects/${project.id}/comments`).send({ body: "Projekt-Kommentar" }).expect(201);
    await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("Projekt-Datei"), { filename: "project.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get("/api/projects").expect(200);
    const found = res.body.find((item: { id: number }) => item.id === project.id);

    expect(found).toMatchObject({
      attachmentCount: 1,
      noteCount: 1,
      commentCount: 1
    });
  });

  it("PATCH /api/projects/:id aktualisiert Name und Status", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .patch(`/api/projects/${project.id}`)
      .send({ name: "Aktualisiert", status: "on_hold", expectedVersion: project.version })
      .expect(200);

    expect(res.body.name).toBe("Aktualisiert");
    expect(res.body.status).toBe("on_hold");
  });

  it("PATCH /api/projects/:id setzt Wiki-Startseite", async () => {
    const project = await createProject(app);
    const wikiPageId = await insertWikiPage(testDb, "Projektstart");

    const res = await supertest(app.server).patch(`/api/projects/${project.id}`).send({ wikiPageId, expectedVersion: project.version }).expect(200);

    expect(res.body.wikiPageId).toBe(wikiPageId);
  });

  it("PATCH /api/projects/:id mit unbekannter Wiki-Startseite gibt 404 zurueck", async () => {
    const project = await createProject(app);

    await supertest(app.server).patch(`/api/projects/${project.id}`).send({ wikiPageId: 9999, expectedVersion: project.version }).expect(404);
  });

  it("PATCH /api/projects/:id loest Wiki-Startseite", async () => {
    const project = await createProject(app);
    const wikiPageId = await insertWikiPage(testDb, "Zu loesen");
    const linked = await supertest(app.server).patch(`/api/projects/${project.id}`).send({ wikiPageId, expectedVersion: project.version }).expect(200);

    const res = await supertest(app.server).patch(`/api/projects/${project.id}`).send({ wikiPageId: null, expectedVersion: linked.body.version }).expect(200);

    expect(res.body.wikiPageId).toBeNull();
  });

  it("DELETE /api/wiki/:id setzt Projekt-Wiki-Startseite auf null", async () => {
    const project = await createProject(app);
    const wikiPageId = await insertWikiPage(testDb, "Cascade Wiki");
    await supertest(app.server).patch(`/api/projects/${project.id}`).send({ wikiPageId, expectedVersion: project.version }).expect(200);

    await supertest(app.server).delete(`/api/wiki/${wikiPageId}`).expect(204);

    const res = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    expect(res.body.wikiPageId).toBeNull();
  });

  it("PATCH /api/projects/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).patch("/api/projects/9999").send({ name: "Fehlt", expectedVersion: 1 }).expect(404);
  });

  it("PATCH /api/projects/:id aktualisiert updatedAt", async () => {
    const project = await createProject(app);
    await delay(10);

    const res = await supertest(app.server)
      .patch(`/api/projects/${project.id}`)
      .send({ name: "Neuer Name", expectedVersion: project.version })
      .expect(200);

    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(project.updatedAt).getTime());
  });

  it("DELETE /api/projects/:id loescht das Projekt", async () => {
    const project = await createProject(app);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
    await supertest(app.server).get(`/api/projects/${project.id}`).expect(404);
  });

  it("DELETE /api/projects/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).delete("/api/projects/9999").expect(404);
  });

  it("DELETE /api/projects/:id entfernt nur die Task-Zuordnungen", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
    await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
  });
});
