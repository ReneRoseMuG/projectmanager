import type {
  Ticket,
  TicketDetail,
  TicketInput,
  TicketOwner,
  TicketPositionInput,
  TicketRelationEntry,
  TicketRelationInput,
  TicketRelationType,
  TicketUpdate,
  VisibleParentContext
} from "@taskmanager/shared-types";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { featureTickets, features, milestoneTickets, milestones, projectTickets, projects, taskTickets, tasks, ticketRelations, tickets, useCases, useCaseTickets } from "../db/schema.js";
import { ticketRepository, type TicketRecord } from "../repositories/ticket.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { deleteTicketAttachmentsForIds, listTicketAttachments } from "./attachments.service.js";
import { ensureCatalogEntryExists, isCatalogEntryClosed, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import { listEntityComments } from "./comments.service.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildLinkSummary,
  buildUnlinkSummary,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";
import { deleteTicketNotesForIds, listTicketNotes } from "./notes.service.js";
import { assertCompatibleProjectContexts, projectContextsAreCompatible, ticketOwnerProjectContext, ticketProjectContext } from "./project-context.service.js";
import { getTicketTags, getTicketTagsMap } from "./tags.service.js";

export type { TicketOwner };

type TicketRecordWithBoardPosition = TicketRecord & { boardPosition: number; visibleParent?: VisibleParentContext | null };

const ticketSelect = {
  id: tickets.id,
  parentId: tickets.parentId,
  type: tickets.type,
  title: tickets.title,
  description: tickets.description,
  status: tickets.status,
  priority: tickets.priority,
  resolution: tickets.resolution,
  reporter: tickets.reporter,
  assignee: tickets.assignee,
  environment: tickets.environment,
  affectedVersion: tickets.affectedVersion,
  dueDate: tickets.dueDate,
  resolvedAt: tickets.resolvedAt,
  position: tickets.position,
  version: tickets.version,
  createdBy: tickets.createdBy,
  updatedBy: tickets.updatedBy,
  createdAt: tickets.createdAt,
  updatedAt: tickets.updatedAt
};

const ticketJournalFields: Array<JournalFieldDefinition<TicketRecord>> = [
  { key: "type", label: "Typ" },
  { key: "title", label: "Titel" },
  { key: "description", label: "Beschreibung" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priorität" },
  { key: "resolution", label: "Lösung" },
  { key: "reporter", label: "Reporter" },
  { key: "assignee", label: "Zuständige Person" },
  { key: "environment", label: "Umgebung" },
  { key: "affectedVersion", label: "Betroffene Version" },
  { key: "dueDate", label: "Fälligkeitsdatum" },
  { key: "resolvedAt", label: "Gelöst am" },
  { key: "position", label: "Position" }
];

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function ensureTaskExists(database: DbClient, taskId: number): void {
  const task = database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

function ensureMilestoneExists(database: DbClient, milestoneId: number): void {
  const milestone = database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function ensureUseCaseExists(database: DbClient, useCaseId: number): void {
  const useCase = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

function ensureOwnerExists(database: DbClient, owner: TicketOwner): void {
  if (owner.type === "project") {
    ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "task") {
    ensureTaskExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    ensureFeatureExists(database, owner.id);
    return;
  }
  ensureUseCaseExists(database, owner.id);
}

function getOwnerJournalObject(database: DbClient, owner: TicketOwner): JournalObjectRef {
  if (owner.type === "project") {
    const project = database.select({ name: projects.name }).from(projects).where(eq(projects.id, owner.id)).get();
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = database.select({ name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)).get();
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "task") {
    const task = database.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)).get();
    return makeJournalObject("task", owner.id, task?.title ?? `Aufgabe ${owner.id}`);
  }
  if (owner.type === "feature") {
    const feature = database.select({ title: features.title }).from(features).where(eq(features.id, owner.id)).get();
    return makeJournalObject("feature", owner.id, feature?.title ?? `Feature ${owner.id}`);
  }
  const useCase = database.select({ title: useCases.title }).from(useCases).where(eq(useCases.id, owner.id)).get();
  return makeJournalObject("useCase", owner.id, useCase?.title ?? `Use Case ${owner.id}`);
}

function visibleParentForOwner(database: DbClient, owner: TicketOwner, origin: VisibleParentContext["origin"]): VisibleParentContext {
  const ownerObject = getOwnerJournalObject(database, owner);
  return {
    type: owner.type,
    id: owner.id,
    label: ownerObject.label,
    origin
  };
}

function withVisibleParent(rows: Array<TicketRecord & { boardPosition: number }>, parent: VisibleParentContext): TicketRecordWithBoardPosition[] {
  return rows.map((row) => ({ ...row, visibleParent: parent }));
}

function ticketJournalObject(ticket: Pick<TicketRecord, "id" | "title">): JournalObjectRef {
  return makeJournalObject("ticket", ticket.id, ticket.title);
}

function getTicketRecord(database: DbClient, id: number): TicketRecord {
  const ticket = ticketRepository.findById(database, id);
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

function collectTicketSubtreeIds(database: DbClient, ticketId: number): number[] {
  getTicketRecord(database, ticketId);
  const rows = ticketRepository.findAll(database);
  const childrenByParent = new Map<number, number[]>();

  for (const row of rows) {
    if (row.parentId !== null) {
      childrenByParent.set(row.parentId, [...(childrenByParent.get(row.parentId) ?? []), row.id]);
    }
  }

  const ids: number[] = [];
  const queue = [ticketId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) {
      continue;
    }

    ids.push(currentId);
    queue.push(...(childrenByParent.get(currentId) ?? []));
  }

  return ids;
}

function nextPosition(database: DbClient, status: TicketRecord["status"], parentId: number | null): number {
  const positions = ticketRepository.findPositions(database, status, parentId);
  const max = positions.reduce((current, row) => Math.max(current, row.position), 0);
  return max + 1024;
}

function selectOwnerTicketRows(database: DbClient, owner: TicketOwner): TicketRecordWithBoardPosition[] {
  if (owner.type === "project") {
    return database
      .select({ ...ticketSelect, boardPosition: projectTickets.position })
      .from(projectTickets)
      .innerJoin(tickets, eq(projectTickets.ticketId, tickets.id))
      .where(and(eq(projectTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, projectTickets.position)
      .all();
  }
  if (owner.type === "task") {
    return database
      .select({ ...ticketSelect, boardPosition: taskTickets.position })
      .from(taskTickets)
      .innerJoin(tickets, eq(taskTickets.ticketId, tickets.id))
      .where(and(eq(taskTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, taskTickets.position)
      .all();
  }
  if (owner.type === "milestone") {
    return database
      .select({ ...ticketSelect, boardPosition: milestoneTickets.position })
      .from(milestoneTickets)
      .innerJoin(tickets, eq(milestoneTickets.ticketId, tickets.id))
      .where(and(eq(milestoneTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, milestoneTickets.position)
      .all();
  }
  if (owner.type === "feature") {
    return database
      .select({ ...ticketSelect, boardPosition: featureTickets.position })
      .from(featureTickets)
      .innerJoin(tickets, eq(featureTickets.ticketId, tickets.id))
      .where(and(eq(featureTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, featureTickets.position)
      .all();
  }

  return database
    .select({ ...ticketSelect, boardPosition: useCaseTickets.position })
    .from(useCaseTickets)
    .innerJoin(tickets, eq(useCaseTickets.ticketId, tickets.id))
    .where(and(eq(useCaseTickets.ownerId, owner.id), isNull(tickets.parentId)))
    .orderBy(tickets.status, useCaseTickets.position)
    .all();
}

function selectProjectMilestoneTicketRows(database: DbClient, projectId: number): TicketRecordWithBoardPosition[] {
  const milestoneRows = database
    .select({
      ...ticketSelect,
      boardPosition: milestoneTickets.position,
      milestoneId: milestones.id,
      milestoneName: milestones.name
    })
    .from(milestoneTickets)
    .innerJoin(milestones, eq(milestoneTickets.ownerId, milestones.id))
    .innerJoin(tickets, eq(milestoneTickets.ticketId, tickets.id))
    .where(and(eq(milestones.projectId, projectId), isNull(tickets.parentId)))
    .orderBy(tickets.status, milestoneTickets.position)
    .all();

  return milestoneRows.map((row) => {
    const { milestoneId, milestoneName, ...ticketRow } = row;
    return {
      ...ticketRow,
      visibleParent: {
        type: "milestone",
        id: milestoneId,
        label: milestoneName,
        origin: "inherited"
      }
    };
  });
}

function selectVisibleOwnerTicketRows(database: DbClient, owner: TicketOwner): TicketRecordWithBoardPosition[] {
  const directRows = withVisibleParent(selectOwnerTicketRows(database, owner), visibleParentForOwner(database, owner, "direct"));
  if (owner.type !== "project") {
    return directRows;
  }

  const directIds = new Set(directRows.map((row) => row.id));
  const inheritedRows = selectProjectMilestoneTicketRows(database, owner.id).filter((row) => !directIds.has(row.id));
  return [...directRows, ...inheritedRows];
}

function getOwnerTicketRow(database: DbClient, owner: TicketOwner, ticketId: number): TicketRecordWithBoardPosition | undefined {
  return selectOwnerTicketRows(database, owner).find((ticket) => ticket.id === ticketId);
}

function nextOwnerPosition(database: DbClient, owner: TicketOwner, status: TicketRecord["status"]): number {
  const rows = selectOwnerTicketRows(database, owner).filter((ticket) => ticket.status === status);
  return rows.reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

function insertOwnerTicket(database: DbClient, owner: TicketOwner, ticketId: number, position: number): void {
  if (owner.type === "project") {
    database.insert(projectTickets).values({ ownerId: owner.id, ticketId, position }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "task") {
    database.insert(taskTickets).values({ ownerId: owner.id, ticketId, position }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "milestone") {
    database.insert(milestoneTickets).values({ ownerId: owner.id, ticketId, position }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "feature") {
    database.insert(featureTickets).values({ ownerId: owner.id, ticketId, position }).onConflictDoNothing().run();
    return;
  }
  database.insert(useCaseTickets).values({ ownerId: owner.id, ticketId, position }).onConflictDoNothing().run();
}

function deleteOwnerTicketLink(database: DbClient, owner: TicketOwner, ticketId: number): number {
  if (owner.type === "project") {
    return database.delete(projectTickets).where(and(eq(projectTickets.ownerId, owner.id), eq(projectTickets.ticketId, ticketId))).run().changes;
  }
  if (owner.type === "task") {
    return database.delete(taskTickets).where(and(eq(taskTickets.ownerId, owner.id), eq(taskTickets.ticketId, ticketId))).run().changes;
  }
  if (owner.type === "milestone") {
    return database.delete(milestoneTickets).where(and(eq(milestoneTickets.ownerId, owner.id), eq(milestoneTickets.ticketId, ticketId))).run().changes;
  }
  if (owner.type === "feature") {
    return database.delete(featureTickets).where(and(eq(featureTickets.ownerId, owner.id), eq(featureTickets.ticketId, ticketId))).run().changes;
  }
  return database.delete(useCaseTickets).where(and(eq(useCaseTickets.ownerId, owner.id), eq(useCaseTickets.ticketId, ticketId))).run().changes;
}

function relationEntryId(sourceTicketId: number, targetTicketId: number, relationType: TicketRelationType, direction: "outgoing" | "incoming"): number {
  const relationOffset = relationType === "blocks" ? 1 : relationType === "related" ? 2 : 3;
  const directionOffset = direction === "outgoing" ? 0 : 5;
  return sourceTicketId * 1_000_000 + targetTicketId * 10 + relationOffset + directionOffset;
}

function insertTicketRecord(database: DbClient, input: TicketInput, parentId: number | null = null, actor?: JournalActor | null): TicketRecord {
  const title = requireNonEmpty(input.title, "title");
  const type = input.type ?? resolveDefaultCatalogEntryKey(database, "ticketType", "bug");
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "open");
  const priority = input.priority ?? resolveDefaultCatalogEntryKey(database, "priority", "medium");
  ensureCatalogEntryExists(database, "ticketType", type);
  ensureCatalogEntryExists(database, "workStatus", status);
  ensureCatalogEntryExists(database, "priority", priority);
  return ticketRepository.create(
    database,
    {
      parentId,
      type,
      title,
      description: cleanNullable(input.description) ?? null,
      status,
      priority,
      resolution: null,
      reporter: cleanNullable(input.reporter) ?? null,
      assignee: cleanNullable(input.assignee) ?? null,
      environment: cleanNullable(input.environment) ?? null,
      affectedVersion: cleanNullable(input.affectedVersion) ?? null,
      dueDate: cleanNullable(input.dueDate) ?? null,
      resolvedAt: null,
      position: nextPosition(database, status, parentId)
    },
    actor?.actorUserId ?? undefined
  );
}

function ticketDeleteBlockers(database: DbClient, ticketId: number): string[] {
  const blockers: string[] = [];

  if (database.select({ ownerId: projectTickets.ownerId }).from(projectTickets).where(eq(projectTickets.ticketId, ticketId)).get()) {
    blockers.push("Projekt-Verknüpfungen");
  }
  if (database.select({ ownerId: taskTickets.ownerId }).from(taskTickets).where(eq(taskTickets.ticketId, ticketId)).get()) {
    blockers.push("Aufgaben-Verknüpfungen");
  }
  if (database.select({ ownerId: milestoneTickets.ownerId }).from(milestoneTickets).where(eq(milestoneTickets.ticketId, ticketId)).get()) {
    blockers.push("Meilenstein-Verknüpfungen");
  }
  if (database.select({ ownerId: featureTickets.ownerId }).from(featureTickets).where(eq(featureTickets.ticketId, ticketId)).get()) {
    blockers.push("Feature-Verknüpfungen");
  }
  if (database.select({ ownerId: useCaseTickets.ownerId }).from(useCaseTickets).where(eq(useCaseTickets.ticketId, ticketId)).get()) {
    blockers.push("Use-Case-Verknüpfungen");
  }
  if (database.select({ id: tickets.id }).from(tickets).where(eq(tickets.parentId, ticketId)).get()) {
    blockers.push("Sub-Tickets");
  }
  if (
    database
      .select({ sourceTicketId: ticketRelations.sourceTicketId })
      .from(ticketRelations)
      .where(or(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, ticketId)))
      .get()
  ) {
    blockers.push("Ticket-Relationen");
  }

  return blockers;
}

export function mapTicket(
  database: DbClient,
  record: TicketRecord,
  tags = getTicketTags(database, record.id),
  subTicketCount = getSubTicketCounts(database, [record.id]).get(record.id) ?? 0,
  position = record.position,
  visibleParent?: VisibleParentContext | null
): Ticket {
  return {
    id: record.id,
    parentId: record.parentId,
    type: record.type,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    resolution: record.resolution,
    reporter: record.reporter,
    assignee: record.assignee,
    environment: record.environment,
    affectedVersion: record.affectedVersion,
    dueDate: record.dueDate,
    resolvedAt: record.resolvedAt,
    position,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags,
    subTicketCount,
    visibleParent
  };
}

export function listTickets(database: DbClient): Ticket[] {
  const rows = ticketRepository.findRootTickets(database);
  const ids = rows.map((ticket) => ticket.id);
  const tagsByTicket = getTicketTagsMap(database, ids);
  const subTicketCounts = getSubTicketCounts(database, ids);

  return rows.map((ticket) => mapTicket(database, ticket, tagsByTicket.get(ticket.id) ?? [], subTicketCounts.get(ticket.id) ?? 0));
}

export function listTicketLinkCandidates(database: DbClient, owner: TicketOwner): Ticket[] {
  ensureOwnerExists(database, owner);
  const ownerContext = ticketOwnerProjectContext(database, owner);
  const linkedTicketIds = new Set(selectVisibleOwnerTicketRows(database, owner).map((ticket) => ticket.id));

  return listTickets(database).filter((ticket) => !linkedTicketIds.has(ticket.id) && projectContextsAreCompatible(ownerContext, ticketProjectContext(database, ticket.id)));
}

export function listOwnerTickets(database: DbClient, owner: TicketOwner): Ticket[] {
  ensureOwnerExists(database, owner);
  const rows = selectVisibleOwnerTicketRows(database, owner);
  const ids = rows.map((ticket) => ticket.id);
  const tagsByTicket = getTicketTagsMap(database, ids);
  const subTicketCounts = getSubTicketCounts(database, ids);

  return rows.map((ticket) => mapTicket(database, ticket, tagsByTicket.get(ticket.id) ?? [], subTicketCounts.get(ticket.id) ?? 0, ticket.boardPosition, ticket.visibleParent));
}

export function listProjectTickets(database: DbClient, projectId: number): Ticket[] {
  return listOwnerTickets(database, { type: "project", id: projectId });
}

export function listSubTickets(database: DbClient, parentId: number): Ticket[] {
  getTicketRecord(database, parentId);
  const rows = ticketRepository.findChildren(database, parentId);
  const ids = rows.map((ticket) => ticket.id);
  const tagsByTicket = getTicketTagsMap(database, ids);
  const subTicketCounts = getSubTicketCounts(database, ids);

  return rows.map((ticket) => mapTicket(database, ticket, tagsByTicket.get(ticket.id) ?? [], subTicketCounts.get(ticket.id) ?? 0));
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

export function createTicket(database: DbClient, input: TicketInput, actor?: JournalActor | null): Ticket {
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = insertTicketRecord(txDb, input, null, actor);
    const ticketObject = ticketJournalObject(ticket);
    recordJournalEntry(txDb, { operation: "create", object: ticketObject, summary: buildCreateSummary(ticketObject), actor });
    return ticket;
  });
  return mapTicket(database, created, [], 0);
}

export function createOwnerTicket(database: DbClient, owner: TicketOwner, input: TicketInput, actor?: JournalActor | null): Ticket {
  ensureOwnerExists(database, owner);
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "open");
  const position = nextOwnerPosition(database, owner, status);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = insertTicketRecord(txDb, input, null, actor);
    insertOwnerTicket(txDb, owner, ticket.id, position);
    const ticketObject = ticketJournalObject(ticket);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "create",
      object: ticketObject,
      summary: buildCreateSummary(ticketObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return ticket;
  });

  return mapTicket(database, created, [], 0, position);
}

export function linkOwnerTicket(database: DbClient, owner: TicketOwner, ticketId: number, actor?: JournalActor | null): Ticket {
  ensureOwnerExists(database, owner);
  const ticket = getTicketRecord(database, ticketId);
  if (ticket.parentId !== null) {
    throw badRequest("Sub-tickets cannot be linked to owners");
  }

  const existing = getOwnerTicketRow(database, owner, ticketId);
  if (existing) {
    return mapTicket(database, existing, undefined, undefined, existing.boardPosition);
  }

  assertCompatibleProjectContexts(ticketOwnerProjectContext(database, owner), ticketProjectContext(database, ticketId));

  const position = nextOwnerPosition(database, owner, ticket.status);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    insertOwnerTicket(txDb, owner, ticketId, position);
    const ticketObject = ticketJournalObject(ticket);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "link",
      object: ticketObject,
      summary: buildLinkSummary(ownerObject, ticketObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
  return mapTicket(database, ticket, undefined, undefined, position);
}

export function unlinkOwnerTicket(database: DbClient, owner: TicketOwner, ticketId: number, actor?: JournalActor | null): void {
  ensureOwnerExists(database, owner);
  const ticket = getTicketRecord(database, ticketId);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = deleteOwnerTicketLink(txDb, owner, ticketId);
    if (changes === 0) {
      throw notFound(`Ticket ${ticketId} is not linked to ${owner.type} ${owner.id}`);
    }
    const ticketObject = ticketJournalObject(ticket);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "unlink",
      object: ticketObject,
      summary: buildUnlinkSummary(ownerObject, ticketObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export function createSubTicket(database: DbClient, parentId: number, input: TicketInput, actor?: JournalActor | null): Ticket {
  const parent = getTicketRecord(database, parentId);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = insertTicketRecord(txDb, { ...input, type: input.type ?? parent.type, priority: input.priority ?? parent.priority }, parentId, actor);
    const ticketObject = ticketJournalObject(ticket);
    const parentObject = ticketJournalObject(parent);
    recordJournalEntry(txDb, {
      operation: "create",
      object: ticketObject,
      summary: buildCreateSummary(ticketObject),
      actor,
      contexts: [makeJournalContext(parentObject, "parent")]
    });
    return ticket;
  });
  return mapTicket(database, created, [], 0);
}

export function updateTicket(database: DbClient, id: number, input: TicketUpdate, actor?: JournalActor | null): Ticket {
  const existing = getTicketRecord(database, id);
  const values: Partial<
    Pick<
      TicketRecord,
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
    >
  > = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.type !== undefined) {
    ensureCatalogEntryExists(database, "ticketType", input.type);
    values.type = input.type;
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    ensureCatalogEntryExists(database, "workStatus", input.status);
    values.status = input.status;
    if (isCatalogEntryClosed(database, "workStatus", input.status) && existing.resolvedAt === null && input.resolvedAt === undefined) {
      values.resolvedAt = nowIso();
    }
  }
  if (input.priority !== undefined) {
    ensureCatalogEntryExists(database, "priority", input.priority);
    values.priority = input.priority;
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

  const updated = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const current = getTicketRecord(txDb, id);
    const ticket = ticketRepository.update(txDb, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!ticket) {
      throw notFound(`Ticket with id ${id} not found`);
    }
    const ticketObject = ticketJournalObject(ticket);
    const changes = buildJournalChanges(current, ticket, ticketJournalFields);
    recordJournalEntry(txDb, {
      operation: "update",
      object: ticketObject,
      summary: buildUpdateSummary(ticketObject, changes),
      actor,
      changes,
      contexts: current.parentId ? [makeJournalContext(makeJournalObject("ticket", current.parentId, `Ticket ${current.parentId}`), "parent")] : []
    });
    return ticket;
  });

  return mapTicket(database, updated);
}

export function updateTicketPosition(database: DbClient, id: number, input: TicketPositionInput, actor?: JournalActor | null): Ticket {
  const existing = getTicketRecord(database, id);
  ensureCatalogEntryExists(database, "workStatus", input.status);
  const values: Partial<Pick<TicketRecord, "status" | "position" | "resolvedAt">> = {
    status: input.status,
    position: input.position
  };

  if (isCatalogEntryClosed(database, "workStatus", input.status) && existing.resolvedAt === null) {
    values.resolvedAt = nowIso();
  }

  const updated = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = ticketRepository.update(txDb, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!ticket) {
      throw notFound(`Ticket with id ${id} not found`);
    }
    const ticketObject = ticketJournalObject(ticket);
    const changes = buildJournalChanges(existing, ticket, ticketJournalFields);
    recordJournalEntry(txDb, { operation: "update", object: ticketObject, summary: buildUpdateSummary(ticketObject, changes), actor, changes });
    return ticket;
  });

  return mapTicket(database, updated);
}

export async function deleteTicket(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const ticket = getTicketRecord(database, id);
  const blockers = ticketDeleteBlockers(database, id);
  if (blockers.length > 0) {
    throw conflict(`Ticket kann nicht gelöscht werden, solange Beziehungen bestehen: ${blockers.join(", ")}.`);
  }

  const ticketIds = collectTicketSubtreeIds(database, id);

  await deleteTicketAttachmentsForIds(database, ticketIds);
  deleteTicketNotesForIds(database, ticketIds);

  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const ticketObject = ticketJournalObject(ticket);
    recordJournalEntry(txDb, { operation: "delete", object: ticketObject, summary: buildDeleteSummary(ticketObject), actor });
    if (ticketRepository.delete(txDb, id) === 0) {
      throw notFound(`Ticket with id ${id} not found`);
    }
  });
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

function ticketRelationPeerIds(database: DbClient, ticketId: number): Set<number> {
  const rows = database
    .select({ sourceTicketId: ticketRelations.sourceTicketId, targetTicketId: ticketRelations.targetTicketId })
    .from(ticketRelations)
    .where(or(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, ticketId)))
    .all();
  return new Set(rows.map((row) => (row.sourceTicketId === ticketId ? row.targetTicketId : row.sourceTicketId)));
}

export function listTicketRelationCandidates(database: DbClient, ticketId: number): Ticket[] {
  getTicketRecord(database, ticketId);
  const sourceContext = ticketProjectContext(database, ticketId);
  const relatedTicketIds = ticketRelationPeerIds(database, ticketId);

  return listTickets(database).filter(
    (ticket) => ticket.id !== ticketId && !relatedTicketIds.has(ticket.id) && projectContextsAreCompatible(sourceContext, ticketProjectContext(database, ticket.id))
  );
}

export function addTicketRelation(database: DbClient, ticketId: number, input: TicketRelationInput, actor?: JournalActor | null): void {
  const source = getTicketRecord(database, ticketId);
  const target = getTicketRecord(database, input.targetTicketId);

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

  assertCompatibleProjectContexts(ticketProjectContext(database, ticketId), ticketProjectContext(database, input.targetTicketId));

  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    txDb
      .insert(ticketRelations)
      .values({
        sourceTicketId: ticketId,
        targetTicketId: input.targetTicketId,
        relationType: input.relationType,
        createdAt: nowIso()
      })
      .run();
    const sourceObject = ticketJournalObject(source);
    const targetObject = ticketJournalObject(target);
    recordJournalEntry(txDb, {
      operation: "link",
      object: sourceObject,
      summary: buildLinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });
}

export function removeTicketRelation(database: DbClient, ticketId: number, targetTicketId: number, relationType: TicketRelationType, actor?: JournalActor | null): void {
  const source = getTicketRecord(database, ticketId);
  const target = getTicketRecord(database, targetTicketId);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const result = txDb
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
    const sourceObject = ticketJournalObject(source);
    const targetObject = ticketJournalObject(target);
    recordJournalEntry(txDb, {
      operation: "unlink",
      object: sourceObject,
      summary: buildUnlinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });
}
