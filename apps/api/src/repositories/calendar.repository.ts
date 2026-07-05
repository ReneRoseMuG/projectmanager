import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { calendarConnections, calendarSyncJournal, calendarSyncStates, eventMappings, externalCalendars } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type CalendarConnectionRecord = typeof calendarConnections.$inferSelect;
export type ExternalCalendarRecord = typeof externalCalendars.$inferSelect;
export type CalendarSyncStateRecord = typeof calendarSyncStates.$inferSelect;
export type EventMappingRecord = typeof eventMappings.$inferSelect;

type CalendarConnectionInsert = typeof calendarConnections.$inferInsert;
type ExternalCalendarInsert = typeof externalCalendars.$inferInsert;
type CalendarSyncStateInsert = typeof calendarSyncStates.$inferInsert;
type EventMappingInsert = typeof eventMappings.$inferInsert;

export type CreateCalendarConnectionInput = Pick<CalendarConnectionInsert, "userId" | "provider" | "displayName"> &
  Partial<Pick<CalendarConnectionInsert, "encryptedCredentials" | "status">>;
export type UpdateCalendarConnectionInput = Partial<Pick<CalendarConnectionInsert, "displayName" | "status" | "encryptedCredentials">>;
export type RecordSyncResultInput = Pick<CalendarConnectionInsert, "status"> & Partial<Pick<CalendarConnectionInsert, "lastSyncAt" | "lastError">>;

export type UpsertExternalCalendarInput = Pick<ExternalCalendarInsert, "connectionId" | "externalId"> &
  Partial<Pick<ExternalCalendarInsert, "name" | "color" | "imported" | "readonly">>;

export type UpsertSyncStateInput = Pick<CalendarSyncStateInsert, "connectionId" | "externalCalendarId"> &
  Partial<Pick<CalendarSyncStateInsert, "syncToken" | "ctag" | "lastSuccessAt">>;

export type CreateEventMappingInput = Pick<EventMappingInsert, "connectionId" | "externalCalendarId" | "localEventId" | "externalId" | "origin"> &
  Partial<Pick<EventMappingInsert, "iCalUid" | "etag" | "seenVersion" | "direction">>;
export type UpdateEventMappingInput = Partial<Pick<EventMappingInsert, "externalId" | "iCalUid" | "etag" | "seenVersion" | "direction" | "externalCalendarId">>;

export type CalendarJournalRecord = typeof calendarSyncJournal.$inferSelect;
type CalendarJournalInsert = typeof calendarSyncJournal.$inferInsert;
export type CreateCalendarJournalInput = Pick<CalendarJournalInsert, "userId" | "connectionLabel" | "eventType"> &
  Partial<Pick<CalendarJournalInsert, "connectionId" | "message">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const calendarConnectionRepository = {
  async create(database: DbSession, input: CreateCalendarConnectionInput, actorUserId?: number): Promise<CalendarConnectionRecord> {
    const now = nowIso();
    const result = await database.insert(calendarConnections).values({
      userId: input.userId,
      provider: input.provider,
      displayName: input.displayName,
      encryptedCredentials: input.encryptedCredentials ?? null,
      status: input.status ?? "active",
      lastSyncAt: null,
      lastError: null,
      version: 1,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null,
      createdAt: now,
      updatedAt: now
    });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created calendar connection could not be loaded");
    }
    return created;
  },

  async findById(database: DbSession, id: number): Promise<CalendarConnectionRecord | undefined> {
    return firstRow(await database.select().from(calendarConnections).where(eq(calendarConnections.id, id)));
  },

  async listByUser(database: DbSession, userId: number): Promise<CalendarConnectionRecord[]> {
    return database.select().from(calendarConnections).where(eq(calendarConnections.userId, userId)).orderBy(asc(calendarConnections.id));
  },

  /** All connections across users — used by the sync scheduler (AP-4.1). */
  async listAll(database: DbSession): Promise<CalendarConnectionRecord[]> {
    return database.select().from(calendarConnections).orderBy(asc(calendarConnections.id));
  },

  /** User-driven edit with optimistic locking. */
  async update(
    database: DbSession,
    id: number,
    expectedVersion: number,
    values: UpdateCalendarConnectionInput,
    actorUserId?: number
  ): Promise<CalendarConnectionRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(calendarConnections)
      .set({
        ...values,
        version: current.version + 1,
        updatedBy: actorUserId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(calendarConnections.id, id));
    return this.findById(database, id);
  },

  /** System-driven status update from a sync run — not user-versioned. */
  async recordSyncResult(database: DbSession, id: number, result: RecordSyncResultInput): Promise<CalendarConnectionRecord | undefined> {
    await database
      .update(calendarConnections)
      .set({
        status: result.status,
        lastSyncAt: result.lastSyncAt ?? nowIso(),
        lastError: result.lastError ?? null,
        updatedAt: nowIso()
      })
      .where(eq(calendarConnections.id, id));
    return this.findById(database, id);
  },

  /** Store the ciphertext produced by the credential service (AP-0.2). */
  async setEncryptedCredentials(database: DbSession, id: number, encryptedCredentials: string | null): Promise<CalendarConnectionRecord | undefined> {
    await database.update(calendarConnections).set({ encryptedCredentials, updatedAt: nowIso() }).where(eq(calendarConnections.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(calendarConnections).where(eq(calendarConnections.id, id)));
  }
};

