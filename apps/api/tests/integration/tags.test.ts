/**
 * Test Scope: Tags API
 *
 * Covers global tag CRUD, project/task assignments, replacement semantics, uniqueness, and cascades.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createProject, createTag, createTask, createTestDb, truncateAll, type TestDb } from "../helpers/index.js";

describe("Tags API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(() => truncateAll(testDb.sqlite));

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
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
});
