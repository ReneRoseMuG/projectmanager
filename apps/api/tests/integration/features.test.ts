/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Features werden mit Markdown-Datei angelegt, gelesen, aktualisiert und gelöscht.
 * - Listenendpunkte liefern keinen großen Content.
 * - Slugs sind eindeutig und Use Cases eines Features sind abrufbar.
 *
 * Fehlerfälle:
 * - Doppelter Slug liefert 409.
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
import { resolveStoredContentPath, setContentBaseDir } from "../../src/services/content.service.js";
import { buildTestApp, createFeature, createTestDb, createUseCase, truncateAll, type TestDb } from "../helpers/index.js";

describe("Features API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let tmpContentDir: string;

  beforeAll(async () => {
    tmpContentDir = fs.mkdtempSync(path.join(os.tmpdir(), "taskmanager-content-"));
    setContentBaseDir(tmpContentDir);
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
    fs.rmSync(tmpContentDir, { recursive: true, force: true });
    fs.mkdirSync(tmpContentDir, { recursive: true });
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
    fs.rmSync(tmpContentDir, { recursive: true, force: true });
  });

  it("POST erstellt Feature und Markdown-Datei", async () => {
    const res = await supertest(app.server)
      .post("/api/features")
      .send({ title: "FT-01", slug: "ft-01", content: "# FT-01\n\nBeschreibung." })
      .expect(201);

    expect(res.body).toMatchObject({ title: "FT-01", slug: "ft-01", status: "draft" });
    expect(res.body.contentPath).toContain("feature-");
    expect(fs.readFileSync(resolveStoredContentPath(res.body.contentPath), "utf8")).toBe("# FT-01\n\nBeschreibung.");
  });

  it("POST setzt Default-Werte", async () => {
    const res = await supertest(app.server).post("/api/features").send({ title: "Defaults", slug: "ft-defaults" }).expect(201);

    expect(res.body.status).toBe("draft");
    expect(res.body.description).toBeNull();
    expect(res.body.sortOrder).toBe(0);
    expect(res.body.useCaseCount).toBe(0);
  });

  it("POST ohne Titel liefert 400", async () => {
    await supertest(app.server).post("/api/features").send({ slug: "ft-invalid" }).expect(400);
  });

  it("GET Liste gibt keinen Content zurück", async () => {
    await createFeature(app, { slug: "ft-list", content: "# Inhalt" });

    const res = await supertest(app.server).get("/api/features").expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBeUndefined();
  });

  it("GET einzelnes Feature enthält Content", async () => {
    const feature = await createFeature(app, { slug: "ft-detail", content: "# Detail" });

    const res = await supertest(app.server).get(`/api/features/${feature.id}`).expect(200);

    expect(res.body.content).toBe("# Detail");
  });

  it("PATCH aktualisiert Content und Datei", async () => {
    const feature = await createFeature(app, { slug: "ft-patch", content: "# Alt" });

    const res = await supertest(app.server).patch(`/api/features/${feature.id}`).send({ content: "# Neu", expectedVersion: feature.version }).expect(200);

    expect(res.body.content).toBe("# Neu");
    expect(fs.readFileSync(resolveStoredContentPath(res.body.contentPath), "utf8")).toBe("# Neu");
  });

  it("PATCH aktualisiert Metadaten", async () => {
    const feature = await createFeature(app, { slug: "ft-meta" });

    const res = await supertest(app.server)
      .patch(`/api/features/${feature.id}`)
      .send({ title: "Meta neu", status: "active", description: "Kurz", sortOrder: 5, expectedVersion: feature.version })
      .expect(200);

    expect(res.body).toMatchObject({ title: "Meta neu", status: "active", description: "Kurz", sortOrder: 5 });
  });

  it("PATCH mit neuem Slug benennt Datei um", async () => {
    const feature = await createFeature(app, { slug: "ft-old", content: "# Inhalt" });
    const oldPath = resolveStoredContentPath(feature.contentPath ?? "");

    const res = await supertest(app.server).patch(`/api/features/${feature.id}`).send({ slug: "ft-new", expectedVersion: feature.version }).expect(200);

    expect(res.body.contentPath).toContain("ft-new");
    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(resolveStoredContentPath(res.body.contentPath))).toBe(true);
  });

  it("DELETE entfernt Feature und Datei", async () => {
    const feature = await createFeature(app, { slug: "ft-delete" });
    const contentPath = resolveStoredContentPath(feature.contentPath ?? "");

    await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

    expect(fs.existsSync(contentPath)).toBe(false);
    await supertest(app.server).get(`/api/features/${feature.id}`).expect(404);
  });

  it("DELETE unbekanntes Feature liefert 404", async () => {
    await supertest(app.server).delete("/api/features/9999").expect(404);
  });

  it("Doppelter Slug liefert 409", async () => {
    await createFeature(app, { slug: "ft-duplicate" });

    await supertest(app.server).post("/api/features").send({ title: "Duplikat", slug: "ft-duplicate" }).expect(409);
  });

  it("Unbekanntes Feature liefert 404", async () => {
    await supertest(app.server).get("/api/features/9999").expect(404);
  });

  it("GET /api/features/:id/use-cases gibt Use Cases zurück", async () => {
    const feature = await createFeature(app, { slug: "ft-usecases" });
    const useCase = await createUseCase(app, feature.id, { slug: "uc-feature-list" });

    const res = await supertest(app.server).get(`/api/features/${feature.id}/use-cases`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(useCase.id);
  });

  it("GET /api/features/:id/use-cases für unbekanntes Feature liefert 404", async () => {
    await supertest(app.server).get("/api/features/9999/use-cases").expect(404);
  });
});
