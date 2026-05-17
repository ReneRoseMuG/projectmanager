import type {
  Ticket,
  TicketDetail,
  TicketInput,
  TicketPositionInput,
  TicketRelationEntry,
  TicketRelationInput,
  TicketRelationType,
  TicketUpdate
} from "@taskmanager/shared-types";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects, ticketRelations, tickets } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { listTicketAttachments } from "./attachments.service.js";
import { listEntityComments } from "./comments.service.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";
import { listTicketNotes } from "./notes.service.js";
import { getTicketTags, getTicketTagsMap } from "./tags.service.js";

type TicketRecord = typeof tickets.$inferSelect;

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function getTicketRecord(database: DbClient, id: number): TicketRecord {
  const ticket = database.select().from(tickets).where(eq(tickets.id, id)).get();
  if (!ticket) {
    throw notFound(`Ticket with id ${id} not found`);
  }
  return ticket;
}

function getSubTicketCounts(database: DbClient, ticketIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  if (ticketIds.length === 0) {
    return counts;
  }

  const rows = database.select({ parentId: tickets.parentId }).from(tickets).where(inArray(tickets.parentId, ticketIds)).all();
  for (const row of rows) {
    if (row.parentId !== null) {
      counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
    }
  }

  return counts;
}

function nextPosition(database: DbClient, projectId: number, status: TicketRecord["status"], parentId: number | null): number {
  const where =
    parentId === null
      ? and(eq(tickets.projectId, projectId), eq(tickets.status, status), isNull(tickets.parentId))
      : and(eq(tickets.projectId, projectId), eq(tickets.status, status), eq(tickets.parentId, parentId));

  const positions = database.select({ position: tickets.position }).from(tickets).where(where).all();
  const max = positions.reduce((current, row) => Math.max(current, row.position), 0);
  return max + 1024;
}

function relationEntryId(sourceTicketId: number, targetTicketId: number, relationType: TicketRelationType, direction: "outgoing" | "incoming"): number {
  const relationOffset = relationType === "blocks" ? 1 : relationType === "related" ? 2 : 3;
  const directionOffset = direction === "outgoing" ? 0 : 5;
  return sourceTicketId * 1_000_000 + targetTicketId * 10 + relationOffset + directionOffset;
}

export function mapTicket(
  database: DbClient,
  record: TicketRecord,
  tags = getTicketTags(database, record.id),
  subTicketCount = getSubTicketCounts(database, [record.id]).get(record.id) ?? 0
): Ticket {
  return {
    id: record.id,
    projectId: record.projectId,
    parentId: record.parentId,
    type: record.type,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    severity: record.severity,
    resolution: record.resolution,
    reporter: record.reporter,
    assignee: record.assignee,
    environment: record.environment,
    affectedVersion: record.affectedVersion,
    dueDate: record.dueDate,
    resolvedAt: record.resolvedAt,
    position: record.position,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags,
    subTicketCount
  };
}

export function listTickets(database: DbClient): Ticket[] {
  const rows = database.select().from(tickets).where(isNull(tickets.parentId)).orderBy(tickets.projectId, tickets.status, tickets.position).all();
  const ids = rows.map((ticket) => ticket.id);
  const tagsByTicket = getTicketTagsMap(database, ids);
  const subTicketCounts = getSubTicketCounts(database, ids);

  return rows.map((ticket) => mapTicket(database, ticket, tagsByTicket.get(ticket.id) ?? [], subTicketCounts.get(ticket.id) ?? 0));
}

export function listProjectTickets(database: DbClient, projectId: number): Ticket[] {
  ensureProjectExists(database, projectId);
  const rows = database
    .select()
    .from(tickets)
    .where(and(eq(tickets.projectId, projectId), isNull(tickets.parentId)))
    .orderBy(tickets.status, tickets.position)
    .all();
  const ids = rows.map((ticket) => ticket.id);
  const tagsByTicket = getTicketTagsMap(database, ids);
  const subTicketCounts = getSubTicketCounts(database, ids);

  return rows.map((ticket) => mapTicket(database, ticket, tagsByTicket.get(ticket.id) ?? [], subTicketCounts.get(ticket.id) ?? 0));
}

