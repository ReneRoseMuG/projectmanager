/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte SQLite-Testdatenbank und echtes temporäres Content-Dateisystem.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temp-DB und Temp-Content-Root pro Suite.
 *
 * Abgedeckte Regeln:
 * - Wiki-Seiten können als Root- und Unterseiten angelegt werden.
 * - Content wird DB-first gespeichert und gelesen.
 * - Legacy-Dateipfade bleiben als Fallback lesbar.
 * - Seiten mit Unterseiten sind vor direktem Löschen geschützt.
 *
 * Fehlerfälle:
 * - Fehlende oder unbekannte Parent-Seiten liefern Fehler.
 * - Löschen einer Seite mit Kindern liefert 409.
 *
 * Ziel:
 * Wiki-API, Hierarchie und HTML-Content-Persistenz isoliert absichern.
 */

import type { FastifyInstance } from "fastify";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resolveStoredContentPath, setContentBaseDir } from "../../../apps/api/src/services/content.service.js";
import { buildTestApp, createTestDb, createWikiPage, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Wiki API", () => {
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

  it("Root-Seite anlegen", async () => {
    const res = await supertest(app.server).post("/api/wiki").send({ title: "Einführung", content: "# Einführung" }).expect(201);

    expect(res.body.parentId).toBeNull();
    expect(res.body).not.toHaveProperty("slug");
    expect(res.body).not.toHaveProperty("projectId");
    expect(res.body.contentPath).toBeNull();
    const row = testDb.sqlite.prepare("SELECT content FROM wiki_pages WHERE id = ?").get(res.body.id) as { content: string };
    expect(row.content).toBe("# Einführung");
  });

  it("Sub-Seite anlegen mit parentId", async () => {
    const root = await createWikiPage(app, { title: "Einführung" });

    const res = await supertest(app.server)
      .post("/api/wiki")
      .send({ title: "Installation", parentId: root.id, content: "# Installation" })
      .expect(201);

    expect(res.body.parentId).toBe(root.id);
    expect(res.body.contentPath).toBeNull();
    const row = testDb.sqlite.prepare("SELECT content FROM wiki_pages WHERE id = ?").get(res.body.id) as { content: string };
    expect(row.content).toBe("# Installation");
  });

  it("Root-Seite mit projectId wird abgewiesen", async () => {
    await supertest(app.server).post("/api/wiki").send({ title: "Alt", projectId: 1 }).expect(400);
  });

  it("GET Children gibt direkte Unterseiten zurück", async () => {
    const root = await createWikiPage(app, { title: "Root Children" });
    const child = await createWikiPage(app, { title: "Child", parentId: root.id });

    const res = await supertest(app.server).get(`/api/wiki/${root.id}/children`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(child.id);
  });

  it("GET Detail enthält Content", async () => {
    const page = await createWikiPage(app, { title: "Wiki Detail", content: "# Detail" });

    const res = await supertest(app.server).get(`/api/wiki/${page.id}`).expect(200);

    expect(res.body.content).toBe("# Detail");
    expect(res.body).not.toHaveProperty("projectId");
  });

  it("GET Detail liest Legacy-Dateicontent als Fallback", async () => {
    const contentPath = "content/wiki/legacy-page.md";
    fs.writeFileSync(resolveStoredContentPath(contentPath), "# Legacy", "utf8");
    const now = new Date().toISOString();
    const result = testDb.sqlite
      .prepare(
        "INSERT INTO wiki_pages (title, content_path, content, sort_order, version, created_at, updated_at) VALUES (?, ?, NULL, 0, 1, ?, ?)"
      )
      .run("Legacy Wiki", contentPath, now, now);

    const res = await supertest(app.server).get(`/api/wiki/${result.lastInsertRowid}`).expect(200);

    expect(res.body.content).toBe("# Legacy");
    expect(res.body.contentPath).toBe(contentPath);
  });

  it("Breadcrumb-Reihenfolge ist Root zuerst", async () => {
    const root = await createWikiPage(app, { title: "Root" });
    const child = await createWikiPage(app, { title: "Child", parentId: root.id });

    const res = await supertest(app.server).get(`/api/wiki/${child.id}/breadcrumb`).expect(200);

    expect(res.body).toEqual([
      { id: root.id, title: "Root" },
      { id: child.id, title: "Child" }
    ]);
  });

  it("Root-Seite mit Sub-Seiten ist nicht löschbar", async () => {
    const root = await createWikiPage(app, { title: "Root Delete" });
    await createWikiPage(app, { title: "Child Delete", parentId: root.id });

    await supertest(app.server).delete(`/api/wiki/${root.id}`).expect(409);
  });

  it("Sub-Seite löschen, dann Root löschen", async () => {
    const root = await createWikiPage(app, { title: "Root Clean" });
    const child = await createWikiPage(app, { title: "Child Clean", parentId: root.id });

    await supertest(app.server).delete(`/api/wiki/${child.id}`).expect(204);
    await supertest(app.server).delete(`/api/wiki/${root.id}`).expect(204);
  });

  it("PATCH aktualisiert DB-Content", async () => {
    const page = await createWikiPage(app, { title: "Wiki Patch", content: "# Alt" });

    const res = await supertest(app.server).patch(`/api/wiki/${page.id}`).send({ content: "# Neu", expectedVersion: page.version }).expect(200);

    expect(res.body.content).toBe("# Neu");
    const row = testDb.sqlite.prepare("SELECT content FROM wiki_pages WHERE id = ?").get(page.id) as { content: string };
    expect(row.content).toBe("# Neu");
  });

  it("PATCH mit neuem Titel behält DB-Content", async () => {
    const page = await createWikiPage(app, { title: "Wiki Old", content: "# Inhalt" });

    const res = await supertest(app.server).patch(`/api/wiki/${page.id}`).send({ title: "Wiki New", expectedVersion: page.version }).expect(200);

    expect(res.body.contentPath).toBe(page.contentPath);
    const row = testDb.sqlite.prepare("SELECT content FROM wiki_pages WHERE id = ?").get(page.id) as { content: string };
    expect(row.content).toBe("# Inhalt");
  });

  it("PATCH mit projectId wird abgewiesen", async () => {
    const page = await createWikiPage(app, { title: "Wiki Project Legacy" });

    await supertest(app.server).patch(`/api/wiki/${page.id}`).send({ projectId: 1, expectedVersion: page.version }).expect(400);
  });

  it("GET /api/wiki gibt Root-Seiten und ChildCount zurück", async () => {
    const root = await createWikiPage(app, { title: "Root List" });
    await createWikiPage(app, { title: "Child List", parentId: root.id });

    const res = await supertest(app.server).get("/api/wiki").expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].childCount).toBe(1);
    expect(res.body[0].content).toBeUndefined();
    expect(res.body[0]).not.toHaveProperty("projectId");
  });

  it("Unbekannte Parent-Seite liefert 404", async () => {
    await supertest(app.server).post("/api/wiki").send({ title: "Kind", parentId: 9999 }).expect(404);
  });
});
