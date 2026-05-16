/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt- und Task-Feature-Verknüpfungen verwenden vollständige PUT-Ersetzung.
 * - Task-Use-Case-Verknüpfungen können gesetzt und gelesen werden.
 * - Leere Arrays entfernen alle Verknüpfungen.
 *
 * Fehlerfälle:
 * - Ungültige Feature- oder Use-Case-IDs liefern 400.
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
import { setContentBaseDir } from "../../src/services/content.service.js";
import { buildTestApp, createFeature, createProject, createTask, createTestDb, createUseCase, truncateAll, type TestDb } from "../helpers/index.js";

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

  it("PUT ersetzt vollständig und leeres Array entfernt alle", async () => {
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

  it("PUT /tasks/:id/features und GET geben verknüpfte Features zurück", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const feature = await createFeature(app, { slug: "ft-task-link" });

    await supertest(app.server).put(`/api/tasks/${task.id}/features`).send({ featureIds: [feature.id] }).expect(200);
    const res = await supertest(app.server).get(`/api/tasks/${task.id}/features`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(feature.id);
  });

  it("PUT /tasks/:id/features ersetzt und entfernt mit leerem Array", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const first = await createFeature(app, { slug: "ft-task-replace-a" });
    const second = await createFeature(app, { slug: "ft-task-replace-b" });

    await supertest(app.server).put(`/api/tasks/${task.id}/features`).send({ featureIds: [first.id] }).expect(200);
    const replaced = await supertest(app.server).put(`/api/tasks/${task.id}/features`).send({ featureIds: [second.id] }).expect(200);
    expect(replaced.body.map((feature: { id: number }) => feature.id)).toEqual([second.id]);

    const empty = await supertest(app.server).put(`/api/tasks/${task.id}/features`).send({ featureIds: [] }).expect(200);
    expect(empty.body).toEqual([]);
  });

  it("PUT /tasks/:id/use-cases und GET geben verknüpfte Use Cases zurück", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const feature = await createFeature(app, { slug: "ft-uc-link" });
    const useCase = await createUseCase(app, feature.id, { slug: "uc-task-link" });

    await supertest(app.server).put(`/api/tasks/${task.id}/use-cases`).send({ useCaseIds: [useCase.id] }).expect(200);
    const res = await supertest(app.server).get(`/api/tasks/${task.id}/use-cases`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(useCase.id);
  });

  it("Ungültige Use-Case-ID liefert 400", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).put(`/api/tasks/${task.id}/use-cases`).send({ useCaseIds: [9999] }).expect(400);
  });
});
