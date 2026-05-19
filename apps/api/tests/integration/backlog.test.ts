/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Backlog-Items gehören zu Projekten und können Features/Use Cases referenzieren.
 * - Filter nach Feature, Use Case und Status funktionieren.
 * - Status-Updates folgen den erlaubten Übergängen.
 *
 * Fehlerfälle:
 * - Falsches Projekt liefert 404.
 * - Ungültiger Statusübergang liefert 400.
 *
 * Ziel:
 * Backlog-API und Projekt-Cascade isoliert absichern.
 */

import type { FastifyInstance } from "fastify";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setContentBaseDir } from "../../src/services/content.service.js";
import { buildTestApp, createBacklogItem, createFeature, createProject, createTestDb, createUseCase, truncateAll, type TestDb } from "../helpers/index.js";

describe("Backlog API", () => {
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

  it("Item anlegen mit projectId und Feature", async () => {
    const project = await createProject(app);
    const feature = await createFeature(app, { slug: "ft-backlog-create" });

    const res = await supertest(app.server).post(`/api/projects/${project.id}/backlog`).send({ title: "Item 1", priority: "high", featureId: feature.id }).expect(201);

    expect(res.body).toMatchObject({ projectId: project.id, featureId: feature.id, status: "open", priority: "high" });
  });

  it("Falsches Projekt liefert 404", async () => {
    await supertest(app.server).post("/api/projects/9999/backlog").send({ title: "Fehlt" }).expect(404);
  });

  it("Ungültiges Feature liefert 404", async () => {
    const project = await createProject(app);

    await supertest(app.server).post(`/api/projects/${project.id}/backlog`).send({ title: "Item", featureId: 9999 }).expect(404);
  });

  it("Ungültiger Use Case liefert 404", async () => {
    const project = await createProject(app);

    await supertest(app.server).post(`/api/projects/${project.id}/backlog`).send({ title: "Item", useCaseId: 9999 }).expect(404);
  });

  it("Filter nach featureId, useCaseId und status", async () => {
    const project = await createProject(app);
    const feature = await createFeature(app, { slug: "ft-backlog-filter" });
    const useCase = await createUseCase(app, feature.id, { slug: "uc-backlog-filter" });
    await createBacklogItem(app, project.id, { title: "Match", featureId: feature.id, useCaseId: useCase.id });
    await createBacklogItem(app, project.id, { title: "Other", status: "rejected" });

    const byFeature = await supertest(app.server).get(`/api/projects/${project.id}/backlog?featureId=${feature.id}`).expect(200);
    const byUseCase = await supertest(app.server).get(`/api/projects/${project.id}/backlog?useCaseId=${useCase.id}`).expect(200);
    const byStatus = await supertest(app.server).get(`/api/projects/${project.id}/backlog?status=open`).expect(200);

    expect(byFeature.body).toHaveLength(1);
    expect(byUseCase.body).toHaveLength(1);
    expect(byStatus.body).toHaveLength(1);
  });

  it("Status-Update open zu in_progress funktioniert", async () => {
    const project = await createProject(app);
    const item = await createBacklogItem(app, project.id);

    const res = await supertest(app.server).patch(`/api/backlog/${item.id}`).send({ status: "in_progress", expectedVersion: item.version }).expect(200);

    expect(res.body.status).toBe("in_progress");
  });

  it("PATCH aktualisiert Titel und Priorität", async () => {
    const project = await createProject(app);
    const item = await createBacklogItem(app, project.id);

    const res = await supertest(app.server).patch(`/api/backlog/${item.id}`).send({ title: "Neu", priority: "urgent", expectedVersion: item.version }).expect(200);

    expect(res.body).toMatchObject({ title: "Neu", priority: "urgent" });
  });

  it("Ungültiger Statusübergang liefert 400", async () => {
    const project = await createProject(app);
    const item = await createBacklogItem(app, project.id);

    await supertest(app.server).patch(`/api/backlog/${item.id}`).send({ status: "done", expectedVersion: item.version }).expect(400);
  });

  it("Projekt-DELETE löscht Backlog-Items per Cascade", async () => {
    const project = await createProject(app);
    const item = await createBacklogItem(app, project.id);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect((response) => {
      expect(response.status).toBeLessThan(300);
    });
    await supertest(app.server).get(`/api/backlog/${item.id}`).expect(404);
  });

  it("DELETE löscht einzelnes Backlog-Item", async () => {
    const project = await createProject(app);
    const item = await createBacklogItem(app, project.id);

    await supertest(app.server).delete(`/api/backlog/${item.id}`).expect(204);
    await supertest(app.server).get(`/api/backlog/${item.id}`).expect(404);
  });
});