export function listSubTickets(database: DbClient, parentId: number): Ticket[] {
  const parent = getTicketRecord(database, parentId);
  const rows = database.select().from(tickets).where(eq(tickets.parentId, parentId)).orderBy(tickets.status, tickets.position).all();
  const ids = rows.map((ticket) => ticket.id);
  const tagsByTicket = getTicketTagsMap(database, ids);
  const subTicketCounts = getSubTicketCounts(database, ids);

  return rows
    .filter((ticket) => ticket.projectId === parent.projectId)
    .map((ticket) => mapTicket(database, ticket, tagsByTicket.get(ticket.id) ?? [], subTicketCounts.get(ticket.id) ?? 0));
}

export function getTicketDetail(database: DbClient, id: number): TicketDetail {
  const record = getTicketRecord(database, id);
  const ticket = mapTicket(database, record);

  return {
    ...ticket,
    comments: listEntityComments(database, "ticket", id),
    notes: listTicketNotes(database, id),
    attachments: listTicketAttachments(database, id),
    relations: listTicketRelations(database, id),
    subTickets: listSubTickets(database, id)
  };
}

export function createTicket(database: DbClient, projectId: number, input: TicketInput): Ticket {
  ensureProjectExists(database, projectId);
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? "open";
  const now = nowIso();
  const created = database
    .insert(tickets)
    .values({
      projectId,
      parentId: null,
      type: input.type ?? "bug",
      title,
      description: cleanNullable(input.description) ?? null,
      status,
      priority: input.priority ?? "medium",
      severity: input.severity ?? null,
      resolution: null,
      reporter: cleanNullable(input.reporter) ?? null,
      assignee: cleanNullable(input.assignee) ?? null,
      environment: cleanNullable(input.environment) ?? null,
      affectedVersion: cleanNullable(input.affectedVersion) ?? null,
      dueDate: cleanNullable(input.dueDate) ?? null,
      resolvedAt: null,
      position: nextPosition(database, projectId, status, null),
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  return mapTicket(database, created, [], 0);
}

export function createSubTicket(database: DbClient, parentId: number, input: TicketInput): Ticket {
  const parent = getTicketRecord(database, parentId);
  const title = requireNonEmpty(input.title, "title");
  const status = input.status ?? "open";
  const now = nowIso();
  const created = database
    .insert(tickets)
    .values({
      projectId: parent.projectId,
      parentId,
      type: input.type ?? parent.type,
      title,
      description: cleanNullable(input.description) ?? null,
      status,
      priority: input.priority ?? parent.priority,
      severity: input.severity ?? null,
      resolution: null,
      reporter: cleanNullable(input.reporter) ?? null,
      assignee: cleanNullable(input.assignee) ?? null,
      environment: cleanNullable(input.environment) ?? null,
      affectedVersion: cleanNullable(input.affectedVersion) ?? null,
      dueDate: cleanNullable(input.dueDate) ?? null,
      resolvedAt: null,
      position: nextPosition(database, parent.projectId, status, parentId),
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  return mapTicket(database, created, [], 0);
}

export function updateTicket(database: DbClient, id: number, input: TicketUpdate): Ticket {
  const existing = getTicketRecord(database, id);
  const values: Partial<typeof tickets.$inferInsert> = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.type !== undefined) {
    values.type = input.type;
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    values.status = input.status;
    if ((input.status === "resolved" || input.status === "closed") && existing.resolvedAt === null && input.resolvedAt === undefined) {
      values.resolvedAt = nowIso();
    }
  }
  if (input.priority !== undefined) {
    values.priority = input.priority;
  }
  if (input.severity !== undefined) {
    values.severity = input.severity;
  }
  if (input.resolution !== undefined) {
    values.resolution = input.resolution;
  }
  if (input.reporter !== undefined) {
    values.reporter = cleanNullable(input.reporter) ?? null;
  }
  if (input.assignee !== undefined) {
    values.assignee = cleanNullable(input.assignee) ?? null;
  }
  if (input.environment !== undefined) {
    values.environment = cleanNullable(input.environment) ?? null;
  }
  if (input.affectedVersion !== undefined) {
    values.affectedVersion = cleanNullable(input.affectedVersion) ?? null;
  }
  if (input.dueDate !== undefined) {
    values.dueDate = cleanNullable(input.dueDate) ?? null;
  }
  if (input.resolvedAt !== undefined) {
    values.resolvedAt = input.resolvedAt;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No ticket fields provided");
  }

  values.updatedAt = nowIso();

  const updated = database.update(tickets).set(values).where(eq(tickets.id, id)).returning().get();
  if (!updated) {
    throw notFound(`Ticket with id ${id} not found`);
  }

  return mapTicket(database, updated);
}

export function updateTicketPosition(database: DbClient, id: number, input: TicketPositionInput): Ticket {
  const existing = getTicketRecord(database, id);
  const values: Partial<typeof tickets.$inferInsert> = {
    status: input.status,
    position: input.position,
    updatedAt: nowIso()
  };

  if ((input.status === "resolved" || input.status === "closed") && existing.resolvedAt === null) {
    values.resolvedAt = nowIso();
  }

  const updated = database.update(tickets).set(values).where(eq(tickets.id, id)).returning().get();
  if (!updated) {
    throw notFound(`Ticket with id ${id} not found`);
  }

  return mapTicket(database, updated);
}

export function deleteTicket(database: DbClient, id: number): void {
  const result = database.delete(tickets).where(eq(tickets.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Ticket with id ${id} not found`);
  }
}

export function listTicketRelations(database: DbClient, ticketId: number): TicketRelationEntry[] {
  getTicketRecord(database, ticketId);

  const outgoing = database.select().from(ticketRelations).where(eq(ticketRelations.sourceTicketId, ticketId)).all();
  const incoming = database.select().from(ticketRelations).where(eq(ticketRelations.targetTicketId, ticketId)).all();
  const relatedIds = [...outgoing.map((relation) => relation.targetTicketId), ...incoming.map((relation) => relation.sourceTicketId)];

  if (relatedIds.length === 0) {
    return [];
  }

  const relatedRows = database.select().from(tickets).where(inArray(tickets.id, relatedIds)).all();
  const relatedById = new Map(relatedRows.map((ticket) => [ticket.id, ticket]));
  const entries: TicketRelationEntry[] = [];

  for (const relation of outgoing) {
    const related = relatedById.get(relation.targetTicketId);
    if (related) {
      entries.push({
        id: relationEntryId(relation.sourceTicketId, relation.targetTicketId, relation.relationType, "outgoing"),
        relationType: relation.relationType,
        ticket: mapTicket(database, related),
        direction: "outgoing"
      });
    }
  }

  for (const relation of incoming) {
    const related = relatedById.get(relation.sourceTicketId);
    if (related) {
      entries.push({
        id: relationEntryId(relation.sourceTicketId, relation.targetTicketId, relation.relationType, "incoming"),
        relationType: relation.relationType,
        ticket: mapTicket(database, related),
        direction: "incoming"
      });
    }
  }

  return entries;
}

export function addTicketRelation(database: DbClient, ticketId: number, input: TicketRelationInput): void {
  getTicketRecord(database, ticketId);
  getTicketRecord(database, input.targetTicketId);

  if (ticketId === input.targetTicketId) {
    throw badRequest("Ticket cannot be related to itself");
  }

  const existing = database
    .select()
    .from(ticketRelations)
    .where(
      and(
        eq(ticketRelations.sourceTicketId, ticketId),
        eq(ticketRelations.targetTicketId, input.targetTicketId),
        eq(ticketRelations.relationType, input.relationType)
      )
    )
    .get();

  if (existing) {
    throw badRequest("Ticket relation already exists");
  }

  database
    .insert(ticketRelations)
    .values({
      sourceTicketId: ticketId,
      targetTicketId: input.targetTicketId,
      relationType: input.relationType,
      createdAt: nowIso()
    })
    .run();
}

export function removeTicketRelation(database: DbClient, ticketId: number, targetTicketId: number, relationType: TicketRelationType): void {
  getTicketRecord(database, ticketId);
  const result = database
    .delete(ticketRelations)
    .where(
      and(
        eq(ticketRelations.relationType, relationType),
        or(
          and(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, targetTicketId)),
          and(eq(ticketRelations.sourceTicketId, targetTicketId), eq(ticketRelations.targetTicketId, ticketId))
        )
      )
    )
    .run();

  if (result.changes === 0) {
    throw notFound("Ticket relation not found");
  }
}
