import type { JournalContextRelation, JournalObjectType, JournalOperation, JsonValue } from "@taskmanager/shared-types";
import { and, desc, eq, gte, inArray, like, lt, lte, or, sql } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { insertId } from "../db/query-utils.js";
import { journalEntries, journalEntryChanges, journalEntryContexts } from "../db/schema.js";

export type JournalEntryRecord = typeof journalEntries.$inferSelect;
export type JournalChangeRecord = typeof journalEntryChanges.$inferSelect;
export type JournalContextRecord = typeof journalEntryContexts.$inferSelect;

export interface JournalActorRecord {
  actorUserId: number | null;
  actorName: string;
}

export interface JournalChangeCreateData {
  fieldKey: string;
  fieldLabel: string;
  oldValue: JsonValue;
  oldValueLabel: string | null;
  newValue: JsonValue;
  newValueLabel: string | null;
  summary: string;
}

export interface JournalContextCreateData {
  objectType: JournalObjectType;
  objectId: number;
  objectLabel: string;
  relation: JournalContextRelation;
}

export interface JournalEntryCreateData extends JournalActorRecord {
  operation: JournalOperation;
  objectType: JournalObjectType;
  objectId: number;
  objectLabel: string;
  summary: string;
  changes: JournalChangeCreateData[];
  contexts: JournalContextCreateData[];
}

export interface JournalEntryFilters {
  limit: number;
  cursor?: number;
  q?: string;
  operation?: JournalOperation;
  objectType?: JournalObjectType;
  objectId?: number;
  actorUserId?: number;
  from?: string;
  to?: string;
}

function stringifyJsonValue(value: JsonValue): string {
  return JSON.stringify(value);
}

export const journalRepository = {
  async create(database: DbSession, data: JournalEntryCreateData): Promise<JournalEntryRecord> {
    const createdAt = new Date().toISOString();
    const result = await database
      .insert(journalEntries)
      .values({
        operation: data.operation,
        objectType: data.objectType,
        objectId: data.objectId,
        objectLabel: data.objectLabel,
        summary: data.summary,
        actorUserId: data.actorUserId,
        actorName: data.actorName,
        createdAt
      });
    const id = insertId(result);

    if (data.changes.length > 0) {
      await database.insert(journalEntryChanges).values(
        data.changes.map((change) => ({
          journalEntryId: id,
          fieldKey: change.fieldKey,
          fieldLabel: change.fieldLabel,
          oldValueJson: stringifyJsonValue(change.oldValue),
          oldValueLabel: change.oldValueLabel,
          newValueJson: stringifyJsonValue(change.newValue),
          newValueLabel: change.newValueLabel,
          summary: change.summary
        }))
      );
    }

    if (data.contexts.length > 0) {
      await database
        .insert(journalEntryContexts)
        .ignore()
        .values(
          data.contexts.map((context) => ({
            journalEntryId: id,
            objectType: context.objectType,
            objectId: context.objectId,
            objectLabel: context.objectLabel,
            relation: context.relation
          }))
        );
    }

    return {
      id,
      operation: data.operation,
      objectType: data.objectType,
      objectId: data.objectId,
      objectLabel: data.objectLabel,
      summary: data.summary,
      actorUserId: data.actorUserId,
      actorName: data.actorName,
      createdAt
    };
  },

  async list(database: DbSession, filters: JournalEntryFilters): Promise<JournalEntryRecord[]> {
    const conditions = [];
    if (filters.cursor !== undefined) {
      conditions.push(lt(journalEntries.id, filters.cursor));
    }
    if (filters.operation !== undefined) {
      conditions.push(eq(journalEntries.operation, filters.operation));
    }
    if (filters.actorUserId !== undefined) {
      conditions.push(eq(journalEntries.actorUserId, filters.actorUserId));
    }
    if (filters.from !== undefined) {
      conditions.push(gte(journalEntries.createdAt, filters.from));
    }
    if (filters.to !== undefined) {
      conditions.push(lte(journalEntries.createdAt, filters.to));
    }
    if (filters.q !== undefined && filters.q.trim() !== "") {
      const pattern = `%${filters.q.trim()}%`;
      conditions.push(or(like(journalEntries.summary, pattern), like(journalEntries.objectLabel, pattern), like(journalEntries.actorName, pattern)));
    }

    if (filters.objectType !== undefined && filters.objectId !== undefined) {
      return database
        .select({
          id: journalEntries.id,
          operation: journalEntries.operation,
          objectType: journalEntries.objectType,
          objectId: journalEntries.objectId,
          objectLabel: journalEntries.objectLabel,
          summary: journalEntries.summary,
          actorUserId: journalEntries.actorUserId,
          actorName: journalEntries.actorName,
          createdAt: journalEntries.createdAt
        })
        .from(journalEntries)
        .innerJoin(journalEntryContexts, eq(journalEntries.id, journalEntryContexts.journalEntryId))
        .where(and(...conditions, eq(journalEntryContexts.objectType, filters.objectType), eq(journalEntryContexts.objectId, filters.objectId)))
        .groupBy(journalEntries.id)
        .orderBy(desc(journalEntries.id))
        .limit(filters.limit);
    }

    if (filters.objectType !== undefined) {
      conditions.push(eq(journalEntries.objectType, filters.objectType));
    }

    return database
      .select()
      .from(journalEntries)
      .where(conditions.length > 0 ? and(...conditions) : sql`1 = 1`)
      .orderBy(desc(journalEntries.id))
      .limit(filters.limit);
  },

  async listChanges(database: DbSession, journalEntryIds: number[]): Promise<JournalChangeRecord[]> {
    if (journalEntryIds.length === 0) {
      return [];
    }
    return database.select().from(journalEntryChanges).where(inArray(journalEntryChanges.journalEntryId, journalEntryIds)).orderBy(journalEntryChanges.id);
  },

  async listContexts(database: DbSession, journalEntryIds: number[]): Promise<JournalContextRecord[]> {
    if (journalEntryIds.length === 0) {
      return [];
    }
    return database.select().from(journalEntryContexts).where(inArray(journalEntryContexts.journalEntryId, journalEntryIds)).orderBy(journalEntryContexts.id);
  }
};

