/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App (buildTestApp), echte Test-MySQL, echter Events-Service.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Importierte (readonly) Termine sind serverseitig schreibgeschützt (PATCH/DELETE -> 403)
 * - Die Event-Antwort trägt origin + readonly, sodass das Frontend die Herkunft erkennt
 *
 * Fehlerfälle:
 * - Direkter Schreib-/Löschversuch auf readonly-Termin wird abgewiesen
 *
 * Gegenbeispiel:
 * - Lokale Termine (origin=local, readonly=false) bleiben voll bearbeit-/löschbar
 *
 * Ziel:
 * Absicherung der Read-only-Sperre importierter Kalender-Termine (defense in depth).
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Kalender Read-only-Sperre (AP-1.4)", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });
  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });
  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  async function createReadonlyEvent(): Promise<number> {
    const [result] = await testDb.pool.execute(
      "INSERT INTO events (title, start_time, end_time, is_all_day, origin, `readonly`, reminder_minutes, version, created_at, updated_at) " +
        "VALUES ('Importiert', '2026-07-01T10:00:00', '2026-07-01T11:00:00', 0, 'nextcloud', 1, 60, 1, NOW(), NOW())"
    );
    return (result as { insertId: number }).insertId;
  }

  it("weist PATCH auf einen importierten Termin ab (403)", async () => {
    const id = await createReadonlyEvent();
    await supertest(app.server).patch(`/api/events/${id}`).send({ title: "Neu", expectedVersion: 1 }).expect(403);
  });

  it("weist DELETE auf einen importierten Termin ab (403)", async () => {
    const id = await createReadonlyEvent();
    await supertest(app.server).delete(`/api/events/${id}`).expect(403);
  });

  it("liefert origin und readonly in der Event-Antwort", async () => {
    const id = await createReadonlyEvent();
    const res = await supertest(app.server).get(`/api/events/${id}`).expect(200);
    expect(res.body.origin).toBe("nextcloud");
    expect(res.body.readonly).toBe(true);
  });

  it("erlaubt Bearbeiten und Löschen lokaler Termine (Gegenbeispiel)", async () => {
    const created = await supertest(app.server)
      .post("/api/events")
      .send({ title: "Lokal", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00", isAllDay: false })
      .expect(201);
    expect(created.body.origin).toBe("local");
    expect(created.body.readonly).toBe(false);

    await supertest(app.server).patch(`/api/events/${created.body.id}`).send({ title: "Geändert", expectedVersion: created.body.version }).expect(200);
    await supertest(app.server).delete(`/api/events/${created.body.id}`).expect(204);
  });
});
