/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Features werden mit Markdown-Datei angelegt, gelesen, aktualisiert und gelöscht.
 * - Listenendpunkte liefern keinen großen Content.
 * - Content-Pfade sind ID-basiert und Use Cases eines Features sind abrufbar.
 *
 * Fehlerfälle:
 * - Fehlender Titel liefert 400.
 * - Unbekanntes Feature liefert 404.
 *
 * Ziel:
 * Die neue Features-API inklusive Dateisystem-Anbindung gegen eine isolierte Test-DB absichern.
 */

import type { FastifyInstance } from "fastify";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { resolveStoredContentPath, setContentBaseDir } from "../../../apps/api/src/services/content.service.js";
import { buildTestApp, createFeature, createTestDb, createUseCase, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Features API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let tmpContentDir: string;
  let originalUploadDir: string;
  let originalPreviewCacheDir: string;
  const uploadDir = path.join(os.tmpdir(), `taskmanager-api-feature-counts-${process.pid}`);
  const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-feature-count-previews-${process.pid}`);

  beforeAll(async () => {
    originalUploadDir = config.uploadDir;
    originalPreviewCacheDir = config.previewCacheDir;
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    config.uploadDir = uploadDir;
    config.previewCacheDir = previewCacheDir;
    tmpContentDir = fs.mkdtempSync(path.join(os.tmpdir(), "taskmanager-content-"));
    setContentBaseDir(tmpContentDir);
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableMultipart: true });
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
    fs.rmSync(tmpContentDir, { recursive: true, force: true });
    fs.mkdirSync(tmpContentDir, { recursive: true });
    fs.rmSync(uploadDir, { recursive: true, force: true });
    fs.rmSync(previewCacheDir, { recursive: true, force: true });
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.mkdirSync(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (testDb) {
      testDb.sqlite.close();
    }
    config.uploadDir = originalUploadDir;
    config.previewCacheDir = originalPreviewCacheDir;
    fs.rmSync(tmpContentDir, { recursive: true, force: true });
    fs.rmSync(uploadDir, { recursive: true, force: true });
    fs.rmSync(previewCacheDir, { recursive: true, force: true });
  });

  it("POST erstellt Feature mit DB-Content", async () => {
    const res = await supertest(app.server)
      .post("/api/features")
      .send({ title: "FT-01", content: "# FT-01\n\nBeschreibung." })
      .expect(201);

    expect(res.body).toMatchObject({ title: "FT-01", status: "draft" });
    expect(res.body).not.toHaveProperty("slug");
    expect(res.body.contentPath).toBeNull();
    const row = testDb.sqlite.prepare("SELECT content FROM features WHERE id = ?").get(res.body.id) as { content: string };
    expect(row.content).toBe("# FT-01\n\nBeschreibung.");
  });

  it("POST setzt Default-Werte", async () => {
    const res = await supertest(app.server).post("/api/features").send({ title: "Defaults" }).expect(201);

    expect(res.body.status).toBe("draft");
    expect(res.body.description).toBeNull();
    expect(res.body.sortOrder).toBe(0);
    expect(res.body.useCaseCount).toBe(0);
  });

  it("POST ohne Titel liefert 400", async () => {
    await supertest(app.server).post("/api/features").send({ status: "draft" }).expect(400);
  });

  it("GET Liste gibt keinen Content zurück", async () => {
    await createFeature(app, { title: "Listenfeature", content: "# Inhalt" });

    const res = await supertest(app.server).get("/api/features").expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBeUndefined();
  });

  it("GET Liste liefert Support-Counter fuer Features", async () => {
    const countedFeature = await createFeature(app, { title: "Mit Support" });
    const emptyFeature = await createFeature(app, { title: "Ohne Support" });
    await supertest(app.server).post(`/api/features/${countedFeature.id}/comments`).send({ body: "Feature comment" }).expect(201);
    await supertest(app.server)
      .post(`/api/features/${countedFeature.id}/attachments`)
      .attach("file", Buffer.from("Feature-Datei"), { filename: "feature.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get("/api/features").expect(200);
    const counted = res.body.find((feature: { id: number }) => feature.id === countedFeature.id);
    const empty = res.body.find((feature: { id: number }) => feature.id === emptyFeature.id);

    expect(counted).toMatchObject({ attachmentCount: 1, noteCount: 0, commentCount: 1 });
    expect(empty).toMatchObject({ attachmentCount: 0, noteCount: 0, commentCount: 0 });
  });

  it("GET einzelnes Feature enthält Content", async () => {
    const feature = await createFeature(app, { title: "Detailfeature", content: "# Detail" });

    const res = await supertest(app.server).get(`/api/features/${feature.id}`).expect(200);

    expect(res.body.content).toBe("# Detail");
  });

  it("GET einzelnes Feature liest Legacy-Dateicontent als Fallback", async () => {
    const contentPath = "content/features/legacy-feature.md";
    fs.writeFileSync(resolveStoredContentPath(contentPath), "# Legacy Feature", "utf8");
    const now = new Date().toISOString();
    const result = testDb.sqlite
      .prepare(
        "INSERT INTO features (title, status, content_path, content, sort_order, version, created_at, updated_at) VALUES (?, 'draft', ?, NULL, 0, 1, ?, ?)"
      )
      .run("Legacy Feature", contentPath, now, now);

    const res = await supertest(app.server).get(`/api/features/${result.lastInsertRowid}`).expect(200);

    expect(res.body.content).toBe("# Legacy Feature");
    expect(res.body.contentPath).toBe(contentPath);
  });

  it("PATCH aktualisiert DB-Content", async () => {
    const feature = await createFeature(app, { title: "Patchfeature", content: "# Alt" });

    const res = await supertest(app.server).patch(`/api/features/${feature.id}`).send({ content: "# Neu", expectedVersion: feature.version }).expect(200);

    expect(res.body.content).toBe("# Neu");
    const row = testDb.sqlite.prepare("SELECT content FROM features WHERE id = ?").get(feature.id) as { content: string };
    expect(row.content).toBe("# Neu");
  });

  it("PATCH aktualisiert Metadaten", async () => {
    const feature = await createFeature(app, { title: "Metafeature" });

    const res = await supertest(app.server)
      .patch(`/api/features/${feature.id}`)
      .send({ title: "Meta neu", status: "active", description: "Kurz", sortOrder: 5, expectedVersion: feature.version })
      .expect(200);

    expect(res.body).toMatchObject({ title: "Meta neu", status: "active", description: "Kurz", sortOrder: 5 });
  });

  it("PATCH mit neuem Titel behÃ¤lt Datei", async () => {
    const feature = await createFeature(app, { title: "Alter Titel", content: "# Inhalt" });
    const res = await supertest(app.server).patch(`/api/features/${feature.id}`).send({ title: "Neuer Titel", expectedVersion: feature.version }).expect(200);

    expect(res.body.contentPath).toBe(feature.contentPath);
    const row = testDb.sqlite.prepare("SELECT content FROM features WHERE id = ?").get(feature.id) as { content: string };
    expect(row.content).toBe("# Inhalt");
  });

  it("DELETE entfernt Feature und Datei", async () => {
    const feature = await createFeature(app, { title: "LÃ¶schfeature" });
    await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

    const row = testDb.sqlite.prepare("SELECT id FROM features WHERE id = ?").get(feature.id);
    expect(row).toBeUndefined();
    await supertest(app.server).get(`/api/features/${feature.id}`).expect(404);
  });

  it("DELETE unbekanntes Feature liefert 404", async () => {
    await supertest(app.server).delete("/api/features/9999").expect(404);
  });

  it("Unbekanntes Feature liefert 404", async () => {
    await supertest(app.server).get("/api/features/9999").expect(404);
  });

  it("GET /api/features/:id/use-cases gibt Use Cases zurück", async () => {
    const feature = await createFeature(app, { title: "Feature mit Use Cases" });
    const useCase = await createUseCase(app, feature.id, { title: "Use Case zur Liste" });

    const res = await supertest(app.server).get(`/api/features/${feature.id}/use-cases`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(useCase.id);
  });

  it("GET /api/features/:id/use-cases für unbekanntes Feature liefert 404", async () => {
    await supertest(app.server).get("/api/features/9999/use-cases").expect(404);
  });
});
