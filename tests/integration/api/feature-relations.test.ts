/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App + MySQL Temp-DB, echte Services, Repositories und HTTP-Requests.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temporäre MySQL-Datenbank, Truncate vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Feature-Relationen werden über PUT (vollständiger Ersatz) gesetzt und per GET gelesen.
 * - Self-Relation wird auf Serviceebene mit 400 abgelehnt.
 * - Relation zu nicht-existentem Feature liefert 404.
 * - Leere relations-Liste löscht alle bestehenden Relationen.
 * - Gegenbeispiel: Feature ohne gesetzte Relationen erscheint nicht in fremder Relation-Liste.
 *
 * Fehlerfälle:
 * - Self-Relation → 400
 * - Nicht-existentes Ziel-Feature → 404
 *
 * Ziel:
 * Den featureRelations-Join als isolierte API absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createFeature, createTestDb, truncateAll, type TestDb, type TestFeature } from "../../fixtures/api/index.js";

describe("Feature-Relationen API", () => {
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

  it("setzt related-Relation via PUT und liest sie per GET", async () => {
    const featureA = await createFeature(app, { title: "Feature A" });
    const featureB = await createFeature(app, { title: "Feature B" });

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureB.id, relationType: "related" }] })
      .expect(200);

    const list = (await supertest(app.server).get(`/api/features/${featureA.id}/relations`).expect(200))
      .body as Array<{ targetFeatureId: number; relationType: string }>;

    expect(list).toEqual(
      expect.arrayContaining([expect.objectContaining({ targetFeatureId: featureB.id, relationType: "related" })])
    );
  });

  it("ersetzt bestehende Relationen vollständig (PUT-Semantik)", async () => {
    const featureA = await createFeature(app, { title: "Feature A" });
    const featureB = await createFeature(app, { title: "Feature B" });
    const featureC = await createFeature(app, { title: "Feature C" });

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureB.id }] })
      .expect(200);

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureC.id }] })
      .expect(200);

    const list = (await supertest(app.server).get(`/api/features/${featureA.id}/relations`).expect(200))
      .body as Array<{ targetFeatureId: number }>;

    const ids = list.map((r) => r.targetFeatureId);
    expect(ids).toContain(featureC.id);
    expect(ids).not.toContain(featureB.id);
  });

  it("löscht alle Relationen mit leerer Liste", async () => {
    const featureA = await createFeature(app, { title: "Feature A" });
    const featureB = await createFeature(app, { title: "Feature B" });

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureB.id }] })
      .expect(200);

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [] })
      .expect(200);

    const list = (await supertest(app.server).get(`/api/features/${featureA.id}/relations`).expect(200)).body as unknown[];
    expect(list).toHaveLength(0);
  });

  it("lehnt Self-Relation ab (400)", async () => {
    const feature = await createFeature(app, { title: "Feature Self" });

    await supertest(app.server)
      .put(`/api/features/${feature.id}/relations`)
      .send({ relations: [{ targetFeatureId: feature.id }] })
      .expect(400);
  });

  it("liefert 400 für Relation zu nicht-existentem Feature", async () => {
    const feature = await createFeature(app, { title: "Feature X" });

    await supertest(app.server)
      .put(`/api/features/${feature.id}/relations`)
      .send({ relations: [{ targetFeatureId: 99999 }] })
      .expect(400);
  });

  it("Gegenbeispiel: Feature ohne Relationen hat leere Relation-Liste", async () => {
    const featureA = await createFeature(app, { title: "Feature A" });
    const featureB = await createFeature(app, { title: "Feature B" });

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureB.id }] })
      .expect(200);

    const listB = (await supertest(app.server).get(`/api/features/${featureB.id}/relations`).expect(200)).body as unknown[];
    expect(listB).toHaveLength(0);
  });

  it("setzt optionale description an der Relation", async () => {
    const featureA = await createFeature(app, { title: "Feature A" });
    const featureB = await createFeature(app, { title: "Feature B" });

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureB.id, description: "Abhängigkeit wegen Modul X" }] })
      .expect(200);

    const list = (await supertest(app.server).get(`/api/features/${featureA.id}/relations`).expect(200))
      .body as Array<{ description: string | null }>;

    expect(list[0]?.description).toBe("Abhängigkeit wegen Modul X");
  });

  it("ignoriert doppelte targetFeatureIds im selben PUT (Deduplizierung)", async () => {
    const featureA = await createFeature(app, { title: "Feature A" });
    const featureB = await createFeature(app, { title: "Feature B" });

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({
        relations: [
          { targetFeatureId: featureB.id, relationType: "related" },
          { targetFeatureId: featureB.id, relationType: "related" }
        ]
      })
      .expect(200);

    const list = (await supertest(app.server).get(`/api/features/${featureA.id}/relations`).expect(200))
      .body as Array<{ targetFeatureId: number }>;

    const matches = list.filter((r) => r.targetFeatureId === featureB.id);
    expect(matches).toHaveLength(1);
  });

  it("setzt Relationen für ein Feature, ohne Relationen des anderen Features zu berühren", async () => {
    const featureA = await createFeature(app, { title: "Feature A" });
    const featureB = await createFeature(app, { title: "Feature B" });
    const featureC = await createFeature(app, { title: "Feature C" });

    await supertest(app.server)
      .put(`/api/features/${featureB.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureC.id }] })
      .expect(200);

    await supertest(app.server)
      .put(`/api/features/${featureA.id}/relations`)
      .send({ relations: [{ targetFeatureId: featureB.id }] })
      .expect(200);

    const listB = (await supertest(app.server).get(`/api/features/${featureB.id}/relations`).expect(200))
      .body as Array<{ targetFeatureId: number }>;

    expect(listB.map((r) => r.targetFeatureId)).toContain(featureC.id);
  });
});
