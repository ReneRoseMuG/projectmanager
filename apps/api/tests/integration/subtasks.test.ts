/**
 * Test Scope: Subtasks API
 *
 * Covers subtask creation, listing, top-level separation, updates, and depth validation.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createProject, createSubtask, createTask, createTestDb, truncateAll, type TestDb } from "../helpers/index.js";

describe("Subtasks API", () => {
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

  it("POST /api/tasks/:id/subtasks erstellt einen Subtask", async () => {
    const project = await createProject(app);
    const parent = await createTask(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tasks/${parent.id}/subtasks`)
      .send({ title: "Subtask", status: "todo" })
      .expect(201);

    expect(res.body.projectId).toBe(project.id);
    expect(res.body.parentId).toBe(parent.id);
    expect(res.body.title).toBe("Subtask");
  });

  it("GET /api/tasks/:id/subtasks gibt alle Subtasks zurueck", async () => {
    const project = await createProject(app);
    const parent = await createTask(app, project.id);
    const first = await createSubtask(app, parent.id, { title: "Sub A" });
    const second = await createSubtask(app, parent.id, { title: "Sub B" });

    const res = await supertest(app.server).get(`/api/tasks/${parent.id}/subtasks`).expect(200);
    const ids = res.body.map((task: { id: number }) => task.id);

    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it("Subtask erscheint nicht in der Top-Level-Projektliste", async () => {
    const project = await createProject(app);
    const parent = await createTask(app, project.id);
    const subtask = await createSubtask(app, parent.id);

    const res = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);

    expect(res.body.find((task: { id: number }) => task.id === subtask.id)).toBeUndefined();
    expect(res.body.find((task: { id: number }) => task.id === parent.id)).toBeDefined();
  });

  it("POST zu nicht existierendem Parent gibt 404 zurueck", async () => {
    await supertest(app.server).post("/api/tasks/9999/subtasks").send({ title: "Subtask" }).expect(404);
  });

  it("Subtask-Status kann auf done gesetzt werden", async () => {
    const project = await createProject(app);
    const parent = await createTask(app, project.id);
    const subtask = await createSubtask(app, parent.id, { status: "todo" });

    const res = await supertest(app.server).patch(`/api/tasks/${subtask.id}`).send({ status: "done" }).expect(200);
    expect(res.body.status).toBe("done");
  });

  it("Subtask eines Subtasks anlegen gibt 400 zurueck (max. Tiefe 1)", async () => {
    const project = await createProject(app);
    const parent = await createTask(app, project.id);
    const subtask = await createSubtask(app, parent.id);

    await supertest(app.server).post(`/api/tasks/${subtask.id}/subtasks`).send({ title: "Sub-Sub" }).expect(400);
  });
});