export const externalCalendarRepository = {
  async create(database: DbSession, input: UpsertExternalCalendarInput): Promise<ExternalCalendarRecord> {
    const now = nowIso();
    const result = await database.insert(externalCalendars).values({
      connectionId: input.connectionId,
      externalId: input.externalId,
      name: input.name ?? null,
      color: input.color ?? null,
      imported: input.imported ?? false,
      readonly: input.readonly ?? false,
      createdAt: now,
      updatedAt: now
    });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created external calendar could not be loaded");
    }
    return created;
  },

  async findById(database: DbSession, id: number): Promise<ExternalCalendarRecord | undefined> {
    return firstRow(await database.select().from(externalCalendars).where(eq(externalCalendars.id, id)));
  },

  async findByExternalId(database: DbSession, connectionId: number, externalId: string): Promise<ExternalCalendarRecord | undefined> {
    return firstRow(
      await database
        .select()
        .from(externalCalendars)
        .where(and(eq(externalCalendars.connectionId, connectionId), eq(externalCalendars.externalId, externalId)))
    );
  },

  async listByConnection(database: DbSession, connectionId: number): Promise<ExternalCalendarRecord[]> {
    return database.select().from(externalCalendars).where(eq(externalCalendars.connectionId, connectionId)).orderBy(asc(externalCalendars.id));
  },

  /** Speichert die Google-Push-Kanaldaten eines Zielkalenders (AP-4.2). */
  async setPushChannel(database: DbSession, id: number, input: { channelId: string; resourceId: string | null; expiration: string | null }): Promise<void> {
    await database
      .update(externalCalendars)
      .set({ pushChannelId: input.channelId, pushResourceId: input.resourceId, pushExpiration: input.expiration, updatedAt: nowIso() })
      .where(eq(externalCalendars.id, id));
  },

  /** Entfernt die Push-Kanaldaten (nach channels.stop bzw. beim Trennen). */
  async clearPushChannel(database: DbSession, id: number): Promise<void> {
    await database
      .update(externalCalendars)
      .set({ pushChannelId: null, pushResourceId: null, pushExpiration: null, updatedAt: nowIso() })
      .where(eq(externalCalendars.id, id));
  },

  /** Alle Zielkalender mit aktivem Push-Kanal (Basis für Renewal). */
  async listWithActivePushChannel(database: DbSession): Promise<ExternalCalendarRecord[]> {
    return database.select().from(externalCalendars).where(isNotNull(externalCalendars.pushChannelId)).orderBy(asc(externalCalendars.id));
  },

  /** Insert or update a discovered calendar keyed by (connectionId, externalId). */
  async upsert(database: DbSession, input: UpsertExternalCalendarInput): Promise<ExternalCalendarRecord> {
    const existing = await this.findByExternalId(database, input.connectionId, input.externalId);
    if (!existing) {
      return this.create(database, input);
    }
    await database
      .update(externalCalendars)
      .set({
        name: input.name ?? existing.name,
        color: input.color ?? existing.color,
        imported: input.imported ?? existing.imported,
        readonly: input.readonly ?? existing.readonly,
        updatedAt: nowIso()
      })
      .where(eq(externalCalendars.id, existing.id));
    const updated = await this.findById(database, existing.id);
    if (!updated) {
      throw new Error("Updated external calendar could not be loaded");
    }
    return updated;
  },

  async setImported(database: DbSession, id: number, imported: boolean): Promise<ExternalCalendarRecord | undefined> {
    await database.update(externalCalendars).set({ imported, updatedAt: nowIso() }).where(eq(externalCalendars.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(externalCalendars).where(eq(externalCalendars.id, id)));
  }
};

