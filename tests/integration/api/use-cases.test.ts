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
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createFeature, createTestDb, createUseCase, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Use Cases API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
  });

  it("POST erstellt Use Case mit DB-Content", async () => {
    const feature = await createFeature(app, { title: "Feature fuer Use Case" });

    const res = await supertest(app.server)
      .post(`/api/features/${feature.id}/use-cases`)
      .send({ title: "UC-01", content: "# UC-01" })
      .expect(201);

    expect(res.body.featureId).toBe(feature.id);
    expect(res.body).not.toHaveProperty("slug");
    expect(res.body).not.toHaveProperty("contentPath");
    const row = testDb.sqlite.prepare("SELECT content FROM use_cases WHERE id = ?").get(res.body.id) as { content: string };
    expect(row.content).toBe("# UC-01");
  });

  it("POST akzeptiert fehlende Beschreibung und Sortierung", async () => {
    const feature = await createFeature(app, { title: "Feature fuer Defaults" });

    const res = await supertest(app.server)
      .post(`/api/features/${feature.id}/use-cases`)
      .send({ title: "Use Case ohne optionale Felder", content: "# Inhalt" })
      .expect(201);

    expect(res.body).toMatchObject({ title: "Use Case ohne optionale Felder", description: null, sortOrder: 0, content: "# Inhalt" });
  });

  it("GET einzelner Use Case liefert Feature als Parent-Kontext", async () => {
    const feature = await createFeature(app, { title: "Parent Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Use Case mit Parent" });

    const res = await supertest(app.server).get(`/api/use-cases/${useCase.id}`).expect(200);

    expect(res.body.parentContexts).toEqual([
      { type: "feature", id: feature.id, label: "Parent Feature", origin: "direct" }
    ]);
  });

  it("GET Liste gibt Use Cases ohne Content zurück", async () => {
    const feature = await createFeature(app, { title: "Feature fuer Liste" });
    await createUseCase(app, feature.id, { title: "Listen-Use-Case", content: "# Liste" });

    const res = await supertest(app.server).get(`/api/features/${feature.id}/use-cases`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBeUndefined();
  });

  it("GET Liste liefert Support-Counter fuer Use Cases", async () => {
    const feature = await createFeature(app, { title: "Feature fuer Counter" });
    const countedUseCase = await createUseCase(app, feature.id, { title: "Mit Support" });
    const emptyUseCase = await createUseCase(app, feature.id, { title: "Ohne Support" });
    await supertest(app.server).post(`/api/use-cases/${countedUseCase.id}/comments`).send({ body: "Use Case comment" }).expect(201);

    const res = await supertest(app.server).get(`/api/features/${feature.id}/use-cases`).expect(200);
    const counted = res.body.find((useCase: { id: number }) => useCase.id === countedUseCase.id);
    const empty = res.body.find((useCase: { id: number }) => useCase.id === emptyUseCase.id);

    expect(counted).toMatchObject({ attachmentCount: 0, noteCount: 0, commentCount: 1 });
    expect(empty).toMatchObject({ attachmentCount: 0, noteCount: 0, commentCount: 0 });
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

    await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

    const row = testDb.sqlite.prepare("SELECT id FROM use_cases WHERE id = ?").get(useCase.id);
    expect(row).toBeUndefined();
    await supertest(app.server).get(`/api/use-cases/${useCase.id}`).expect(404);
  });

  it("PATCH mit neuem Titel behÃ¤lt Datei", async () => {
    const feature = await createFeature(app, { title: "Rename-Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Alter Use Case" });

    const res = await supertest(app.server).patch(`/api/use-cases/${useCase.id}`).send({ title: "Neuer Use Case", expectedVersion: useCase.version }).expect(200);

    expect(res.body).not.toHaveProperty("contentPath");
    const row = testDb.sqlite.prepare("SELECT content FROM use_cases WHERE id = ?").get(useCase.id) as { content: string };
    expect(row.content).toBe("# Test Use Case");
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

    await supertest(app.server).delete(`/api/use-cases/${useCase.id}`).expect(204);

    const row = testDb.sqlite.prepare("SELECT id FROM use_cases WHERE id = ?").get(useCase.id);
    expect(row).toBeUndefined();
    await supertest(app.server).get(`/api/use-cases/${useCase.id}`).expect(404);
  });

  it("GET und PATCH laden und speichern Content", async () => {
    const feature = await createFeature(app, { title: "Content-Feature" });
    const useCase = await createUseCase(app, feature.id, { title: "Content-Use-Case", content: "# Alt" });

    const detail = await supertest(app.server).get(`/api/use-cases/${useCase.id}`).expect(200);
    expect(detail.body.content).toBe("# Alt");

    const updated = await supertest(app.server).patch(`/api/use-cases/${useCase.id}`).send({ content: "# Neu", expectedVersion: useCase.version }).expect(200);
    expect(updated.body.content).toBe("# Neu");
    const row = testDb.sqlite.prepare("SELECT content FROM use_cases WHERE id = ?").get(useCase.id) as { content: string };
    expect(row.content).toBe("# Neu");
  });
});
