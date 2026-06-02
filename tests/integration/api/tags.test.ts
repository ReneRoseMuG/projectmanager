/**
 * Test Scope: Tags API
 *
 * Covers global tag CRUD, project/task/milestone/ticket assignments, replacement semantics,
 * uniqueness, cascades, usageCounts, and error cases (404, 409 version conflict).
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
    expect(tagBefore.usageCounts).toEqual({ projects: 0, milestones: 0, tasks: 0, tickets: 0 });

    await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag.id] }).expect(200);

    const after = await supertest(app.server).get("/api/tags").expect(200);
    const tagAfter = after.body.find((t: { id: number }) => t.id === tag.id);
    expect(tagAfter.usageCounts).toMatchObject({ projects: 1, tasks: 0, milestones: 0, tickets: 0 });
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

    expect(found.usageCounts).toEqual({ projects: 1, milestones: 1, tasks: 1, tickets: 1 });
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
});
