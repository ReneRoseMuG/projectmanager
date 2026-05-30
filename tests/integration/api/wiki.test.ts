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
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createProject, createTask, createTestDb, createTicket, createWikiPage, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Wiki API", () => {
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

  it("Root-Seite anlegen", async () => {
    const res = await supertest(app.server).post("/api/wiki").send({ title: "Einführung", content: "# Einführung" }).expect(201);

    expect(res.body.parentId).toBeNull();
    expect(res.body).not.toHaveProperty("slug");
    expect(res.body).not.toHaveProperty("projectId");
    expect(res.body).not.toHaveProperty("contentPath");
    const [wikiRows1] = await testDb.pool.execute("SELECT content FROM wiki_pages WHERE id = ?", [res.body.id]);
    const row = (wikiRows1 as Array<{ content: string }>)[0];
    expect(row.content).toBe("# Einführung");
  });

  it("Sub-Seite anlegen mit parentId", async () => {
    const root = await createWikiPage(app, { title: "Einführung" });

    const res = await supertest(app.server)
      .post("/api/wiki")
      .send({ title: "Installation", parentId: root.id, content: "# Installation" })
      .expect(201);

    expect(res.body.parentId).toBe(root.id);
    expect(res.body).not.toHaveProperty("contentPath");
    const [wikiRows1] = await testDb.pool.execute("SELECT content FROM wiki_pages WHERE id = ?", [res.body.id]);
    const row = (wikiRows1 as Array<{ content: string }>)[0];
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
    const [wikiRows2] = await testDb.pool.execute("SELECT content FROM wiki_pages WHERE id = ?", [page.id]);
    const row = (wikiRows2 as Array<{ content: string }>)[0];
    expect(row.content).toBe("# Neu");
  });

  it("PATCH mit neuem Titel behält DB-Content", async () => {
    const page = await createWikiPage(app, { title: "Wiki Old", content: "# Inhalt" });

    const res = await supertest(app.server).patch(`/api/wiki/${page.id}`).send({ title: "Wiki New", expectedVersion: page.version }).expect(200);

    expect(res.body).not.toHaveProperty("contentPath");
    const [wikiRows2] = await testDb.pool.execute("SELECT content FROM wiki_pages WHERE id = ?", [page.id]);
    const row = (wikiRows2 as Array<{ content: string }>)[0];
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

  it("Relationen werden bidirektional gelesen und validiert", async () => {
    const source = await createWikiPage(app, { title: "Source" });
    const target = await createWikiPage(app, { title: "Target" });

    const created = await supertest(app.server)
      .post(`/api/wiki/${source.id}/relations`)
      .send({ targetWikiPageId: target.id })
      .expect(201);

    expect(created.body).toEqual([{ id: target.id, title: target.title, parentId: null }]);
    const reverse = await supertest(app.server).get(`/api/wiki-pages/${target.id}/relations`).expect(200);
    expect(reverse.body).toEqual([{ id: source.id, title: source.title, parentId: null }]);
    const detail = await supertest(app.server).get(`/api/wiki/${source.id}`).expect(200);
    expect(detail.body.relatedPages).toEqual([{ id: target.id, title: target.title, parentId: null }]);

    await supertest(app.server).post(`/api/wiki/${source.id}/relations`).send({ targetWikiPageId: target.id }).expect(409);
    await supertest(app.server).post(`/api/wiki/${source.id}/relations`).send({ targetWikiPageId: source.id }).expect(400);
    await supertest(app.server).delete(`/api/wiki-pages/${source.id}/relations/${target.id}`).expect(204);
    const afterDelete = await supertest(app.server).get(`/api/wiki/${source.id}/relations`).expect(200);
    expect(afterDelete.body).toEqual([]);
  });

  it("Wiki-Seiten verknüpfen offene Root-Aufgaben", async () => {
    const page = await createWikiPage(app, { title: "Task Links" });
    const project = await createProject(app, { name: "Task Project" });
    const task = await createTask(app, project.id, { title: "Linked Task" });

    const linked = await supertest(app.server).post(`/api/wiki/${page.id}/tasks`).send({ taskId: task.id }).expect(201);
    expect(linked.body.id).toBe(task.id);

    const list = await supertest(app.server).get(`/api/wiki-pages/${page.id}/tasks`).expect(200);
    expect(list.body.map((item: { id: number }) => item.id)).toContain(task.id);
    await supertest(app.server).post(`/api/wiki/${page.id}/tasks`).send({ taskId: task.id }).expect(409);
    await supertest(app.server).delete(`/api/wiki/${page.id}/tasks/${task.id}`).expect(204);
  });

  it("Wiki-Seiten verknüpfen offene Root-Tickets", async () => {
    const page = await createWikiPage(app, { title: "Ticket Links" });
    const ticket = await createTicket(app, null, { title: "Linked Ticket" });

    const linked = await supertest(app.server).post(`/api/wiki/${page.id}/tickets`).send({ ticketId: ticket.id }).expect(201);
    expect(linked.body.id).toBe(ticket.id);

    const list = await supertest(app.server).get(`/api/wiki-pages/${page.id}/tickets`).expect(200);
    expect(list.body.map((item: { id: number }) => item.id)).toContain(ticket.id);
    await supertest(app.server).post(`/api/wiki/${page.id}/tickets`).send({ ticketId: ticket.id }).expect(409);
    await supertest(app.server).delete(`/api/wiki/${page.id}/tickets/${ticket.id}`).expect(204);
  });

  it("Wiki-Löschung entfernt Relations-, Task- und Ticket-Links per Cascade", async () => {
    const page = await createWikiPage(app, { title: "Cascade Links" });
    const related = await createWikiPage(app, { title: "Cascade Related" });
    const project = await createProject(app, { name: "Cascade Project" });
    const task = await createTask(app, project.id, { title: "Cascade Task" });
    const ticket = await createTicket(app, null, { title: "Cascade Ticket" });

    await supertest(app.server).post(`/api/wiki/${page.id}/relations`).send({ targetWikiPageId: related.id }).expect(201);
    await supertest(app.server).post(`/api/wiki/${page.id}/tasks`).send({ taskId: task.id }).expect(201);
    await supertest(app.server).post(`/api/wiki/${page.id}/tickets`).send({ ticketId: ticket.id }).expect(201);
    await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

    const [relRows2] = await testDb.pool.execute("SELECT source_wiki_page_id FROM wiki_page_relations WHERE source_wiki_page_id = ? OR target_wiki_page_id = ?", [page.id, page.id]);
    const relation = (relRows2 as unknown[])[0] ?? undefined;
    const [taskLinkRows] = await testDb.pool.execute("SELECT owner_id FROM wiki_page_tasks WHERE owner_id = ?", [page.id]);
    const taskLink = (taskLinkRows as unknown[])[0] ?? undefined;
    const [ticketLinkRows] = await testDb.pool.execute("SELECT owner_id FROM wiki_page_tickets WHERE owner_id = ?", [page.id]);
    const ticketLink = (ticketLinkRows as unknown[])[0] ?? undefined;
    expect(relation).toBeUndefined();
    expect(taskLink).toBeUndefined();
    expect(ticketLink).toBeUndefined();
  });

  it("Unbekannte Parent-Seite liefert 404", async () => {
    await supertest(app.server).post("/api/wiki").send({ title: "Kind", parentId: 9999 }).expect(404);
  });
});
