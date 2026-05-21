/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Wiki-Seiten können als Root- und Unterseiten angelegt werden.
 * - Breadcrumb-Reihenfolge und slug-basierte Dateipfade stimmen.
 * - Seiten mit Unterseiten sind vor direktem Löschen geschützt.
 *
 * Fehlerfälle:
 * - Doppelter Slug liefert 409.
 * - Löschen einer Seite mit Kindern liefert 409.
 *
 * Ziel:
 * Wiki-API, Hierarchie und Markdown-Dateisystem isoliert absichern.
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
    const res = await supertest(app.server).post("/api/wiki").send({ title: "Einführung", slug: "einfuehrung", content: "# Einführung" }).expect(201);

    expect(res.body.parentId).toBeNull();
    expect(fs.readFileSync(resolveStoredContentPath(res.body.contentPath), "utf8")).toBe("# Einführung");
  });

  it("Sub-Seite anlegen mit parentId und Slug-Struktur", async () => {
    const root = await createWikiPage(app, { title: "Einführung", slug: "einfuehrung" });

    const res = await supertest(app.server)
      .post("/api/wiki")
      .send({ title: "Installation", slug: "einfuehrung/installation", parentId: root.id, content: "# Installation" })
      .expect(201);

    expect(res.body.parentId).toBe(root.id);
    expect(res.body.contentPath).toBe("content/wiki/einfuehrung/installation.md");
    expect(fs.existsSync(resolveStoredContentPath(res.body.contentPath))).toBe(true);
  });

  it("GET Children gibt direkte Unterseiten zurück", async () => {
    const root = await createWikiPage(app, { slug: "root-children" });
    const child = await createWikiPage(app, { slug: "root-children/child", parentId: root.id });

    const res = await supertest(app.server).get(`/api/wiki/${root.id}/children`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(child.id);
  });

  it("GET Detail enthält Content", async () => {
    const page = await createWikiPage(app, { slug: "wiki-detail", content: "# Detail" });

    const res = await supertest(app.server).get(`/api/wiki/${page.id}`).expect(200);

    expect(res.body.content).toBe("# Detail");
  });

  it("Breadcrumb-Reihenfolge ist Root zuerst", async () => {
    const root = await createWikiPage(app, { title: "Root", slug: "root" });
    const child = await createWikiPage(app, { title: "Child", slug: "root/child", parentId: root.id });

    const res = await supertest(app.server).get(`/api/wiki/${child.id}/breadcrumb`).expect(200);

    expect(res.body).toEqual([
      { id: root.id, title: "Root", slug: "root" },
      { id: child.id, title: "Child", slug: "root/child" }
    ]);
  });

  it("Root-Seite mit Sub-Seiten ist nicht löschbar", async () => {
    const root = await createWikiPage(app, { slug: "root-delete" });
    await createWikiPage(app, { slug: "root-delete/child", parentId: root.id });

    await supertest(app.server).delete(`/api/wiki/${root.id}`).expect(409);
  });

  it("Sub-Seite löschen, dann Root löschen", async () => {
    const root = await createWikiPage(app, { slug: "root-clean" });
    const child = await createWikiPage(app, { slug: "root-clean/child", parentId: root.id });

    await supertest(app.server).delete(`/api/wiki/${child.id}`).expect(204);
    await supertest(app.server).delete(`/api/wiki/${root.id}`).expect(204);
  });

  it("PATCH aktualisiert Content und Datei", async () => {
    const page = await createWikiPage(app, { slug: "wiki-patch", content: "# Alt" });

    const res = await supertest(app.server).patch(`/api/wiki/${page.id}`).send({ content: "# Neu", expectedVersion: page.version }).expect(200);

    expect(res.body.content).toBe("# Neu");
    expect(fs.readFileSync(resolveStoredContentPath(res.body.contentPath), "utf8")).toBe("# Neu");
  });

  it("PATCH mit neuem Slug benennt Datei um", async () => {
    const page = await createWikiPage(app, { slug: "wiki-old" });
    const oldPath = resolveStoredContentPath(page.contentPath ?? "");

    const res = await supertest(app.server).patch(`/api/wiki/${page.id}`).send({ slug: "wiki-new", expectedVersion: page.version }).expect(200);

    expect(res.body.contentPath).toBe("content/wiki/wiki-new.md");
    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(resolveStoredContentPath(res.body.contentPath))).toBe(true);
  });

  it("GET /api/wiki gibt Root-Seiten und ChildCount zurück", async () => {
    const root = await createWikiPage(app, { slug: "root-list" });
    await createWikiPage(app, { slug: "root-list/child", parentId: root.id });

    const res = await supertest(app.server).get("/api/wiki").expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].childCount).toBe(1);
    expect(res.body[0].content).toBeUndefined();
  });

  it("Doppelter Slug liefert 409", async () => {
    await createWikiPage(app, { slug: "wiki-duplicate" });

    await supertest(app.server).post("/api/wiki").send({ title: "Doppelt", slug: "wiki-duplicate" }).expect(409);
  });

  it("Unbekannte Parent-Seite liefert 404", async () => {
    await supertest(app.server).post("/api/wiki").send({ title: "Kind", slug: "missing/child", parentId: 9999 }).expect(404);
  });
});
