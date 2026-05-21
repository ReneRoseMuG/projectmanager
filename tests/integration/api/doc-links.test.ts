/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-Feature-Verknüpfungen verwenden vollständige PUT-Ersetzung.
 * - Feature- und Use-Case-Aufgaben verwenden Owner-Task-Links ohne Task-Domänen-FKs.
 *
 * Fehlerfälle:
 * - Ungültige Feature-IDs liefern 400.
 * - Unbekannte Owner oder Aufgaben liefern 404.
 *
 * Ziel:
 * Junction-/Link-APIs gegen reale In-Memory-SQLite-Tabellen absichern.
 */

import type { FastifyInstance } from "fastify";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setContentBaseDir } from "../../../apps/api/src/services/content.service.js";
import { buildTestApp, createFeature, createProject, createTask, createTestDb, createUseCase, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Doc Link APIs", () => {
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

  it("PUT /projects/:id/features weist Features zu", async () => {
    const project = await createProject(app);
    const feature = await createFeature(app, { slug: "ft-project-link" });

    const res = await supertest(app.server).put(`/api/projects/${project.id}/features`).send({ featureIds: [feature.id] }).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(feature.id);
  });

  it("PUT ersetzt vollständig und leeres Array entfernt alle Projekt-Feature-Links", async () => {
    const project = await createProject(app);
    const first = await createFeature(app, { slug: "ft-replace-a" });
    const second = await createFeature(app, { slug: "ft-replace-b" });

    await supertest(app.server).put(`/api/projects/${project.id}/features`).send({ featureIds: [first.id] }).expect(200);
    const replaced = await supertest(app.server).put(`/api/projects/${project.id}/features`).send({ featureIds: [second.id] }).expect(200);
    expect(replaced.body.map((feature: { id: number }) => feature.id)).toEqual([second.id]);

    const empty = await supertest(app.server).put(`/api/projects/${project.id}/features`).send({ featureIds: [] }).expect(200);
    expect(empty.body).toEqual([]);
  });

  it("Ungültige Feature-ID liefert 400", async () => {
    const project = await createProject(app);

    await supertest(app.server).put(`/api/projects/${project.id}/features`).send({ featureIds: [9999] }).expect(400);
  });

  it("Unbekanntes Projekt liefert 404", async () => {
    const feature = await createFeature(app, { slug: "ft-missing-project" });

    await supertest(app.server).put("/api/projects/9999/features").send({ featureIds: [feature.id] }).expect(404);
  });

  it("POST /features/:id/tasks/:taskId und GET geben verknüpfte Aufgaben zurück", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const feature = await createFeature(app, { slug: "ft-task-link" });

    await supertest(app.server).post(`/api/features/${feature.id}/tasks/${task.id}`).expect(200);
    const res = await supertest(app.server).get(`/api/features/${feature.id}/tasks`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(task.id);
  });

  it("DELETE /features/:id/tasks/:taskId entfernt nur den Link", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const feature = await createFeature(app, { slug: "ft-task-unlink" });

    await supertest(app.server).post(`/api/features/${feature.id}/tasks/${task.id}`).expect(200);
    await supertest(app.server).delete(`/api/features/${feature.id}/tasks/${task.id}`).expect(204);

    await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    const res = await supertest(app.server).get(`/api/features/${feature.id}/tasks`).expect(200);
    expect(res.body).toEqual([]);
  });

  it("POST /use-cases/:id/tasks/:taskId und GET geben verknüpfte Aufgaben zurück", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const feature = await createFeature(app, { slug: "ft-uc-link" });
    const useCase = await createUseCase(app, feature.id, { slug: "uc-task-link" });

    await supertest(app.server).post(`/api/use-cases/${useCase.id}/tasks/${task.id}`).expect(200);
    const res = await supertest(app.server).get(`/api/use-cases/${useCase.id}/tasks`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(task.id);
  });

  it("Unbekannter Use-Case-Task-Link liefert 404", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).post(`/api/use-cases/9999/tasks/${task.id}`).expect(404);
  });
});
