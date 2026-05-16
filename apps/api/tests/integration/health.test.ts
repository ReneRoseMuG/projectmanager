/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der API-Health-Endpoint liefert einen kompakten Laufzeitstatus.
 *
 * Fehlerfälle:
 * - Keine fachlichen Fehlerfälle; der Endpoint ist ein additiver Erfolgscheck.
 *
 * Ziel:
 * Absichern, dass /api/health erreichbar ist und status sowie uptime ausliefert.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, type TestDb } from "../helpers/index.js";

describe("Health API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
  });

  it("GET /api/health liefert Status und Uptime", async () => {
    const res = await supertest(app.server).get("/api/health").expect(200);

    expect(res.body.status).toBe("ok");
    expect(res.body.uptime).toEqual(expect.any(Number));
  });
});
