import { and, asc, eq, ne } from "drizzle-orm";
import type { CatalogKind } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { catalogEntries } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type CatalogEntryRecord = typeof catalogEntries.$inferSelect;
export type CatalogEntryCreateData = Omit<typeof catalogEntries.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type CatalogEntryUpdateData = Partial<Pick<CatalogEntryCreateData, "label" | "sortOrder" | "isClosed">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const catalogRepository = {
  findAll(database: DbClient): CatalogEntryRecord[] {
    return database.select().from(catalogEntries).orderBy(catalogEntries.kind, catalogEntries.sortOrder, catalogEntries.label).all();
  },

  findByKind(database: DbClient, kind: CatalogKind): CatalogEntryRecord[] {
    return database.select().from(catalogEntries).where(eq(catalogEntries.kind, kind)).orderBy(asc(catalogEntries.sortOrder), asc(catalogEntries.label)).all();
  },

  findById(database: DbClient, id: number): CatalogEntryRecord | undefined {
    return database.select().from(catalogEntries).where(eq(catalogEntries.id, id)).get();
  },

  findByKindAndKey(database: DbClient, kind: CatalogKind, key: string): CatalogEntryRecord | undefined {
    return database.select().from(catalogEntries).where(and(eq(catalogEntries.kind, kind), eq(catalogEntries.key, key))).get();
  },

  findLowestByKind(database: DbClient, kind: CatalogKind, excludedId?: number): CatalogEntryRecord | undefined {
    const condition = excludedId === undefined ? eq(catalogEntries.kind, kind) : and(eq(catalogEntries.kind, kind), ne(catalogEntries.id, excludedId));
    return database.select().from(catalogEntries).where(condition).orderBy(asc(catalogEntries.sortOrder), asc(catalogEntries.label)).get();
  },

  create(database: DbClient, data: CatalogEntryCreateData, userId?: number): CatalogEntryRecord {
    const now = nowIso();
    return database
      .insert(catalogEntries)
      .values({
        ...data,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
  },

  update(database: DbClient, id: number, expectedVersion: number, data: CatalogEntryUpdateData, userId?: number): CatalogEntryRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(catalogEntries)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(catalogEntries.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(catalogEntries).where(eq(catalogEntries.id, id)).run().changes;
  }
};
