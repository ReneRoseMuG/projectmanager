import { and, asc, eq, ne } from "drizzle-orm";
import type { CatalogKind } from "@taskmanager/shared-types";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { catalogEntries } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type CatalogEntryRecord = typeof catalogEntries.$inferSelect;
export type CatalogEntryCreateData = Omit<typeof catalogEntries.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type CatalogEntryUpdateData = Partial<Pick<CatalogEntryCreateData, "label" | "sortOrder" | "isClosed" | "color">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const catalogRepository = {
  async findAll(database: DbSession): Promise<CatalogEntryRecord[]> {
    return database.select().from(catalogEntries).orderBy(catalogEntries.kind, catalogEntries.sortOrder, catalogEntries.label);
  },

  async findByKind(database: DbSession, kind: CatalogKind): Promise<CatalogEntryRecord[]> {
    return database.select().from(catalogEntries).where(eq(catalogEntries.kind, kind)).orderBy(asc(catalogEntries.sortOrder), asc(catalogEntries.label));
  },

  async findById(database: DbSession, id: number): Promise<CatalogEntryRecord | undefined> {
    return firstRow(await database.select().from(catalogEntries).where(eq(catalogEntries.id, id)));
  },

  async findByKindAndKey(database: DbSession, kind: CatalogKind, key: string): Promise<CatalogEntryRecord | undefined> {
    return firstRow(await database.select().from(catalogEntries).where(and(eq(catalogEntries.kind, kind), eq(catalogEntries.key, key))));
  },

  async findLowestByKind(database: DbSession, kind: CatalogKind, excludedId?: number): Promise<CatalogEntryRecord | undefined> {
    const condition = excludedId === undefined ? eq(catalogEntries.kind, kind) : and(eq(catalogEntries.kind, kind), ne(catalogEntries.id, excludedId));
    return firstRow(await database.select().from(catalogEntries).where(condition).orderBy(asc(catalogEntries.sortOrder), asc(catalogEntries.label)));
  },

  async create(database: DbSession, data: CatalogEntryCreateData, userId?: number): Promise<CatalogEntryRecord> {
    const now = nowIso();
    const result = await database
      .insert(catalogEntries)
      .values({
        ...data,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created catalog entry could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: CatalogEntryUpdateData, userId?: number): Promise<CatalogEntryRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(catalogEntries)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(catalogEntries.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(catalogEntries).where(eq(catalogEntries.id, id)));
  }
};
