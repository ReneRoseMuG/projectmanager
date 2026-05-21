/**
 * Test Scope: Tasks API
 *
 * Covers task CRUD, owner-board positions, task details, status transitions, and cascades.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildTestApp,
  createComment,
  createProject,
  createSubtask,
  createTask,
  createTestDb,
  truncateAll,
  type TestDb
} from "../../fixtures/api/index.js";

describe("Tasks API", () => {
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

  it("POST /api/projects/:id/tasks erstellt eine neue Aufgabe", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .post(`/api/projects/${project.id}/tasks`)
      .send({
        title: "Neue Aufgabe",
        description: "Beschreibung",
        status: "todo",
        priority: "high",
        assignee: "Max",
        dueDate: "2026-06-30"
      })
      .expect(201);

    expect(res.body).toMatchObject({
      parentId: null,
      title: "Neue Aufgabe",
      description: "Beschreibung",
      status: "todo",
      priority: "high",
      assignee: "Max",
      dueDate: "2026-06-30"
    });
    expect(res.body.boardPosition).toBeGreaterThan(0);
  });

  it("POST zu nicht existierentem Projekt gibt 404 zurueck", async () => {
    await supertest(app.server).post("/api/projects/9999/tasks").send({ title: "Task" }).expect(404);
  });

  it("POST ohne title gibt 400 zurueck", async () => {
    const project = await createProject(app);
    await supertest(app.server).post(`/api/projects/${project.id}/tasks`).send({ status: "todo" }).expect(400);
  });

  it("POST mit ungueltigem Status gibt 400 zurueck", async () => {
    const project = await createProject(app);
    await supertest(app.server)
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Task", status: "invalid" })
      .expect(400);
  });

  it("GET /api/projects/:id/tasks gibt nur Top-Level-Tasks zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id, { title: "Top-Level" });
    const subtask = await createSubtask(app, task.id, { title: "Subtask" });

    const res = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(task.id);
    expect(res.body.find((item: { id: number }) => item.id === subtask.id)).toBeUndefined();
  });

  it("GET /api/tasks/:id gibt Task mit Subtask-Count zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    await createSubtask(app, task.id, { title: "Sub A" });
    await createSubtask(app, task.id, { title: "Sub B" });

    const res = await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);

    expect(res.body.subtaskCount).toBe(2);
    expect(res.body.subtasks).toHaveLength(2);
  });

  it("GET /api/tasks/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).get("/api/tasks/9999").expect(404);
  });

  it("PATCH /api/tasks/:id aktualisiert Felder", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .patch(`/api/tasks/${task.id}`)
      .send({
        title: "Aktualisiert",
        status: "in_progress",
        priority: "urgent",
        assignee: "Erika",
        dueDate: "2026-07-01",
        expectedVersion: task.version
      })
      .expect(200);

    expect(res.body).toMatchObject({
      title: "Aktualisiert",
      status: "in_progress",
      priority: "urgent",
      assignee: "Erika",
      dueDate: "2026-07-01"
    });
  });

  it("PATCH /api/projects/:id/tasks/:taskId/board aktualisiert Status und Owner-Position", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .patch(`/api/projects/${project.id}/tasks/${task.id}/board`)
      .send({ status: "done", position: 42, expectedVersion: task.version })
      .expect(200);

    expect(res.body.status).toBe("done");
    expect(res.body.boardPosition).toBe(42);
  });

  it("PATCH /api/projects/:id/tasks/:taskId/board ohne status gibt 400 zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).patch(`/api/projects/${project.id}/tasks/${task.id}/board`).send({ position: 42, expectedVersion: task.version }).expect(400);
  });

  it("POST /api/projects/:id/tasks/:taskId verknüpft eine vorhandene Aufgabe", async () => {
    const firstProject = await createProject(app, { name: "Erstes Projekt" });
    const secondProject = await createProject(app, { name: "Zweites Projekt" });
    const task = await createTask(app, firstProject.id, { title: "Vorhandene Aufgabe" });

    const link = await supertest(app.server).post(`/api/projects/${secondProject.id}/tasks/${task.id}`).expect(200);
    expect(link.body).toMatchObject({ id: task.id, title: "Vorhandene Aufgabe" });

    const secondBoard = await supertest(app.server).get(`/api/projects/${secondProject.id}/tasks`).expect(200);
    expect(secondBoard.body.map((item: { id: number }) => item.id)).toEqual([task.id]);
  });

  it("DELETE /api/projects/:id/tasks/:taskId entfernt nur die Zuordnung", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
    await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);

    const board = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);
    expect(board.body).toHaveLength(0);
  });

  it("DELETE /api/tasks/:id loescht die Aufgabe nach entfernter Owner-Zuordnung", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
    await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);
    await supertest(app.server).get(`/api/tasks/${task.id}`).expect(404);
  });

  it("DELETE /api/tasks/:id entfernt auch Subtasks und Kommentare (Cascade)", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const subtask = await createSubtask(app, task.id);
    await createComment(app, task.id);

    await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
    await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);
    await supertest(app.server).get(`/api/tasks/${subtask.id}`).expect(404);
    await supertest(app.server).get(`/api/tasks/${task.id}/comments`).expect(404);
  });

  it("Statusuebergang todo -> in_progress -> done ist moeglich", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id, { status: "todo" });

    const inProgress = await supertest(app.server).patch(`/api/tasks/${task.id}`).send({ status: "in_progress", expectedVersion: task.version }).expect(200);

    const res = await supertest(app.server).patch(`/api/tasks/${task.id}`).send({ status: "done", expectedVersion: inProgress.body.version }).expect(200);
    expect(res.body.status).toBe("done");
  });
});
