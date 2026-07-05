import { and, eq, inArray, isNull, like, sql, type SQL } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { tickets } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

// Serverseitige Filter für die paginierte Root-Ticket-Liste (MS-DMS-Pattern).
// Bildet exakt ab, was die Ticket-Hauptseite bisher clientseitig filtert/sucht:
// Status (Katalog-Key, exakter Vergleich) und Suchtext `q` (Titel, case-insensitive
// Teilstring). `type` ist optional ergänzt (exakter Vergleich), analog zur DMS-Route.
export interface TicketListFilter {
  status?: string;
  type?: string;
  q?: string;
}

// Baut die WHERE-Klausel für Root-Tickets (parentId IS NULL) inkl. optionaler Filter.
// Wird von Seiten-Query und COUNT geteilt, damit `total` und Seite garantiert dieselbe
// Grundmenge sehen.
function rootTicketWhere(filter: TicketListFilter): SQL {
  const conditions: SQL[] = [isNull(tickets.parentId)];
  if (filter.status) {
    conditions.push(eq(tickets.status, filter.status));
  }
  if (filter.type) {
    conditions.push(eq(tickets.type, filter.type));
  }
  if (filter.q) {
    // Case-insensitive Teilstring auf dem Titel (utf8mb4-Collation ist bereits
    // case-insensitive; Wildcards im Suchbegriff werden escaped, damit % und _ als
    // Literal suchen).
    const escaped = filter.q.replace(/[\\%_]/g, (char) => `\\${char}`);
    conditions.push(like(tickets.title, `%${escaped}%`));
  }
  return and(...conditions) as SQL;
}

export type TicketRecord = typeof tickets.$inferSelect;
export type TicketCreateData = Omit<typeof tickets.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TicketUpdateData = Partial<
  Pick<
    TicketCreateData,
    | "type"
    | "parentId"
    | "title"
    | "description"
    | "status"
    | "priority"
    | "resolution"
    | "reporterUserId"
    | "responsibleUserId"
    | "environment"
    | "affectedVersion"
    | "dueDate"
    | "resolvedAt"
    | "position"
  >
>;

function nowIso(): string {
  return new Date().toISOString();
}

export const ticketRepository = {
  async findById(database: DbSession, id: number): Promise<TicketRecord | undefined> {
    return firstRow(await database.select().from(tickets).where(eq(tickets.id, id)));
  },

  async findAll(database: DbSession): Promise<TicketRecord[]> {
    return database.select().from(tickets);
  },

  async findRootTickets(database: DbSession): Promise<TicketRecord[]> {
    return database.select().from(tickets).where(isNull(tickets.parentId)).orderBy(tickets.status, ...recencyOrder(tickets));
  },

  // Echte SQL-Pagination für die Root-Ticket-Liste: gleiche WHERE-Grundmenge und
  // gleiche Sortierung wie findRootTickets (Status, dann Aktualität), zusätzlich
  // optionale Filter/Suche sowie LIMIT/OFFSET. Liefert nur die Seiten-Zeilen; die
  // Anreicherung übernimmt der bestehende Batch-Mapper im Service.
  async findRootTicketsPage(database: DbSession, filter: TicketListFilter, limit: number, offset: number): Promise<TicketRecord[]> {
    return database
      .select()
      .from(tickets)
      .where(rootTicketWhere(filter))
      .orderBy(tickets.status, ...recencyOrder(tickets))
      .limit(limit)
      .offset(offset);
  },

  // Gesamtzahl der Root-Tickets nach Filter/Suche (vor Pagination) für `total`.
  async countRootTickets(database: DbSession, filter: TicketListFilter): Promise<number> {
    const rows = await database.select({ value: sql<number>`count(*)` }).from(tickets).where(rootTicketWhere(filter));
    return Number(firstRow(rows)?.value ?? 0);
  },

  async findChildren(database: DbSession, parentId: number): Promise<TicketRecord[]> {
    return database.select().from(tickets).where(eq(tickets.parentId, parentId)).orderBy(tickets.status, ...recencyOrder(tickets));
  },

  async findByIds(database: DbSession, ids: number[]): Promise<TicketRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    return database.select().from(tickets).where(inArray(tickets.id, ids));
  },

  async findPositions(database: DbSession, status: TicketRecord["status"], parentId: number | null): Promise<Array<Pick<TicketRecord, "position">>> {
    const where = parentId === null ? and(eq(tickets.status, status), isNull(tickets.parentId)) : and(eq(tickets.status, status), eq(tickets.parentId, parentId));
    return database.select({ position: tickets.position }).from(tickets).where(where);
  },

  async create(database: DbSession, data: TicketCreateData, userId?: number): Promise<TicketRecord> {
    const now = nowIso();
    const result = await database
      .insert(tickets)
      .values({
        ...data,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      });
    return {
      id: insertId(result),
      parentId: data.parentId ?? null,
      type: data.type ?? "bug",
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "open",
      priority: data.priority ?? "medium",
      resolution: data.resolution ?? null,
      reporterUserId: data.reporterUserId ?? null,
      responsibleUserId: data.responsibleUserId ?? null,
      environment: data.environment ?? null,
      affectedVersion: data.affectedVersion ?? null,
      dueDate: data.dueDate ?? null,
      resolvedAt: data.resolvedAt ?? null,
      position: data.position ?? 0,
      version: 1,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      createdAt: now,
      updatedAt: now
    };
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: TicketUpdateData, userId?: number): Promise<TicketRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(tickets)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(tickets.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(tickets).where(eq(tickets.id, id)));
  }
};

