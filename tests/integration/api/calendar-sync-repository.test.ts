/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL (createTestDb), echte Drizzle-Repositories, echte FK-/Unique-Constraints.
 *   Kein API-Layer nötig: geprüft wird die Persistenzschicht (AP-0.1) direkt.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temp-DB pro Suite (createTestDb), truncateAll vor jedem Test; Admin-User id=1 aus Seed.
 *
 * Abgedeckte Regeln:
 * - CRUD je Entität (calendar_connections, external_calendars, calendar_sync_states, event_mappings)
 * - Optimistisches Locking auf Verbindungen (version-Bump), upsert-Semantik (external_calendar, sync_state)
 * - Unique (connection, external_id) für external_calendars UND event_mappings
 * - Kaskadenlöschung Verbindung -> abhängige Sätze; lokaler Event -> event_mapping
 * - Query-Methoden mit Gegenbeispiel (fremde Verbindung/Owner ausgeschlossen)
 *
 * Fehlerfälle:
 * - Doppeltes Mapping (connection, external_id) wird abgewiesen (ER_DUP_ENTRY)
 * - Doppelter external_calendar (connection, external_id) wird abgewiesen
 * - update mit veralteter version wirft VersionConflictError
 *
 * Ziel:
 * Absicherung des Kalender-Sync-Datenmodells und seiner Repository-Schicht als Fundament für MS-79.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { calendarConnections, calendarSyncStates, eventMappings, externalCalendars } from "../../../apps/api/src/db/schema.js";
import { VersionConflictError } from "../../../apps/api/src/repositories/base.repository.js";
import {
  type CalendarConnectionRecord,
  calendarConnectionRepository,
  calendarSyncStateRepository,
  type CreateCalendarConnectionInput,
  type ExternalCalendarRecord,
  eventMappingRepository,
  externalCalendarRepository
} from "../../../apps/api/src/repositories/calendar.repository.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const ADMIN_ID = 1;

