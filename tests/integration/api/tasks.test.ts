/**
 * Test Scope: Tasks API
 *
 * Covers task CRUD, owner-board positions, task details, status transitions, and cascades.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import {
  buildTestApp,
  createComment,
  createFeature,
  createMilestone,
  createNoteForTask,
  createProject,
  createSubtask,
  createTask,
  createTestDb,
  createUseCase,
  truncateAll,
  type TestDb
} from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-task-counts-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-task-count-previews-${process.pid}`);

describe("Tasks API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalUploadDir: string;
  let originalPreviewCacheDir: string;

  beforeAll(async () => {
    originalUploadDir = config.uploadDir;
    originalPreviewCacheDir = config.previewCacheDir;
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    config.uploadDir = uploadDir;
    config.previewCacheDir = previewCacheDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableMultipart: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    config.uploadDir = originalUploadDir;
    config.previewCacheDir = originalPreviewCacheDir;
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
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
        responsibleUserId: 1,
        dueDate: "2026-06-30"
      })
      .expect(201);

    expect(res.body).toMatchObject({
      parentId: null,
      title: "Neue Aufgabe",
      description: "Beschreibung",
      status: "todo",
      priority: "high",
      responsibleUserId: 1,
      responsibleUser: expect.objectContaining({ id: 1 }),
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

  it("GET /api/projects/:id/tasks liefert Support-Counter fuer Aufgaben", async () => {
    const project = await createProject(app);
    const countedTask = await createTask(app, project.id, { title: "Mit Support" });
    const emptyTask = await createTask(app, project.id, { title: "Ohne Support" });
    await createNoteForTask(app, countedTask.id);
    await createComment(app, countedTask.id);
    await supertest(app.server)
      .post(`/api/tasks/${countedTask.id}/attachments`)
      .attach("file", Buffer.from("Task-Datei"), { filename: "task.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);
    const counted = res.body.find((task: { id: number }) => task.id === countedTask.id);
    const empty = res.body.find((task: { id: number }) => task.id === emptyTask.id);

    expect(counted).toMatchObject({ attachmentCount: 1, noteCount: 1, commentCount: 1 });
    expect(empty).toMatchObject({ attachmentCount: 0, noteCount: 0, commentCount: 0 });
  });

  it("GET /api/projects/:id/tasks liefert direkte und Meilenstein-Aufgaben kumulativ", async () => {
    const project = await createProject(app, { name: "Projekt Alpha" });
    const milestone = await createMilestone(app, project.id, { name: "Meilenstein A" });
    const directTask = await createTask(app, project.id, { title: "Direkte Aufgabe" });
    const inheritedTask = await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks`).send({ title: "Meilenstein-Aufgabe" }).expect(201);
    const duplicateTask = await createTask(app, project.id, { title: "Doppelt sichtbar" });
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks/${duplicateTask.id}`).expect(200);

    const projectTasks = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);
    const projectTaskIds = projectTasks.body.map((task: { id: number }) => task.id);
    expect(projectTaskIds).toEqual(expect.arrayContaining([directTask.id, inheritedTask.body.id, duplicateTask.id]));
    expect(projectTaskIds.filter((id: number) => id === duplicateTask.id)).toHaveLength(1);
    expect(projectTasks.body.find((task: { id: number }) => task.id === directTask.id).visibleParent).toMatchObject({ type: "project", id: project.id, label: "Projekt Alpha", origin: "direct" });
    expect(projectTasks.body.find((task: { id: number }) => task.id === inheritedTask.body.id).visibleParent).toMatchObject({ type: "milestone", id: milestone.id, label: "Meilenstein A", origin: "inherited" });

    const milestoneTasks = await supertest(app.server).get(`/api/milestones/${milestone.id}/tasks`).expect(200);
    expect(milestoneTasks.body.map((task: { id: number }) => task.id)).toEqual(expect.arrayContaining([inheritedTask.body.id, duplicateTask.id]));
    expect(milestoneTasks.body.find((task: { id: number }) => task.id === duplicateTask.id).visibleParent).toMatchObject({ type: "milestone", id: milestone.id, origin: "direct" });
  });

  it("GET /api/tasks/:id gibt Task mit Subtask-Count zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    await createSubtask(app, task.id, { title: "Sub A" });
    await createSubtask(app, task.id, { title: "Sub B" });

    const res = await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);

    expect(res.body.subtaskCount).toBe(2);
    expect(res.body.subtasks).toHaveLength(2);
    expect(res.body.parentContexts).toEqual([
      { type: "project", id: project.id, label: project.name, origin: "direct" }
    ]);
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
        responsibleUserId: 1,
        dueDate: "2026-07-01",
        expectedVersion: task.version
      })
      .expect(200);

    expect(res.body).toMatchObject({
      title: "Aktualisiert",
      status: "in_progress",
      priority: "urgent",
      responsibleUserId: 1,
      responsibleUser: expect.objectContaining({ id: 1 }),
      dueDate: "2026-07-01"
    });
  });

  it("PATCH /api/tasks/:id weist unbekannte verantwortliche User ab", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server)
      .patch(`/api/tasks/${task.id}`)
      .send({ responsibleUserId: 9999, expectedVersion: task.version })
      .expect(400);
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
    await supertest(app.server).delete(`/api/projects/${firstProject.id}/tasks/${task.id}`).expect(204);

    const link = await supertest(app.server).post(`/api/projects/${secondProject.id}/tasks/${task.id}`).expect(200);
    expect(link.body).toMatchObject({ id: task.id, title: "Vorhandene Aufgabe" });

    const secondBoard = await supertest(app.server).get(`/api/projects/${secondProject.id}/tasks`).expect(200);
    expect(secondBoard.body.map((item: { id: number }) => item.id)).toEqual([task.id]);
  });

  it("weist projektfremde Aufgaben-Links für alle Owner-Typen ab", async () => {
    const firstProject = await createProject(app, { name: "Erstes Projekt" });
    const secondProject = await createProject(app, { name: "Zweites Projekt" });
    const milestone = await createMilestone(app, secondProject.id);
    const feature = await createFeature(app, { title: "Feature im zweiten Projekt" });
    await supertest(app.server).put(`/api/projects/${secondProject.id}/features`).send({ featureIds: [feature.id] }).expect(200);
    const useCase = await createUseCase(app, feature.id, { title: "Use Case im zweiten Projekt" });
    const task = await createTask(app, firstProject.id, { title: "Projektfremde Aufgabe" });

    await supertest(app.server).post(`/api/projects/${secondProject.id}/tasks/${task.id}`).expect(400);
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks/${task.id}`).expect(400);
    await supertest(app.server).post(`/api/features/${feature.id}/tasks/${task.id}`).expect(400);
    await supertest(app.server).post(`/api/use-cases/${useCase.id}/tasks/${task.id}`).expect(400);
  });

  it("GET /api/tasks/link-candidates liefert nur projektkompatible unverknüpfte Aufgaben", async () => {
    const firstProject = await createProject(app, { name: "Erstes Projekt" });
    const secondProject = await createProject(app, { name: "Zweites Projekt" });
    const foreignTask = await createTask(app, firstProject.id, { title: "Fremde Aufgabe" });
    const neutralTask = await createTask(app, firstProject.id, { title: "Neutrale Aufgabe" });
    const closedNeutralTask = await createTask(app, firstProject.id, { title: "Geschlossene Aufgabe", status: "done" });
    await supertest(app.server).delete(`/api/projects/${firstProject.id}/tasks/${neutralTask.id}`).expect(204);
    await supertest(app.server).delete(`/api/projects/${firstProject.id}/tasks/${closedNeutralTask.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/tasks/link-candidates?ownerType=project&ownerId=${secondProject.id}`).expect(200);

    expect(res.body.map((item: { id: number }) => item.id)).toContain(neutralTask.id);
    expect(res.body.map((item: { id: number }) => item.id)).not.toContain(foreignTask.id);
    expect(res.body.map((item: { id: number }) => item.id)).not.toContain(closedNeutralTask.id);
    await supertest(app.server).post(`/api/projects/${secondProject.id}/tasks/${closedNeutralTask.id}`).expect(400);
  });

  it("GET /api/tasks/link-candidates und Milestone-Link ignorieren geschlossene Aufgaben", async () => {
    const project = await createProject(app, { name: "Milestone-Projekt" });
    const milestone = await createMilestone(app, project.id, { name: "Milestone" });
    const closedTask = await createTask(app, project.id, { title: "Geschlossene Milestone-Aufgabe", status: "done" });
    const openTask = await createTask(app, project.id, { title: "Offene Milestone-Aufgabe", status: "todo" });
    await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${closedTask.id}`).expect(204);
    await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${openTask.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/tasks/link-candidates?ownerType=milestone&ownerId=${milestone.id}`).expect(200);
    const ids = res.body.map((item: { id: number }) => item.id);

    expect(ids).toContain(openTask.id);
    expect(ids).not.toContain(closedTask.id);
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks/${closedTask.id}`).expect(400);
  });

  it("GET /api/tasks/link-candidates liefert Projektaufgaben für bestehende Meilensteine", async () => {
    const project = await createProject(app, { name: "Bestehender Meilenstein Projekt" });
    const foreignProject = await createProject(app, { name: "Fremdes Projekt" });
    const milestone = await createMilestone(app, project.id, { name: "Bestehender Meilenstein" });
    const projectTask = await createTask(app, project.id, { title: "Verknüpfbare Projektaufgabe", status: "todo" });
    const linkedMilestoneTask = await createTask(app, project.id, { title: "Schon am Meilenstein", status: "todo" });
    const closedProjectTask = await createTask(app, project.id, { title: "Geschlossene Projektaufgabe", status: "done" });
    const foreignTask = await createTask(app, foreignProject.id, { title: "Fremde Projektaufgabe", status: "todo" });
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks/${linkedMilestoneTask.id}`).expect(200);

    const res = await supertest(app.server).get(`/api/tasks/link-candidates?ownerType=milestone&ownerId=${milestone.id}`).expect(200);
    const ids = res.body.map((item: { id: number }) => item.id);

    expect(ids).toContain(projectTask.id);
    expect(ids).not.toContain(linkedMilestoneTask.id);
    expect(ids).not.toContain(closedProjectTask.id);
    expect(ids).not.toContain(foreignTask.id);
  });

  it("GET /api/tasks/link-candidates unterstützt Create-Kontext ohne Owner-Ausschluss", async () => {
    const project = await createProject(app, { name: "Kontext-Projekt" });
    const foreignProject = await createProject(app, { name: "Fremdes Projekt" });
    const milestone = await createMilestone(app, project.id, { name: "Kontext-Meilenstein" });
    const projectTask = await createTask(app, project.id, { title: "Bereits am Projekt" });
    const closedProjectTask = await createTask(app, project.id, { title: "Geschlossene Aufgabe", status: "done" });
    const foreignTask = await createTask(app, foreignProject.id, { title: "Fremde Aufgabe" });

    const res = await supertest(app.server).get(`/api/tasks/link-candidates?contextOwnerType=milestone&contextOwnerId=${milestone.id}`).expect(200);
    const ids = res.body.map((item: { id: number }) => item.id);

    expect(ids).toContain(projectTask.id);
    expect(ids).not.toContain(closedProjectTask.id);
    expect(ids).not.toContain(foreignTask.id);
  });

  it("GET /api/tasks/link-candidates unterstützt Projekt-Create-Kontext für neue Meilensteine", async () => {
    const project = await createProject(app, { name: "Neuer Meilenstein Projekt" });
    const foreignProject = await createProject(app, { name: "Fremdes Meilenstein Projekt" });
    const projectTask = await createTask(app, project.id, { title: "Offene Projektaufgabe", status: "todo" });
    const closedProjectTask = await createTask(app, project.id, { title: "Geschlossene Projektaufgabe", status: "done" });
    const foreignTask = await createTask(app, foreignProject.id, { title: "Fremde Projektaufgabe", status: "todo" });

    const res = await supertest(app.server).get(`/api/tasks/link-candidates?contextOwnerType=project&contextOwnerId=${project.id}`).expect(200);
    const ids = res.body.map((item: { id: number }) => item.id);

    expect(ids).toContain(projectTask.id);
    expect(ids).not.toContain(closedProjectTask.id);
    expect(ids).not.toContain(foreignTask.id);
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
