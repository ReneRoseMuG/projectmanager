/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Use Cases werden unter Features angelegt und verwalten eigene Markdown-Dateien.
 * - Feature-Löschung entfernt Use Cases und deren Dateien.
 * - Content-Pfade sind ID-basiert.
 *
 * Fehlerfälle:
 * - Use Case zu unbekanntem Feature liefert 404.
 * - Use Case zu unbekanntem Feature liefert 404.
 *
 * Ziel:
 * Use-Case-API und Dateisystem-Cleanup isoliert absichern.
 */

import type { FastifyInstance } from "fastify";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resolveStoredContentPath, setContentBaseDir } from "../../../apps/api/src/services/content.service.js";
import { buildTestApp, createFeature, createTestDb, createUseCase, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Use Cases API", () => {
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

  it("POST erstellt Use Case und Markdown-Datei", async () => {
    const feature = await createFeature(app, { title: "Feature fuer Use Case" });

    const res = await supertest(app.server)
      .post(`/api/features/${feature.id}/use-cases`)
      .send({ title: "UC-01", content: "# UC-01" })
      .expect(201);

    expect(res.body.featureId).toBe(feature.id);
    expect(res.body).not.toHaveProperty("slug");
    expect(res.body.contentPath).toMatch(/content\/usecases\/usecase-\d+\.md/);
    expect(fs.readFileSync(resolveStoredContentPath(res.body.contentPath), "utf8")).toBe("# UC-01");
  });

  it("GET Liste gibt Use Cases ohne Content zurück", async () => {
    const feature = await createFeature(app, { title: "Feature fuer Liste" });
    await createUseCase(app, feature.id, { title: "Listen-Use-Case", content: "# Liste" });

    const res = await supertest(app.server).get(`/api/features/${feature.id}/use-cases`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBeUndefined();
  });

  it("Use Case zu unbekanntem Feature liefert 404", async () => {
    await supertest(app.server).post("/api/features/9999/use-cases").send({ title: "UC" }).expect(404);
  });

  it("GET unbekannter Use Case liefert 404", async () => {
    await supertest(app.server).get("/api/use-cases/9999").expect(404);
  });

  it("Feature-DELETE entfernt Use Cases per Cascade und Dateien per Service-Logik", async () => {
    const feature = await createFeature(app, { title: "Cascade-Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Cascade-Use-Case" });
    const useCasePath = resolveStoredContentPath(useCase.contentPath ?? "");

    await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

    expect(fs.existsSync(useCasePath)).toBe(false);
    await supertest(app.server).get(`/api/use-cases/${useCase.id}`).expect(404);
  });

  it("PATCH mit neuem Titel behÃ¤lt Datei", async () => {
    const feature = await createFeature(app, { title: "Rename-Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Alter Use Case" });
    const oldPath = resolveStoredContentPath(useCase.contentPath ?? "");

    const res = await supertest(app.server).patch(`/api/use-cases/${useCase.id}`).send({ title: "Neuer Use Case", expectedVersion: useCase.version }).expect(200);

    expect(res.body.contentPath).toBe(useCase.contentPath);
    expect(fs.existsSync(oldPath)).toBe(true);
    expect(fs.existsSync(resolveStoredContentPath(res.body.contentPath))).toBe(true);
  });

  it("PATCH aktualisiert Metadaten", async () => {
    const feature = await createFeature(app, { title: "Meta-Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Meta-Use-Case" });

    const res = await supertest(app.server)
      .patch(`/api/use-cases/${useCase.id}`)
      .send({ title: "UC neu", status: "active", description: "Kurz", sortOrder: 3, expectedVersion: useCase.version })
      .expect(200);

    expect(res.body).toMatchObject({ title: "UC neu", status: "active", description: "Kurz", sortOrder: 3 });
  });

  it("DELETE entfernt Use Case und Datei", async () => {
    const feature = await createFeature(app, { title: "Delete-Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Delete-Use-Case" });
    const contentPath = resolveStoredContentPath(useCase.contentPath ?? "");

    await supertest(app.server).delete(`/api/use-cases/${useCase.id}`).expect(204);

    expect(fs.existsSync(contentPath)).toBe(false);
    await supertest(app.server).get(`/api/use-cases/${useCase.id}`).expect(404);
  });

  it("GET und PATCH laden und speichern Content", async () => {
    const feature = await createFeature(app, { title: "Content-Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Content-Use-Case", content: "# Alt" });

    const detail = await supertest(app.server).get(`/api/use-cases/${useCase.id}`).expect(200);
    expect(detail.body.content).toBe("# Alt");

    const updated = await supertest(app.server).patch(`/api/use-cases/${useCase.id}`).send({ content: "# Neu", expectedVersion: useCase.version }).expect(200);
    expect(updated.body.content).toBe("# Neu");
    expect(fs.readFileSync(resolveStoredContentPath(updated.body.contentPath), "utf8")).toBe("# Neu");
  });
});
