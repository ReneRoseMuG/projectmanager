/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Verbindungs-Repository, echter Sync-Dispatcher. Der provider-spezifische
 *   Handler wird für den Test registriert (er ist der reguläre Erweiterungspunkt, kein Mock des SUT).
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks. Der Test-Handler ist die vorgesehene Registrierung eines Providers.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll + clearCalendarSyncHandlers vor jedem Test, Scheduler-Stop danach.
 *
 * Abgedeckte Regeln (AP-4.1):
 * - Ein Tick synchronisiert alle Verbindungen; ein Fehler je Verbindung isoliert (Status je Verbindung persistiert)
 * - Verbindung ohne registrierten Handler wird als Fehler geführt, blockiert die anderen nicht
 * - Leere Verbindungsliste läuft ohne Fehler
 * - Timer feuert den Sync; Start/Stop ist idempotent
 *
 * Fehlerfälle:
 * - Handler wirft → Verbindung "error" + lastError, übrige laufen weiter
 *
 * Ziel:
 * Absicherung des periodischen Sync-Schedulers.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { calendarConnectionRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { clearCalendarSyncHandlers, registerCalendarSyncHandler } from "../../../apps/api/src/services/calendar-sync.service.js";
import { isCalendarSyncSchedulerRunning, runScheduledSync, startCalendarSyncScheduler, stopCalendarSyncScheduler } from "../../../apps/api/src/services/calendar-scheduler.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Sync-Scheduler (AP-4.1)", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });
  beforeEach(async () => {
    await truncateAll(testDb.pool);
    clearCalendarSyncHandlers();
  });
  afterEach(() => {
    stopCalendarSyncScheduler();
  });
  afterAll(async () => {
    await testDb?.close();
  });

  it("synchronisiert alle Verbindungen und isoliert einen Fehler je Verbindung", async () => {
    const synced: number[] = [];
    registerCalendarSyncHandler("google", async (_database, connection) => {
      if (connection.displayName === "FAIL") {
        throw new Error("Handler kaputt");
      }
      synced.push(connection.id);
    });
    const ok = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "google", displayName: "OK" }, 1);
    const fail = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "google", displayName: "FAIL" }, 1);

    const result = await runScheduledSync(testDb.db);
    expect(result).toEqual({ processed: 2, synced: 1, failed: 1 });
    expect(synced).toEqual([ok.id]);

    const okReloaded = await calendarConnectionRepository.findById(testDb.db, ok.id);
    expect(okReloaded?.status).toBe("active");
    const failReloaded = await calendarConnectionRepository.findById(testDb.db, fail.id);
    expect(failReloaded?.status).toBe("error");
    expect(failReloaded?.lastError).toContain("Handler kaputt");
  });

  it("führt eine Verbindung ohne registrierten Handler als Fehler, ohne die anderen zu blockieren", async () => {
    const synced: number[] = [];
    registerCalendarSyncHandler("nextcloud", async (_database, connection) => {
      synced.push(connection.id);
    });
    const withHandler = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "nextcloud", displayName: "NC" }, 1);
    await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "google", displayName: "G-ohne-Handler" }, 1);

    const result = await runScheduledSync(testDb.db);
    expect(result).toEqual({ processed: 2, synced: 1, failed: 1 });
    expect(synced).toEqual([withHandler.id]);
  });

  it("verarbeitet eine leere Verbindungsliste ohne Fehler", async () => {
    const result = await runScheduledSync(testDb.db);
    expect(result).toEqual({ processed: 0, synced: 0, failed: 0 });
  });

  it("startet und stoppt den Scheduler idempotent", () => {
    expect(isCalendarSyncSchedulerRunning()).toBe(false);
    startCalendarSyncScheduler(testDb.db, 60_000);
    expect(isCalendarSyncSchedulerRunning()).toBe(true);
    startCalendarSyncScheduler(testDb.db, 60_000);
    expect(isCalendarSyncSchedulerRunning()).toBe(true);
    stopCalendarSyncScheduler();
    expect(isCalendarSyncSchedulerRunning()).toBe(false);
  });

  it("führt den Sync bei einem Timer-Tick tatsächlich aus", async () => {
    let ticks = 0;
    registerCalendarSyncHandler("google", async () => {
      ticks += 1;
    });
    await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "google", displayName: "T" }, 1);

    startCalendarSyncScheduler(testDb.db, 10);
    await new Promise((resolve) => setTimeout(resolve, 60));
    stopCalendarSyncScheduler();

    expect(ticks).toBeGreaterThanOrEqual(1);
  });
});
