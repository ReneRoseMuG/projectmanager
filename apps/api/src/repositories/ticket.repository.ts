import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { tickets } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type TicketRecord = typeof tickets.$inferSelect;
export type TicketCreateData = Omit<typeof tickets.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TicketUpdateData = Partial<
  Pick<
    TicketCreateData,
    | "type"
    | "title"
    | "description"
    | "status"
    | "priority"
    | "resolution"
    | "reporter"
    | "assignee"
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
  findById(database: DbClient, id: number): TicketRecord | undefined {
    return database.select().from(tickets).where(eq(tickets.id, id)).get();
  },

  findAll(database: DbClient): TicketRecord[] {
    return database.select().from(tickets).all();
  },

  findRootTickets(database: DbClient): TicketRecord[] {
    return database.select().from(tickets).where(isNull(tickets.parentId)).orderBy(tickets.status, tickets.position).all();
  },

  findChildren(database: DbClient, parentId: number): TicketRecord[] {
    return database.select().from(tickets).where(eq(tickets.parentId, parentId)).orderBy(tickets.status, tickets.position).all();
  },

  findByIds(database: DbClient, ids: number[]): TicketRecord[] {
    if (ids.length === 0) {
      return [];
    }
    return database.select().from(tickets).where(inArray(tickets.id, ids)).all();
  },

  findPositions(database: DbClient, status: TicketRecord["status"], parentId: number | null): Array<Pick<TicketRecord, "position">> {
    const where = parentId === null ? and(eq(tickets.status, status), isNull(tickets.parentId)) : and(eq(tickets.status, status), eq(tickets.parentId, parentId));
    return database.select({ position: tickets.position }).from(tickets).where(where).all();
  },

  create(database: DbClient, data: TicketCreateData, userId?: number): TicketRecord {
    const now = nowIso();
    return database
      .insert(tickets)
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

  update(database: DbClient, id: number, expectedVersion: number, data: TicketUpdateData, userId?: number): TicketRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(tickets)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(tickets.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(tickets).where(eq(tickets.id, id)).run().changes;
  }
};
