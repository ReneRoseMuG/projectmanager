import { eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { notes } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type NoteRecord = typeof notes.$inferSelect;
export type NoteCreateData = Omit<typeof notes.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type NoteUpdateData = Partial<Pick<NoteCreateData, "title" | "contentJson">>;

function nowIso(): string {
  return new Date().toISOString();
}

// Baut die WHERE-Bedingung für die Volltextsuche der Notizen-Hauptliste. Bildet exakt die
// clientseitige Suche nach (Titel ODER Inhalt): `title LIKE %q%` ODER `content_json LIKE %q%`.
// Der Inhalt wird gegen den gespeicherten JSON/HTML-String geprüft; das deckt den sichtbaren
// Text ab (HTML-Tags stören LIKE-Treffer in der Praxis nicht). `undefined` = kein Filter.
function noteSearchCondition(q: string | undefined): SQL | undefined {
  const trimmed = q?.trim();
  if (!trimmed) {
    return undefined;
  }
  const pattern = `%${trimmed}%`;
  return or(like(notes.title, pattern), like(notes.contentJson, pattern));
}

export interface NotePageParams {
  q?: string;
  page: number;
  pageSize: number;
}

export const noteRepository = {
  async findById(database: DbSession, id: number): Promise<NoteRecord | undefined> {
    return firstRow(await database.select().from(notes).where(eq(notes.id, id)));
  },

  // Zählt die Notizen nach Suchfilter (VOR Pagination) — Basis für `total`.
  async countForSearch(database: DbSession, q: string | undefined): Promise<number> {
    const condition = noteSearchCondition(q);
    const rows = await database.select({ value: sql<number>`count(*)` }).from(notes).where(condition);
    return Number(rows[0]?.value ?? 0);
  },

  // Lädt eine Seite der Notizen-Hauptliste: Suchfilter + recencyOrder + LIMIT/OFFSET.
  async listForSearchPage(database: DbSession, params: NotePageParams): Promise<NoteRecord[]> {
    const condition = noteSearchCondition(params.q);
    const offset = (params.page - 1) * params.pageSize;
    return database
      .select()
      .from(notes)
      .where(condition)
      .orderBy(...recencyOrder(notes))
      .limit(params.pageSize)
      .offset(offset);
  },

  async create(database: DbSession, data: NoteCreateData, userId?: number): Promise<NoteRecord> {
    const now = nowIso();
    const result = await database
      .insert(notes)
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
      throw new Error("Created note could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: NoteUpdateData, userId?: number): Promise<NoteRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(notes)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(notes.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(notes).where(eq(notes.id, id)));
  },

  async deleteByIds(database: DbSession, ids: number[]): Promise<number> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return 0;
    }
    return mutationAffectedRows(await database.delete(notes).where(inArray(notes.id, uniqueIds)));
  }
};

