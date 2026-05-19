/**
 * Test Scope: Attachments API
 *
 * Covers multipart uploads for projects/tasks, metadata listing, deletion, and missing resources.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createProject, createTask, createTestDb, truncateAll, type TestDb } from "../helpers/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-attachments-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-attachment-previews-${process.pid}`);

describe("Attachments API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableMultipart: true });
  });

  beforeEach(() => truncateAll(testDb.sqlite));

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  it("POST /api/projects/:id/attachments laedt Datei hoch und gibt Metadaten zurueck", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("Projekt-Datei"), { filename: "projekt.txt", contentType: "text/plain" })
      .expect(201);

    expect(res.body.owners).toEqual([{ type: "project", id: project.id }]);
    expect(res.body.originalName).toBe("projekt.txt");
    expect(res.body.mimetype).toBe("text/plain");
    expect(res.body.size).toBeGreaterThan(0);
    expect(res.body.url).toMatch(/^\/uploads\//);
  });

  it("GET /api/projects/:id/attachments gibt Attachment-Liste zurueck", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("Liste"), { filename: "liste.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(res.body.find((item: { id: number }) => item.id === upload.body.id)).toBeDefined();
  });

  it("POST /api/tasks/:id/attachments laedt Datei zum Task hoch", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", Buffer.from("Task-Datei"), { filename: "aufgabe.pdf", contentType: "application/pdf" })
      .expect(201);

    expect(res.body.owners).toEqual([{ type: "task", id: task.id }]);
    expect(res.body.mimetype).toBe("application/pdf");
  });

  it("POST zu nicht existierendem Projekt gibt 404 zurueck", async () => {
    await supertest(app.server)
      .post("/api/projects/9999/attachments")
      .attach("file", Buffer.from("X"), { filename: "x.txt", contentType: "text/plain" })
      .expect(404);
  });

  it("DELETE /api/attachments/:id entfernt den Eintrag aus der DB", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("Zu loeschen"), { filename: "delete-me.txt", contentType: "text/plain" })
      .expect(201);

    await supertest(app.server).delete(`/api/attachments/${upload.body.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(res.body.find((item: { id: number }) => item.id === upload.body.id)).toBeUndefined();
  });

  it("DELETE eines nicht vorhandenen Attachments gibt 404 zurueck", async () => {
    await supertest(app.server).delete("/api/attachments/9999").expect(404);
  });

  it("GET /api/attachments/:id/preview gibt Textvorschau begrenzt zurueck", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("Erste Zeile\nZweite Zeile"), { filename: "notiz.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/attachments/${upload.body.id}/preview`).expect(200);

    expect(res.body).toMatchObject({
      id: upload.body.id,
      kind: "text",
      status: "available",
      previewUrl: null
    });
    expect(res.body.text.content).toContain("Erste Zeile");
    expect(res.body.text.truncated).toBe(false);
  });

  it("GET /api/attachments/:id/preview erkennt PDF als native Vorschau", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "dokument.pdf", contentType: "application/pdf" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/attachments/${upload.body.id}/preview`).expect(200);

    expect(res.body).toMatchObject({
      id: upload.body.id,
      kind: "pdf",
      status: "available",
      previewUrl: upload.body.url,
      text: null
    });
  });
});