describe("Calendar-Sync Repositories (AP-0.1)", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    await testDb?.close();
  });

  async function insertEvent(title = "Termin"): Promise<number> {
    const [result] = await testDb.pool.execute(
      "INSERT INTO events (title, start_time, end_time, is_all_day, origin, `readonly`, reminder_minutes, version, created_at, updated_at) " +
        "VALUES (?, '2026-07-01T10:00:00', '2026-07-01T11:00:00', 0, 'local', 0, 60, 1, NOW(), NOW())",
      [title]
    );
    return (result as { insertId: number }).insertId;
  }

  async function makeConnection(overrides: Partial<CreateCalendarConnectionInput> = {}): Promise<CalendarConnectionRecord> {
    return calendarConnectionRepository.create(testDb.db, { userId: ADMIN_ID, provider: "nextcloud", displayName: "Test-Verbindung", ...overrides }, ADMIN_ID);
  }

  async function makeCalendar(connectionId: number, externalId = "cal-1"): Promise<ExternalCalendarRecord> {
    return externalCalendarRepository.create(testDb.db, { connectionId, externalId, name: "Kalender", readonly: true });
  }

  // -------------------------------------------------------------------------
  // calendar_connections
  // -------------------------------------------------------------------------
  describe("calendarConnectionRepository", () => {
    it("create + findById speichert alle Felder mit Default-Status und version 1", async () => {
      const created = await makeConnection({ provider: "google", displayName: "Mein Google", encryptedCredentials: "cipher" });
      const found = await calendarConnectionRepository.findById(testDb.db, created.id);

      expect(found).toBeDefined();
      expect(found?.provider).toBe("google");
      expect(found?.displayName).toBe("Mein Google");
      expect(found?.encryptedCredentials).toBe("cipher");
      expect(found?.status).toBe("active");
      expect(found?.version).toBe(1);
      expect(found?.createdBy).toBe(ADMIN_ID);
    });

    it("listByUser liefert nur die Verbindungen des Users (Gegenbeispiel: fremder User ausgeschlossen)", async () => {
      const [{ insertId: otherUserId }] = (await testDb.pool.execute(
        "INSERT INTO users (name, full_name, first_name, last_name, email, role_id, is_active, version, created_at, updated_at) " +
          "VALUES ('', 'Zwei, User', 'User', 'Zwei', 'user2@local', 3, 1, 1, NOW(), NOW())"
      )) as unknown as [{ insertId: number }];

      const own1 = await makeConnection({ displayName: "Eigen 1" });
      const own2 = await makeConnection({ displayName: "Eigen 2", provider: "google" });
      await calendarConnectionRepository.create(testDb.db, { userId: otherUserId, provider: "google", displayName: "Fremd" }, otherUserId);

      const own = await calendarConnectionRepository.listByUser(testDb.db, ADMIN_ID);
      expect(own.map((c) => c.id).sort()).toEqual([own1.id, own2.id].sort());
      expect(await calendarConnectionRepository.listAll(testDb.db)).toHaveLength(3);
    });

    it("update bumpt die version und ändert Felder", async () => {
      const conn = await makeConnection();
      const updated = await calendarConnectionRepository.update(testDb.db, conn.id, conn.version, { displayName: "Umbenannt", status: "error" }, ADMIN_ID);
      expect(updated?.displayName).toBe("Umbenannt");
      expect(updated?.status).toBe("error");
      expect(updated?.version).toBe(conn.version + 1);
    });

    it("update mit veralteter version wirft VersionConflictError", async () => {
      const conn = await makeConnection();
      await calendarConnectionRepository.update(testDb.db, conn.id, conn.version, { displayName: "Erste Änderung" }, ADMIN_ID);
      await expect(calendarConnectionRepository.update(testDb.db, conn.id, conn.version, { displayName: "Konflikt" }, ADMIN_ID)).rejects.toBeInstanceOf(VersionConflictError);
    });

    it("recordSyncResult setzt Status/lastSyncAt/lastError ohne version-Bump", async () => {
      const conn = await makeConnection();
      const after = await calendarConnectionRepository.recordSyncResult(testDb.db, conn.id, { status: "error", lastError: "boom" });
      expect(after?.status).toBe("error");
      expect(after?.lastError).toBe("boom");
      expect(after?.lastSyncAt).toBeTruthy();
      expect(after?.version).toBe(conn.version);
      // Gegenseite: expliziter lastSyncAt, kein lastError (-> null)
      const ok = await calendarConnectionRepository.recordSyncResult(testDb.db, conn.id, { status: "active", lastSyncAt: "2026-07-05T12:00:00.000Z" });
      expect(ok?.lastSyncAt).toBe("2026-07-05T12:00:00.000Z");
      expect(ok?.lastError).toBeNull();
    });

    it("setEncryptedCredentials überschreibt das Chiffrat", async () => {
      const conn = await makeConnection();
      const after = await calendarConnectionRepository.setEncryptedCredentials(testDb.db, conn.id, "neues-cipher");
      expect(after?.encryptedCredentials).toBe("neues-cipher");
    });

    it("delete entfernt die Verbindung", async () => {
      const conn = await makeConnection();
      expect(await calendarConnectionRepository.delete(testDb.db, conn.id)).toBe(1);
      expect(await calendarConnectionRepository.findById(testDb.db, conn.id)).toBeUndefined();
    });

    it("create/update ohne Actor setzen createdBy/updatedBy auf null", async () => {
      const conn = await calendarConnectionRepository.create(testDb.db, { userId: ADMIN_ID, provider: "google", displayName: "Ohne Actor" });
      expect(conn.createdBy).toBeNull();
      const updated = await calendarConnectionRepository.update(testDb.db, conn.id, conn.version, { displayName: "Neu" });
      expect(updated?.updatedBy).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // external_calendars
  // -------------------------------------------------------------------------
  describe("externalCalendarRepository", () => {
    it("upsert legt an und aktualisiert denselben Datensatz (gleiche id)", async () => {
      const conn = await makeConnection();
      const first = await externalCalendarRepository.upsert(testDb.db, { connectionId: conn.id, externalId: "href-1", name: "Alt", color: "#111" });
      const second = await externalCalendarRepository.upsert(testDb.db, { connectionId: conn.id, externalId: "href-1", name: "Neu", imported: true });

      expect(second.id).toBe(first.id);
      expect(second.name).toBe("Neu");
      expect(second.color).toBe("#111");
      expect(second.imported).toBe(true);
      // dritter upsert: setzt color+readonly, behält name+imported (Gegenseite der Merge-Fallbacks)
      const third = await externalCalendarRepository.upsert(testDb.db, { connectionId: conn.id, externalId: "href-1", color: "#222", readonly: true });
      expect(third.name).toBe("Neu");
      expect(third.color).toBe("#222");
      expect(third.readonly).toBe(true);
      expect(third.imported).toBe(true);
      expect(await externalCalendarRepository.listByConnection(testDb.db, conn.id)).toHaveLength(1);
    });

    it("doppeltes create mit gleicher (connection, external_id) wird abgewiesen", async () => {
      const conn = await makeConnection();
      await externalCalendarRepository.create(testDb.db, { connectionId: conn.id, externalId: "dup" });
      await expect(externalCalendarRepository.create(testDb.db, { connectionId: conn.id, externalId: "dup" })).rejects.toThrow();
    });

    it("gleiche external_id unter verschiedenen Verbindungen ist erlaubt", async () => {
      const connA = await makeConnection({ displayName: "A" });
      const connB = await makeConnection({ displayName: "B" });
      await externalCalendarRepository.create(testDb.db, { connectionId: connA.id, externalId: "same" });
      await expect(externalCalendarRepository.create(testDb.db, { connectionId: connB.id, externalId: "same" })).resolves.toBeDefined();
    });

    it("setImported schaltet das Flag", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      const after = await externalCalendarRepository.setImported(testDb.db, cal.id, true);
      expect(after?.imported).toBe(true);
    });

    it("delete entfernt den Kalender", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      expect(await externalCalendarRepository.delete(testDb.db, cal.id)).toBe(1);
      expect(await externalCalendarRepository.findById(testDb.db, cal.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // calendar_sync_states
  // -------------------------------------------------------------------------
  describe("calendarSyncStateRepository", () => {
    it("upsert legt Token an und aktualisiert ihn beim zweiten Aufruf", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      const first = await calendarSyncStateRepository.upsert(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, syncToken: "t1", ctag: "c1" });
      const second = await calendarSyncStateRepository.upsert(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, syncToken: "t2" });

      expect(second.id).toBe(first.id);
      expect(second.syncToken).toBe("t2");
      expect(second.ctag).toBe("c1");
      // dritter upsert: setzt ctag+lastSuccessAt, behält syncToken (Gegenseite der Merge-Fallbacks)
      const third = await calendarSyncStateRepository.upsert(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, ctag: "c2", lastSuccessAt: "2026-01-01T00:00:00.000Z" });
      expect(third.syncToken).toBe("t2");
      expect(third.ctag).toBe("c2");
      expect(third.lastSuccessAt).toBe("2026-01-01T00:00:00.000Z");
      const found = await calendarSyncStateRepository.findByCalendar(testDb.db, conn.id, cal.id);
      expect(found?.syncToken).toBe("t2");
    });

    it("listByConnection listet alle States, delete entfernt einen", async () => {
      const conn = await makeConnection();
      const calA = await makeCalendar(conn.id, "sa");
      const calB = await makeCalendar(conn.id, "sb");
      const stateA = await calendarSyncStateRepository.upsert(testDb.db, { connectionId: conn.id, externalCalendarId: calA.id, syncToken: "a" });
      await calendarSyncStateRepository.upsert(testDb.db, { connectionId: conn.id, externalCalendarId: calB.id, syncToken: "b" });
      expect(await calendarSyncStateRepository.listByConnection(testDb.db, conn.id)).toHaveLength(2);
      expect(await calendarSyncStateRepository.delete(testDb.db, stateA.id)).toBe(1);
      expect(await calendarSyncStateRepository.listByConnection(testDb.db, conn.id)).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // event_mappings
  // -------------------------------------------------------------------------
  describe("eventMappingRepository", () => {
    it("create + findByExternalId + findByLocalEvent", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      const eventId = await insertEvent();
      const mapping = await eventMappingRepository.create(testDb.db, {
        connectionId: conn.id,
        externalCalendarId: cal.id,
        localEventId: eventId,
        externalId: "ev-1",
        iCalUid: "uid-1",
        origin: "nextcloud"
      });

      expect(mapping.direction).toBe("import");
      expect((await eventMappingRepository.findByExternalId(testDb.db, conn.id, "ev-1"))?.id).toBe(mapping.id);
      expect((await eventMappingRepository.findByLocalEvent(testDb.db, eventId))?.id).toBe(mapping.id);
    });

    it("doppeltes Mapping (connection, external_id) wird abgewiesen", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      const eventA = await insertEvent("A");
      const eventB = await insertEvent("B");
      await eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, localEventId: eventA, externalId: "same-ext", origin: "google" });
      await expect(
        eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, localEventId: eventB, externalId: "same-ext", origin: "google" })
      ).rejects.toThrow();
    });

    it("listByExternalCalendar liefert nur Mappings des Kalenders (Gegenbeispiel: fremder Kalender ausgeschlossen)", async () => {
      const conn = await makeConnection();
      const calA = await makeCalendar(conn.id, "calA");
      const calB = await makeCalendar(conn.id, "calB");
      const eventA = await insertEvent("A");
      const eventB = await insertEvent("B");
      const inA = await eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: calA.id, localEventId: eventA, externalId: "a", origin: "google" });
      await eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: calB.id, localEventId: eventB, externalId: "b", origin: "google" });

      const listA = await eventMappingRepository.listByExternalCalendar(testDb.db, calA.id);
      expect(listA.map((m) => m.id)).toEqual([inA.id]);
    });

    it("update setzt etag und seenVersion", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      const eventId = await insertEvent();
      const mapping = await eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, localEventId: eventId, externalId: "e", origin: "local", direction: "both" });
      const after = await eventMappingRepository.update(testDb.db, mapping.id, { etag: "W/123", seenVersion: 5 });
      expect(after?.etag).toBe("W/123");
      expect(after?.seenVersion).toBe(5);
    });

    it("listByConnection listet alle Mappings, delete entfernt eines", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      const e1 = await insertEvent("1");
      const e2 = await insertEvent("2");
      const m1 = await eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, localEventId: e1, externalId: "lm1", origin: "google" });
      await eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, localEventId: e2, externalId: "lm2", origin: "google" });
      expect(await eventMappingRepository.listByConnection(testDb.db, conn.id)).toHaveLength(2);
      expect(await eventMappingRepository.delete(testDb.db, m1.id)).toBe(1);
      expect(await eventMappingRepository.listByConnection(testDb.db, conn.id)).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Kaskadenlöschung
  // -------------------------------------------------------------------------
  describe("Kaskadenlöschung", () => {
    it("Verbindung löschen entfernt external_calendars, sync_states und event_mappings — andere Verbindung unberührt", async () => {
      const connA = await makeConnection({ displayName: "A" });
      const connB = await makeConnection({ displayName: "B" });
      const calA = await makeCalendar(connA.id, "calA");
      const calB = await makeCalendar(connB.id, "calB");
      await calendarSyncStateRepository.upsert(testDb.db, { connectionId: connA.id, externalCalendarId: calA.id, syncToken: "tA" });
      await calendarSyncStateRepository.upsert(testDb.db, { connectionId: connB.id, externalCalendarId: calB.id, syncToken: "tB" });
      const eventA = await insertEvent("A");
      const eventB = await insertEvent("B");
      await eventMappingRepository.create(testDb.db, { connectionId: connA.id, externalCalendarId: calA.id, localEventId: eventA, externalId: "eA", origin: "nextcloud" });
      await eventMappingRepository.create(testDb.db, { connectionId: connB.id, externalCalendarId: calB.id, localEventId: eventB, externalId: "eB", origin: "nextcloud" });

      await calendarConnectionRepository.delete(testDb.db, connA.id);

      expect(await testDb.db.select().from(externalCalendars).where(eq(externalCalendars.connectionId, connA.id))).toHaveLength(0);
      expect(await testDb.db.select().from(calendarSyncStates).where(eq(calendarSyncStates.connectionId, connA.id))).toHaveLength(0);
      expect(await testDb.db.select().from(eventMappings).where(eq(eventMappings.connectionId, connA.id))).toHaveLength(0);
      // Gegenprobe: Verbindung B komplett erhalten
      expect(await testDb.db.select().from(externalCalendars).where(eq(externalCalendars.connectionId, connB.id))).toHaveLength(1);
      expect(await testDb.db.select().from(calendarSyncStates).where(eq(calendarSyncStates.connectionId, connB.id))).toHaveLength(1);
      expect(await testDb.db.select().from(eventMappings).where(eq(eventMappings.connectionId, connB.id))).toHaveLength(1);
      // lokale Events bleiben bestehen
      const [remaining] = await testDb.pool.query("SELECT id FROM events WHERE id IN (?, ?)", [eventA, eventB]);
      expect((remaining as unknown[]).length).toBe(2);
    });

    it("lokalen Event löschen entfernt sein event_mapping", async () => {
      const conn = await makeConnection();
      const cal = await makeCalendar(conn.id);
      const eventId = await insertEvent();
      const mapping = await eventMappingRepository.create(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, localEventId: eventId, externalId: "e", origin: "google", direction: "both" });
      expect(await eventMappingRepository.findById(testDb.db, mapping.id)).toBeDefined();

      await testDb.pool.execute("DELETE FROM events WHERE id = ?", [eventId]);

      expect(await eventMappingRepository.findById(testDb.db, mapping.id)).toBeUndefined();
    });

    it("User löschen entfernt seine Verbindungen (cascade user -> connection)", async () => {
      const [{ insertId: tempUserId }] = (await testDb.pool.execute(
        "INSERT INTO users (name, full_name, first_name, last_name, email, role_id, is_active, version, created_at, updated_at) " +
          "VALUES ('', 'Temp, User', 'User', 'Temp', 'temp@local', 3, 1, 1, NOW(), NOW())"
      )) as unknown as [{ insertId: number }];
      const conn = await calendarConnectionRepository.create(testDb.db, { userId: tempUserId, provider: "google", displayName: "Temp-Conn" }, tempUserId);

      await testDb.pool.execute("DELETE FROM users WHERE id = ?", [tempUserId]);

      expect(await calendarConnectionRepository.findById(testDb.db, conn.id)).toBeUndefined();
    });
  });

  it("persistiert alle optionalen Felder beim Anlegen (volle Parametrisierung)", async () => {
    const conn = await calendarConnectionRepository.create(
      testDb.db,
      { userId: ADMIN_ID, provider: "google", displayName: "Voll", status: "syncing", encryptedCredentials: "cipher" },
      ADMIN_ID
    );
    expect(conn.status).toBe("syncing");
    expect(conn.encryptedCredentials).toBe("cipher");

    const cal = await externalCalendarRepository.create(testDb.db, { connectionId: conn.id, externalId: "full", name: "N", color: "#abcdef", imported: true, readonly: false });
    expect(cal.color).toBe("#abcdef");
    expect(cal.imported).toBe(true);
    expect(cal.readonly).toBe(false);

    const state = await calendarSyncStateRepository.upsert(testDb.db, { connectionId: conn.id, externalCalendarId: cal.id, syncToken: "t", ctag: "c", lastSuccessAt: "2026-07-05T00:00:00.000Z" });
    expect(state.lastSuccessAt).toBe("2026-07-05T00:00:00.000Z");

    const eventId = await insertEvent();
    const mapping = await eventMappingRepository.create(testDb.db, {
      connectionId: conn.id,
      externalCalendarId: cal.id,
      localEventId: eventId,
      externalId: "fm",
      iCalUid: "uid",
      etag: "etag",
      seenVersion: 3,
      origin: "google",
      direction: "both"
    });
    expect(mapping.iCalUid).toBe("uid");
    expect(mapping.etag).toBe("etag");
    expect(mapping.seenVersion).toBe(3);
    expect(mapping.direction).toBe("both");
  });
});
