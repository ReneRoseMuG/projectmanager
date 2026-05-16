/**
 * Test Scope: Comments API
 *
 * Covers comment creation, validation, listing order, deletion, and missing resources.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createComment, createProject, createTask, createTestDb, truncateAll, type TestDb } from "../helpers/index.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Comments API", () => {
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

  it("POST /api/tasks/:id/comments erstellt einen Kommentar", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Erster Kommentar" })
      .expect(201);

    expect(res.body.body).toBe("Erster Kommentar");
    expect(res.body.taskId).toBe(task.id);
  });

  it("POST ohne body gibt 400 zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).post(`/api/tasks/${task.id}/comments`).send({}).expect(400);
  });

  it("POST zu nicht existierendem Task gibt 404 zurueck", async () => {
    await supertest(app.server).post("/api/tasks/9999/comments").send({ body: "Kommentar" }).expect(404);
  });

  it("GET /api/tasks/:id/comments gibt Kommentare chronologisch zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await createComment(app, task.id, { body: "Erster" });
    await delay(5);
    await createComment(app, task.id, { body: "Zweiter" });

    const res = await supertest(app.server).get(`/api/tasks/${task.id}/comments`).expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].body).toBe("Erster");
    expect(res.body[1].body).toBe("Zweiter");
  });

  it("DELETE /api/comments/:id loescht den Kommentar", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const comment = await createComment(app, task.id);

    await supertest(app.server).delete(`/api/comments/${comment.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/tasks/${task.id}/comments`).expect(200);
    expect(res.body).toHaveLength(0);
  });

  it("DELETE eines nicht vorhandenen Kommentars gibt 404 zurueck", async () => {
    await supertest(app.server).delete("/api/comments/9999").expect(404);
  });
});