export const calendarSyncStateRepository = {
  async findByCalendar(database: DbSession, connectionId: number, externalCalendarId: number): Promise<CalendarSyncStateRecord | undefined> {
    return firstRow(
      await database
        .select()
        .from(calendarSyncStates)
        .where(and(eq(calendarSyncStates.connectionId, connectionId), eq(calendarSyncStates.externalCalendarId, externalCalendarId)))
    );
  },

  async listByConnection(database: DbSession, connectionId: number): Promise<CalendarSyncStateRecord[]> {
    return database.select().from(calendarSyncStates).where(eq(calendarSyncStates.connectionId, connectionId)).orderBy(asc(calendarSyncStates.id));
  },

  /** Insert or update the sync token/ctag for a (connection, calendar) pair. */
  async upsert(database: DbSession, input: UpsertSyncStateInput): Promise<CalendarSyncStateRecord> {
    const existing = await this.findByCalendar(database, input.connectionId, input.externalCalendarId);
    const now = nowIso();
    if (!existing) {
      const result = await database.insert(calendarSyncStates).values({
        connectionId: input.connectionId,
        externalCalendarId: input.externalCalendarId,
        syncToken: input.syncToken ?? null,
        ctag: input.ctag ?? null,
        lastSuccessAt: input.lastSuccessAt ?? null,
        createdAt: now,
        updatedAt: now
      });
      const created = await this.findByIdInternal(database, insertId(result));
      if (!created) {
        throw new Error("Created calendar sync state could not be loaded");
      }
      return created;
    }
    await database
      .update(calendarSyncStates)
      .set({
        syncToken: input.syncToken ?? existing.syncToken,
        ctag: input.ctag ?? existing.ctag,
        lastSuccessAt: input.lastSuccessAt ?? existing.lastSuccessAt,
        updatedAt: now
      })
      .where(eq(calendarSyncStates.id, existing.id));
    const updated = await this.findByIdInternal(database, existing.id);
    if (!updated) {
      throw new Error("Updated calendar sync state could not be loaded");
    }
    return updated;
  },

  async findByIdInternal(database: DbSession, id: number): Promise<CalendarSyncStateRecord | undefined> {
    return firstRow(await database.select().from(calendarSyncStates).where(eq(calendarSyncStates.id, id)));
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(calendarSyncStates).where(eq(calendarSyncStates.id, id)));
  }
};

export const eventMappingRepository = {
  async create(database: DbSession, input: CreateEventMappingInput): Promise<EventMappingRecord> {
    const now = nowIso();
    const result = await database.insert(eventMappings).values({
      connectionId: input.connectionId,
      externalCalendarId: input.externalCalendarId,
      localEventId: input.localEventId,
      externalId: input.externalId,
      iCalUid: input.iCalUid ?? null,
      etag: input.etag ?? null,
      seenVersion: input.seenVersion ?? null,
      origin: input.origin,
      direction: input.direction ?? "import",
      createdAt: now,
      updatedAt: now
    });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created event mapping could not be loaded");
    }
    return created;
  },

  async findById(database: DbSession, id: number): Promise<EventMappingRecord | undefined> {
    return firstRow(await database.select().from(eventMappings).where(eq(eventMappings.id, id)));
  },

  async findByExternalId(database: DbSession, connectionId: number, externalId: string): Promise<EventMappingRecord | undefined> {
    return firstRow(
      await database
        .select()
        .from(eventMappings)
        .where(and(eq(eventMappings.connectionId, connectionId), eq(eventMappings.externalId, externalId)))
    );
  },

  async findByLocalEvent(database: DbSession, localEventId: number): Promise<EventMappingRecord | undefined> {
    return firstRow(await database.select().from(eventMappings).where(eq(eventMappings.localEventId, localEventId)));
  },

  async listByConnection(database: DbSession, connectionId: number): Promise<EventMappingRecord[]> {
    return database.select().from(eventMappings).where(eq(eventMappings.connectionId, connectionId)).orderBy(asc(eventMappings.id));
  },

  async listByExternalCalendar(database: DbSession, externalCalendarId: number): Promise<EventMappingRecord[]> {
    return database.select().from(eventMappings).where(eq(eventMappings.externalCalendarId, externalCalendarId)).orderBy(asc(eventMappings.id));
  },

  async update(database: DbSession, id: number, values: UpdateEventMappingInput): Promise<EventMappingRecord | undefined> {
    await database.update(eventMappings).set({ ...values, updatedAt: nowIso() }).where(eq(eventMappings.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(eventMappings).where(eq(eventMappings.id, id)));
  }
};

export const calendarSyncJournalRepository = {
  async create(database: DbSession, input: CreateCalendarJournalInput): Promise<CalendarJournalRecord> {
    const result = await database.insert(calendarSyncJournal).values({
      userId: input.userId,
      connectionId: input.connectionId ?? null,
      connectionLabel: input.connectionLabel,
      eventType: input.eventType,
      message: input.message ?? null,
      createdAt: nowIso()
    });
    const created = firstRow(await database.select().from(calendarSyncJournal).where(eq(calendarSyncJournal.id, insertId(result))));
    if (!created) {
      throw new Error("Created calendar journal entry could not be loaded");
    }
    return created;
  },

  async listByUser(database: DbSession, userId: number, limit = 100): Promise<CalendarJournalRecord[]> {
    return database.select().from(calendarSyncJournal).where(eq(calendarSyncJournal.userId, userId)).orderBy(desc(calendarSyncJournal.id)).limit(limit);
  },

  async listByConnection(database: DbSession, connectionId: number, limit = 100): Promise<CalendarJournalRecord[]> {
    return database.select().from(calendarSyncJournal).where(eq(calendarSyncJournal.connectionId, connectionId)).orderBy(desc(calendarSyncJournal.id)).limit(limit);
  }
};
