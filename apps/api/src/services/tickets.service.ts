import type {
  Ticket,
  TicketDetail,
  TicketInput,
  TicketOwner,
  TicketPositionInput,
  TicketRelationEntry,
  TicketRelationInput,
  TicketRelationType,
  TicketStats,
  TicketUpdate,
  VisibleParentContext
} from "@taskmanager/shared-types";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { featureTickets, features, milestoneTickets, milestones, projectTickets, projects, taskTickets, tasks, ticketAttachments, ticketComments, ticketNotes, ticketRelations, tickets, useCases, useCaseTickets, wikiPageTickets, wikiPages } from "../db/schema.js";
import { firstRow, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { ticketRepository, type TicketRecord } from "../repositories/ticket.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { deleteTicketAttachmentsForIds, listTicketAttachments } from "./attachments.service.js";
import { ensureCatalogEntryExists, isCatalogEntryClosed, listClosedCatalogEntryKeys, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import { deleteTicketCommentsForIds, listEntityComments } from "./comments.service.js";
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
import { getUserOption, normalizeAssignableUserId } from "./users.service.js";

export type { TicketOwner };
export type DashboardTicketOwner = { type: "project" | "milestone"; id: number };

type TicketRecordWithBoardPosition = TicketRecord & { boardPosition: number; visibleParent?: VisibleParentContext | null };
interface SupportCounts {
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
}

const emptySupportCounts: SupportCounts = {
  attachmentCount: 0,
  noteCount: 0,
  commentCount: 0
};

const ticketSelect = {
  id: tickets.id,
  parentId: tickets.parentId,
  type: tickets.type,
  title: tickets.title,
  description: tickets.description,
  status: tickets.status,
  priority: tickets.priority,
  resolution: tickets.resolution,
  reporterUserId: tickets.reporterUserId,
  responsibleUserId: tickets.responsibleUserId,
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
  { key: "reporterUserId", label: "Meldende Person" },
  { key: "responsibleUserId", label: "Zuständige Person" },
  { key: "environment", label: "Umgebung" },
  { key: "affectedVersion", label: "Betroffene Version" },
  { key: "dueDate", label: "Fälligkeitsdatum" },
  { key: "resolvedAt", label: "Gelöst am" },
  { key: "position", label: "Position" }
];

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = firstRow(await database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

async function ensureTaskExists(database: DbClient, taskId: number): Promise<void> {
  const task = firstRow(await database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)));
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

async function ensureMilestoneExists(database: DbClient, milestoneId: number): Promise<void> {
  const milestone = firstRow(await database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)));
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

async function ensureFeatureExists(database: DbClient, featureId: number): Promise<void> {
  const feature = firstRow(await database.select({ id: features.id }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

async function ensureUseCaseExists(database: DbClient, useCaseId: number): Promise<void> {
  const useCase = firstRow(await database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)));
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

async function ensureWikiPageExists(database: DbClient, wikiPageId: number): Promise<void> {
  const page = firstRow(await database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)));
  if (!page) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
  }
}

async function ensureOwnerExists(database: DbClient, owner: TicketOwner): Promise<void> {
  if (owner.type === "project") {
    await ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "task") {
    await ensureTaskExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    await ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    await ensureFeatureExists(database, owner.id);
    return;
  }
  if (owner.type === "wikiPage") {
    await ensureWikiPageExists(database, owner.id);
    return;
  }
  await ensureUseCaseExists(database, owner.id);
}

async function getOwnerJournalObject(database: DbClient, owner: TicketOwner): Promise<JournalObjectRef> {
  if (owner.type === "project") {
    const project = firstRow(await database.select({ name: projects.name }).from(projects).where(eq(projects.id, owner.id)));
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)));
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "task") {
    const task = firstRow(await database.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)));
    return makeJournalObject("task", owner.id, task?.title ?? `Aufgabe ${owner.id}`);
  }
  if (owner.type === "feature") {
    const feature = firstRow(await database.select({ title: features.title }).from(features).where(eq(features.id, owner.id)));
    return makeJournalObject("feature", owner.id, feature?.title ?? `Feature ${owner.id}`);
  }
  if (owner.type === "wikiPage") {
    const page = firstRow(await database.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, owner.id)));
    return makeJournalObject("wikiPage", owner.id, page?.title ?? `Wiki-Seite ${owner.id}`);
  }
  const useCase = firstRow(await database.select({ title: useCases.title }).from(useCases).where(eq(useCases.id, owner.id)));
  return makeJournalObject("useCase", owner.id, useCase?.title ?? `Use Case ${owner.id}`);
}

async function visibleParentForOwner(database: DbClient, owner: TicketOwner, origin: VisibleParentContext["origin"]): Promise<VisibleParentContext> {
  const ownerObject = await getOwnerJournalObject(database, owner);
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

async function getTicketRecord(database: DbClient, id: number): Promise<TicketRecord> {
  const ticket = await ticketRepository.findById(database, id);
  if (!ticket) {
    throw notFound(`Ticket with id ${id} not found`);
  }
  return ticket;
}

async function getSubTicketCounts(database: DbClient, ticketIds: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (ticketIds.length === 0) {
    return counts;
  }

  const rows = await database.select({ parentId: tickets.parentId }).from(tickets).where(inArray(tickets.parentId, ticketIds));
  for (const row of rows) {
    if (row.parentId !== null) {
      counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
    }
  }

  return counts;
}

async function getTicketSupportCounts(database: DbClient, ticketIds: number[]): Promise<Map<number, SupportCounts>> {
  const counts = new Map<number, SupportCounts>();
  if (ticketIds.length === 0) {
    return counts;
  }

  const ensureCounts = (ticketId: number): SupportCounts => {
    const current = counts.get(ticketId);
    if (current) {
      return current;
    }
    const nextCounts = { ...emptySupportCounts };
    counts.set(ticketId, nextCounts);
    return nextCounts;
  };

  const [attachmentRows, noteRows, commentRows] = await Promise.all([
    database.select({ ticketId: ticketAttachments.ticketId }).from(ticketAttachments).where(inArray(ticketAttachments.ticketId, ticketIds)),
    database.select({ ticketId: ticketNotes.ticketId }).from(ticketNotes).where(inArray(ticketNotes.ticketId, ticketIds)),
    database.select({ ticketId: ticketComments.ticketId }).from(ticketComments).where(inArray(ticketComments.ticketId, ticketIds))
  ]);

  for (const row of attachmentRows) {
    ensureCounts(row.ticketId).attachmentCount += 1;
  }
  for (const row of noteRows) {
    ensureCounts(row.ticketId).noteCount += 1;
  }
  for (const row of commentRows) {
    ensureCounts(row.ticketId).commentCount += 1;
  }

  return counts;
}

async function collectTicketSubtreeIds(database: DbClient, ticketId: number): Promise<number[]> {
  await getTicketRecord(database, ticketId);
  const rows = await ticketRepository.findAll(database);
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

async function nextPosition(database: DbClient, status: TicketRecord["status"], parentId: number | null): Promise<number> {
  const positions = await ticketRepository.findPositions(database, status, parentId);
  const max = positions.reduce((current, row) => Math.max(current, row.position), 0);
  return max + 1024;
}

async function selectOwnerTicketRows(database: DbClient, owner: TicketOwner): Promise<TicketRecordWithBoardPosition[]> {
  if (owner.type === "project") {
    return database
      .select({ ...ticketSelect, boardPosition: projectTickets.position })
      .from(projectTickets)
      .innerJoin(tickets, eq(projectTickets.ticketId, tickets.id))
      .where(and(eq(projectTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, ...recencyOrder(tickets));
  }
  if (owner.type === "task") {
    return database
      .select({ ...ticketSelect, boardPosition: taskTickets.position })
      .from(taskTickets)
      .innerJoin(tickets, eq(taskTickets.ticketId, tickets.id))
      .where(and(eq(taskTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, ...recencyOrder(tickets));
  }
  if (owner.type === "milestone") {
    return database
      .select({ ...ticketSelect, boardPosition: milestoneTickets.position })
      .from(milestoneTickets)
      .innerJoin(tickets, eq(milestoneTickets.ticketId, tickets.id))
      .where(and(eq(milestoneTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, ...recencyOrder(tickets));
  }
  if (owner.type === "feature") {
    return database
      .select({ ...ticketSelect, boardPosition: featureTickets.position })
      .from(featureTickets)
      .innerJoin(tickets, eq(featureTickets.ticketId, tickets.id))
      .where(and(eq(featureTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, ...recencyOrder(tickets));
  }
  if (owner.type === "wikiPage") {
    return database
      .select({ ...ticketSelect, boardPosition: wikiPageTickets.position })
      .from(wikiPageTickets)
      .innerJoin(tickets, eq(wikiPageTickets.ticketId, tickets.id))
      .where(and(eq(wikiPageTickets.ownerId, owner.id), isNull(tickets.parentId)))
      .orderBy(tickets.status, ...recencyOrder(tickets));
  }

  return database
    .select({ ...ticketSelect, boardPosition: useCaseTickets.position })
    .from(useCaseTickets)
    .innerJoin(tickets, eq(useCaseTickets.ticketId, tickets.id))
    .where(and(eq(useCaseTickets.ownerId, owner.id), isNull(tickets.parentId)))
    .orderBy(tickets.status, ...recencyOrder(tickets));
}

async function selectProjectMilestoneTicketRows(database: DbClient, projectId: number): Promise<TicketRecordWithBoardPosition[]> {
  const milestoneRows = await database
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
    .orderBy(tickets.status, ...recencyOrder(tickets));

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

async function selectVisibleOwnerTicketRows(database: DbClient, owner: TicketOwner): Promise<TicketRecordWithBoardPosition[]> {
  const directRows = withVisibleParent(await selectOwnerTicketRows(database, owner), await visibleParentForOwner(database, owner, "direct"));
  if (owner.type !== "project") {
    return directRows;
  }

  const directIds = new Set(directRows.map((row) => row.id));
  const inheritedRows = (await selectProjectMilestoneTicketRows(database, owner.id)).filter((row) => !directIds.has(row.id));
  return [...directRows, ...inheritedRows];
}

function getOwnerTicketRow(rows: TicketRecordWithBoardPosition[], ticketId: number): TicketRecordWithBoardPosition | undefined {
  return rows.find((ticket) => ticket.id === ticketId);
}

async function nextOwnerPosition(database: DbClient, owner: TicketOwner, status: TicketRecord["status"]): Promise<number> {
  const rows = await selectOwnerTicketRows(database, owner);
  const filtered = rows.filter((ticket) => ticket.status === status);
  return filtered.reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

async function insertOwnerTicket(database: DbClient, owner: TicketOwner, ticketId: number, position: number): Promise<void> {
  if (owner.type === "project") {
    await database.insert(projectTickets).ignore().values({ ownerId: owner.id, ticketId, position });
    return;
  }
  if (owner.type === "task") {
    await database.insert(taskTickets).ignore().values({ ownerId: owner.id, ticketId, position });
    return;
  }
  if (owner.type === "milestone") {
    await database.insert(milestoneTickets).ignore().values({ ownerId: owner.id, ticketId, position });
    return;
  }
  if (owner.type === "feature") {
    await database.insert(featureTickets).ignore().values({ ownerId: owner.id, ticketId, position });
    return;
  }
  if (owner.type === "wikiPage") {
    await database.insert(wikiPageTickets).ignore().values({ ownerId: owner.id, ticketId, position });
    return;
  }
  await database.insert(useCaseTickets).ignore().values({ ownerId: owner.id, ticketId, position });
}

async function deleteOwnerTicketLink(database: DbClient, owner: TicketOwner, ticketId: number): Promise<number> {
  if (owner.type === "project") {
    return mutationAffectedRows(await database.delete(projectTickets).where(and(eq(projectTickets.ownerId, owner.id), eq(projectTickets.ticketId, ticketId))));
  }
  if (owner.type === "task") {
    return mutationAffectedRows(await database.delete(taskTickets).where(and(eq(taskTickets.ownerId, owner.id), eq(taskTickets.ticketId, ticketId))));
  }
  if (owner.type === "milestone") {
    return mutationAffectedRows(await database.delete(milestoneTickets).where(and(eq(milestoneTickets.ownerId, owner.id), eq(milestoneTickets.ticketId, ticketId))));
  }
  if (owner.type === "feature") {
    return mutationAffectedRows(await database.delete(featureTickets).where(and(eq(featureTickets.ownerId, owner.id), eq(featureTickets.ticketId, ticketId))));
  }
  if (owner.type === "wikiPage") {
    return mutationAffectedRows(await database.delete(wikiPageTickets).where(and(eq(wikiPageTickets.ownerId, owner.id), eq(wikiPageTickets.ticketId, ticketId))));
  }
  return mutationAffectedRows(await database.delete(useCaseTickets).where(and(eq(useCaseTickets.ownerId, owner.id), eq(useCaseTickets.ticketId, ticketId))));
}

function relationEntryId(sourceTicketId: number, targetTicketId: number, relationType: TicketRelationType, direction: "outgoing" | "incoming"): number {
  const relationOffset = relationType === "blocks" ? 1 : relationType === "related" ? 2 : 3;
  const directionOffset = direction === "outgoing" ? 0 : 5;
  return sourceTicketId * 1_000_000 + targetTicketId * 10 + relationOffset + directionOffset;
}

async function insertTicketRecord(database: DbClient, input: TicketInput, parentId: number | null = null, actor?: JournalActor | null): Promise<TicketRecord> {
  const title = requireNonEmpty(input.title, "title");
  const type = input.type ?? await resolveDefaultCatalogEntryKey(database, "ticketType", "bug");
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "workStatus", "open");
  const priority = input.priority ?? await resolveDefaultCatalogEntryKey(database, "priority", "medium");
  await ensureCatalogEntryExists(database, "ticketType", type);
  await ensureCatalogEntryExists(database, "workStatus", status);
  await ensureCatalogEntryExists(database, "priority", priority);
  const resolvedAt = await isCatalogEntryClosed(database, "workStatus", status) ? nowIso() : null;
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
      reporterUserId: await normalizeAssignableUserId(database, input.reporterUserId ?? actor?.actorUserId ?? null, "reporterUserId"),
      responsibleUserId: await normalizeAssignableUserId(database, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId"),
      environment: cleanNullable(input.environment) ?? null,
      affectedVersion: cleanNullable(input.affectedVersion) ?? null,
      dueDate: cleanNullable(input.dueDate) ?? null,
      resolvedAt,
      position: await nextPosition(database, status, parentId)
    },
    actor?.actorUserId ?? undefined
  );
}

async function ticketDeleteBlockers(database: DbClient, ticketId: number): Promise<string[]> {
  const blockers: string[] = [];

  const [projRow, taskRow, mileRow, featRow, ucRow, wikiRow, subRow, relRow] = await Promise.all([
    database.select({ ownerId: projectTickets.ownerId }).from(projectTickets).where(eq(projectTickets.ticketId, ticketId)).then(firstRow),
    database.select({ ownerId: taskTickets.ownerId }).from(taskTickets).where(eq(taskTickets.ticketId, ticketId)).then(firstRow),
    database.select({ ownerId: milestoneTickets.ownerId }).from(milestoneTickets).where(eq(milestoneTickets.ticketId, ticketId)).then(firstRow),
    database.select({ ownerId: featureTickets.ownerId }).from(featureTickets).where(eq(featureTickets.ticketId, ticketId)).then(firstRow),
    database.select({ ownerId: useCaseTickets.ownerId }).from(useCaseTickets).where(eq(useCaseTickets.ticketId, ticketId)).then(firstRow),
    database.select({ ownerId: wikiPageTickets.ownerId }).from(wikiPageTickets).where(eq(wikiPageTickets.ticketId, ticketId)).then(firstRow),
    database.select({ id: tickets.id }).from(tickets).where(eq(tickets.parentId, ticketId)).then(firstRow),
    database
      .select({ sourceTicketId: ticketRelations.sourceTicketId })
      .from(ticketRelations)
      .where(or(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, ticketId)))
      .then(firstRow)
  ]);

  if (projRow) blockers.push("Projekt-Verknüpfungen");
  if (taskRow) blockers.push("Aufgaben-Verknüpfungen");
  if (mileRow) blockers.push("Meilenstein-Verknüpfungen");
  if (featRow) blockers.push("Feature-Verknüpfungen");
  if (ucRow) blockers.push("Use-Case-Verknüpfungen");
  if (wikiRow) blockers.push("Wiki-Verknüpfungen");
  if (subRow) blockers.push("Sub-Tickets");
  if (relRow) blockers.push("Ticket-Relationen");

  return blockers;
}

export async function mapTicket(
  database: DbClient,
  record: TicketRecord,
  tags = getTicketTags(database, record.id),
  subTicketCount = getSubTicketCounts(database, [record.id]).then((m) => m.get(record.id) ?? 0),
  position = record.position,
  visibleParent?: VisibleParentContext | null,
  supportCounts = getTicketSupportCounts(database, [record.id]).then((m) => m.get(record.id) ?? emptySupportCounts)
): Promise<Ticket> {
  return {
    id: record.id,
    parentId: record.parentId,
    type: record.type,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    resolution: record.resolution,
    reporterUserId: record.reporterUserId,
    reporterUser: await getUserOption(database, record.reporterUserId),
    responsibleUserId: record.responsibleUserId,
    responsibleUser: await getUserOption(database, record.responsibleUserId),
    environment: record.environment,
    affectedVersion: record.affectedVersion,
    dueDate: record.dueDate,
    resolvedAt: record.resolvedAt,
    position,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags: await tags,
    subTicketCount: await subTicketCount,
    attachmentCount: (await supportCounts).attachmentCount,
    noteCount: (await supportCounts).noteCount,
    commentCount: (await supportCounts).commentCount,
    visibleParent
  };
}

export async function listTickets(database: DbClient): Promise<Ticket[]> {
  const rows = await ticketRepository.findRootTickets(database);
  const ids = rows.map((ticket) => ticket.id);
  const [tagsByTicket, subTicketCounts, supportCountsMap] = await Promise.all([
    getTicketTagsMap(database, ids),
    getSubTicketCounts(database, ids),
    getTicketSupportCounts(database, ids)
  ]);

  return Promise.all(rows.map((ticket) => mapTicket(database, ticket, Promise.resolve(tagsByTicket.get(ticket.id) ?? []), Promise.resolve(subTicketCounts.get(ticket.id) ?? 0), ticket.position, undefined, Promise.resolve(supportCountsMap.get(ticket.id) ?? emptySupportCounts))));
}

export async function listTicketLinkCandidates(database: DbClient, owner: TicketOwner | null, contextOwner?: TicketOwner | null): Promise<Ticket[]> {
  if (!owner && !contextOwner) {
    throw badRequest("Ticket link candidates require an owner or context owner");
  }
  if (owner) {
    await ensureOwnerExists(database, owner);
  }
  if (contextOwner) {
    await ensureOwnerExists(database, contextOwner);
  }
  const ownerTicketRows = owner ? await selectVisibleOwnerTicketRows(database, owner) : [];
  const linkedTicketIds = new Set(ownerTicketRows.map((ticket) => ticket.id));
  const closedStatusKeys = await listClosedCatalogEntryKeys(database, "workStatus");

  if (!owner && contextOwner?.type === "project") {
    const projectTickets = await listOwnerTickets(database, contextOwner);
    return projectTickets.filter((ticket) => !closedStatusKeys.has(ticket.status));
  }

  const allTickets = await listTickets(database);

  const compatibilityOwner = contextOwner ?? owner;
  if (!compatibilityOwner) {
    return [];
  }

  if (compatibilityOwner.type === "wikiPage") {
    return allTickets.filter((ticket) => !linkedTicketIds.has(ticket.id) && !closedStatusKeys.has(ticket.status));
  }

  const ownerContext = await ticketOwnerProjectContext(database, compatibilityOwner);

  const candidatePairs = await Promise.all(
    allTickets
      .filter((ticket) => !linkedTicketIds.has(ticket.id) && !closedStatusKeys.has(ticket.status))
      .map(async (ticket) => ({ ticket, context: await ticketProjectContext(database, ticket.id) }))
  );
  return candidatePairs.filter(({ context }) => projectContextsAreCompatible(ownerContext, context)).map(({ ticket }) => ticket);
}

export async function listOwnerTickets(database: DbClient, owner: TicketOwner): Promise<Ticket[]> {
  await ensureOwnerExists(database, owner);
  const rows = await selectVisibleOwnerTicketRows(database, owner);
  const ids = rows.map((ticket) => ticket.id);
  const [tagsByTicket, subTicketCounts, supportCountsMap] = await Promise.all([
    getTicketTagsMap(database, ids),
    getSubTicketCounts(database, ids),
    getTicketSupportCounts(database, ids)
  ]);

  return Promise.all(rows.map((ticket) => mapTicket(database, ticket, Promise.resolve(tagsByTicket.get(ticket.id) ?? []), Promise.resolve(subTicketCounts.get(ticket.id) ?? 0), ticket.boardPosition, ticket.visibleParent, Promise.resolve(supportCountsMap.get(ticket.id) ?? emptySupportCounts))));
}

export async function listProjectTickets(database: DbClient, projectId: number): Promise<Ticket[]> {
  return listOwnerTickets(database, { type: "project", id: projectId });
}

export async function listSubTickets(database: DbClient, parentId: number): Promise<Ticket[]> {
  await getTicketRecord(database, parentId);
  const rows = await ticketRepository.findChildren(database, parentId);
  const ids = rows.map((ticket) => ticket.id);
  const [tagsByTicket, subTicketCounts, supportCountsMap] = await Promise.all([
    getTicketTagsMap(database, ids),
    getSubTicketCounts(database, ids),
    getTicketSupportCounts(database, ids)
  ]);

  return Promise.all(rows.map((ticket) => mapTicket(database, ticket, Promise.resolve(tagsByTicket.get(ticket.id) ?? []), Promise.resolve(subTicketCounts.get(ticket.id) ?? 0), undefined, undefined, Promise.resolve(supportCountsMap.get(ticket.id) ?? emptySupportCounts))));
}

async function listDashboardTickets(database: DbClient, owner?: DashboardTicketOwner): Promise<Ticket[]> {
  if (!owner) {
    return listTickets(database);
  }
  if (owner.type === "project") {
    const seen = new Set<number>();
    return (await listOwnerTickets(database, owner)).filter((ticket) => {
      if (seen.has(ticket.id)) {
        return false;
      }
      seen.add(ticket.id);
      return true;
    });
  }
  return listOwnerTickets(database, owner);
}

function dateKey(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export async function getTicketStats(database: DbClient, owner?: DashboardTicketOwner): Promise<TicketStats> {
  const statusCounts: Record<string, number> = {};
  for (const ticket of await listDashboardTickets(database, owner)) {
    statusCounts[ticket.status] = (statusCounts[ticket.status] ?? 0) + 1;
  }
  return {
    statusCounts,
    total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
  };
}

export async function listRecentTickets(
  database: DbClient,
  options: { owner?: DashboardTicketOwner; limit?: number; sort?: "createdAt" | "updatedAt" } = {}
): Promise<Ticket[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const sort = options.sort ?? "updatedAt";
  const closedStatusKeys = await listClosedCatalogEntryKeys(database, "workStatus");
  return [...(await listDashboardTickets(database, options.owner))]
    .filter((ticket) => !closedStatusKeys.has(ticket.status))
    .sort((left, right) => dateKey(right[sort]) - dateKey(left[sort]) || right.id - left.id)
    .slice(0, limit);
}

async function ticketParentContexts(database: DbClient, ticket: TicketRecord): Promise<VisibleParentContext[]> {
  const contexts: VisibleParentContext[] = [];
  if (ticket.parentId !== null) {
    const parentTicket = firstRow(await database.select({ id: tickets.id, label: tickets.title }).from(tickets).where(eq(tickets.id, ticket.parentId)));
    if (parentTicket) {
      contexts.push({ type: "ticket", id: parentTicket.id, label: parentTicket.label, origin: "direct" });
    }
  }

  const [projectRows, milestoneRows, taskRows, featureRows, useCaseRows, wikiRows] = await Promise.all([
    database.select({ id: projects.id, label: projects.name }).from(projectTickets).innerJoin(projects, eq(projectTickets.ownerId, projects.id)).where(eq(projectTickets.ticketId, ticket.id)),
    database.select({ id: milestones.id, label: milestones.name }).from(milestoneTickets).innerJoin(milestones, eq(milestoneTickets.ownerId, milestones.id)).where(eq(milestoneTickets.ticketId, ticket.id)),
    database.select({ id: tasks.id, label: tasks.title }).from(taskTickets).innerJoin(tasks, eq(taskTickets.ownerId, tasks.id)).where(eq(taskTickets.ticketId, ticket.id)),
    database.select({ id: features.id, label: features.title }).from(featureTickets).innerJoin(features, eq(featureTickets.ownerId, features.id)).where(eq(featureTickets.ticketId, ticket.id)),
    database.select({ id: useCases.id, label: useCases.title }).from(useCaseTickets).innerJoin(useCases, eq(useCaseTickets.ownerId, useCases.id)).where(eq(useCaseTickets.ticketId, ticket.id)),
    database.select({ id: wikiPages.id, label: wikiPages.title }).from(wikiPageTickets).innerJoin(wikiPages, eq(wikiPageTickets.ownerId, wikiPages.id)).where(eq(wikiPageTickets.ticketId, ticket.id))
  ]);

  contexts.push(
    ...projectRows.map((row): VisibleParentContext => ({ type: "project", id: row.id, label: row.label, origin: "direct" })),
    ...milestoneRows.map((row): VisibleParentContext => ({ type: "milestone", id: row.id, label: row.label, origin: "direct" })),
    ...taskRows.map((row): VisibleParentContext => ({ type: "task", id: row.id, label: row.label, origin: "direct" })),
    ...featureRows.map((row): VisibleParentContext => ({ type: "feature", id: row.id, label: row.label, origin: "direct" })),
    ...useCaseRows.map((row): VisibleParentContext => ({ type: "useCase", id: row.id, label: row.label, origin: "direct" })),
    ...wikiRows.map((row): VisibleParentContext => ({ type: "wikiPage", id: row.id, label: row.label, origin: "direct" }))
  );

  return contexts;
}

export async function getTicketDetail(database: DbClient, id: number): Promise<TicketDetail> {
  const record = await getTicketRecord(database, id);
  const ticket = await mapTicket(database, record);

  return {
    ...ticket,
    parentContexts: await ticketParentContexts(database, record),
    comments: await listEntityComments(database, "ticket", id),
    notes: await listTicketNotes(database, id),
    attachments: await listTicketAttachments(database, id),
    relations: await listTicketRelations(database, id),
    subTickets: await listSubTickets(database, id)
  };
}

export async function createTicket(database: DbClient, input: TicketInput, actor?: JournalActor | null): Promise<Ticket> {
  const created = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = await insertTicketRecord(txDb, input, null, actor);
    const ticketObject = ticketJournalObject(ticket);
    await recordJournalEntry(txDb, { operation: "create", object: ticketObject, summary: buildCreateSummary(ticketObject), actor });
    return ticket;
  });
  return mapTicket(database, created, Promise.resolve([]), Promise.resolve(0));
}

export async function createOwnerTicket(database: DbClient, owner: TicketOwner, input: TicketInput, actor?: JournalActor | null): Promise<Ticket> {
  await ensureOwnerExists(database, owner);
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "workStatus", "open");
  const position = await nextOwnerPosition(database, owner, status);
  const created = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = await insertTicketRecord(txDb, input, null, actor);
    await insertOwnerTicket(txDb, owner, ticket.id, position);
    const ticketObject = ticketJournalObject(ticket);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "create",
      object: ticketObject,
      summary: buildCreateSummary(ticketObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return ticket;
  });

  return mapTicket(database, created, Promise.resolve([]), Promise.resolve(0), position);
}

export async function linkOwnerTicket(
  database: DbClient,
  owner: TicketOwner,
  ticketId: number,
  actor?: JournalActor | null,
  options: { conflictOnExisting?: boolean } = {}
): Promise<Ticket> {
  await ensureOwnerExists(database, owner);
  const ticket = await getTicketRecord(database, ticketId);
  if (ticket.parentId !== null) {
    throw badRequest("Sub-tickets cannot be linked to owners");
  }
  if ((await listClosedCatalogEntryKeys(database, "workStatus")).has(ticket.status)) {
    throw badRequest("Closed tickets cannot be linked to owners");
  }

  const ownerTicketRows = await selectOwnerTicketRows(database, owner);
  const existing = getOwnerTicketRow(ownerTicketRows, ticketId);
  if (existing) {
    if (options.conflictOnExisting === true) {
      throw conflict(`Ticket ${ticketId} is already linked to ${owner.type} ${owner.id}`);
    }
    return mapTicket(database, existing, undefined, undefined, existing.boardPosition);
  }

  if (owner.type !== "wikiPage") {
    assertCompatibleProjectContexts(await ticketOwnerProjectContext(database, owner), await ticketProjectContext(database, ticketId));
  }

  const position = await nextOwnerPosition(database, owner, ticket.status);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    await insertOwnerTicket(txDb, owner, ticketId, position);
    const ticketObject = ticketJournalObject(ticket);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "link",
      object: ticketObject,
      summary: buildLinkSummary(ownerObject, ticketObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
  return mapTicket(database, ticket, undefined, undefined, position);
}

export async function unlinkOwnerTicket(database: DbClient, owner: TicketOwner, ticketId: number, actor?: JournalActor | null): Promise<void> {
  await ensureOwnerExists(database, owner);
  const ticket = await getTicketRecord(database, ticketId);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = await deleteOwnerTicketLink(txDb, owner, ticketId);
    if (changes === 0) {
      throw notFound(`Ticket ${ticketId} is not linked to ${owner.type} ${owner.id}`);
    }
    const ticketObject = ticketJournalObject(ticket);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "unlink",
      object: ticketObject,
      summary: buildUnlinkSummary(ownerObject, ticketObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export async function createSubTicket(database: DbClient, parentId: number, input: TicketInput, actor?: JournalActor | null): Promise<Ticket> {
  const parent = await getTicketRecord(database, parentId);
  const created = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = await insertTicketRecord(txDb, { ...input, type: input.type ?? parent.type, priority: input.priority ?? parent.priority }, parentId, actor);
    const ticketObject = ticketJournalObject(ticket);
    const parentObject = ticketJournalObject(parent);
    await recordJournalEntry(txDb, {
      operation: "create",
      object: ticketObject,
      summary: buildCreateSummary(ticketObject),
      actor,
      contexts: [makeJournalContext(parentObject, "parent")]
    });
    return ticket;
  });
  return mapTicket(database, created, Promise.resolve([]), Promise.resolve(0));
}

export async function updateTicket(database: DbClient, id: number, input: TicketUpdate, actor?: JournalActor | null): Promise<Ticket> {
  const existing = await getTicketRecord(database, id);
  const values: Partial<
    Pick<
      TicketRecord,
      | "type"
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
    >
  > = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.type !== undefined) {
    await ensureCatalogEntryExists(database, "ticketType", input.type);
    values.type = input.type;
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.status !== undefined) {
    await ensureCatalogEntryExists(database, "workStatus", input.status);
    values.status = input.status;
    if (await isCatalogEntryClosed(database, "workStatus", input.status) && existing.resolvedAt === null && input.resolvedAt === undefined) {
      values.resolvedAt = nowIso();
    }
  }
  if (input.priority !== undefined) {
    await ensureCatalogEntryExists(database, "priority", input.priority);
    values.priority = input.priority;
  }
  if (input.resolution !== undefined) {
    values.resolution = input.resolution;
  }
  if (input.reporterUserId !== undefined) {
    values.reporterUserId = await normalizeAssignableUserId(database, input.reporterUserId, "reporterUserId");
  }
  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = await normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
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

  const updated = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const current = await getTicketRecord(txDb, id);
    const ticket = await ticketRepository.update(txDb, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!ticket) {
      throw notFound(`Ticket with id ${id} not found`);
    }
    const ticketObject = ticketJournalObject(ticket);
    const changes = buildJournalChanges(current, ticket, ticketJournalFields);
    await recordJournalEntry(txDb, {
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

export async function updateTicketPosition(database: DbClient, id: number, input: TicketPositionInput, actor?: JournalActor | null): Promise<Ticket> {
  const existing = await getTicketRecord(database, id);
  await ensureCatalogEntryExists(database, "workStatus", input.status);
  const values: Partial<Pick<TicketRecord, "status" | "position" | "resolvedAt">> = {
    status: input.status,
    position: input.position
  };

  if (await isCatalogEntryClosed(database, "workStatus", input.status) && existing.resolvedAt === null) {
    values.resolvedAt = nowIso();
  }

  const updated = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const ticket = await ticketRepository.update(txDb, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!ticket) {
      throw notFound(`Ticket with id ${id} not found`);
    }
    const ticketObject = ticketJournalObject(ticket);
    const changes = buildJournalChanges(existing, ticket, ticketJournalFields);
    await recordJournalEntry(txDb, { operation: "update", object: ticketObject, summary: buildUpdateSummary(ticketObject, changes), actor, changes });
    return ticket;
  });

  return mapTicket(database, updated);
}

export async function deleteTicket(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const ticket = await getTicketRecord(database, id);
  const blockers = await ticketDeleteBlockers(database, id);
  if (blockers.length > 0) {
    throw conflict(`Ticket kann nicht gelöscht werden, solange Beziehungen bestehen: ${blockers.join(", ")}.`);
  }

  const ticketIds = await collectTicketSubtreeIds(database, id);

  await deleteTicketAttachmentsForIds(database, ticketIds);
  await deleteTicketNotesForIds(database, ticketIds);
  await deleteTicketCommentsForIds(database, ticketIds);

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const ticketObject = ticketJournalObject(ticket);
    await recordJournalEntry(txDb, { operation: "delete", object: ticketObject, summary: buildDeleteSummary(ticketObject), actor });
    if (await ticketRepository.delete(txDb, id) === 0) {
      throw notFound(`Ticket with id ${id} not found`);
    }
  });
}

export async function listTicketRelations(database: DbClient, ticketId: number): Promise<TicketRelationEntry[]> {
  await getTicketRecord(database, ticketId);

  const [outgoing, incoming] = await Promise.all([
    database.select().from(ticketRelations).where(eq(ticketRelations.sourceTicketId, ticketId)),
    database.select().from(ticketRelations).where(eq(ticketRelations.targetTicketId, ticketId))
  ]);
  const relatedIds = [...outgoing.map((relation) => relation.targetTicketId), ...incoming.map((relation) => relation.sourceTicketId)];

  if (relatedIds.length === 0) {
    return [];
  }

  const relatedRows = await database.select().from(tickets).where(inArray(tickets.id, relatedIds));
  const relatedById = new Map(relatedRows.map((ticket) => [ticket.id, ticket]));
  const entries: TicketRelationEntry[] = [];

  for (const relation of outgoing) {
    const related = relatedById.get(relation.targetTicketId);
    if (related) {
      entries.push({
        id: relationEntryId(relation.sourceTicketId, relation.targetTicketId, relation.relationType, "outgoing"),
        relationType: relation.relationType,
        ticket: await mapTicket(database, related),
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
        ticket: await mapTicket(database, related),
        direction: "incoming"
      });
    }
  }

  return entries;
}

async function ticketRelationPeerIds(database: DbClient, ticketId: number): Promise<Set<number>> {
  const rows = await database
    .select({ sourceTicketId: ticketRelations.sourceTicketId, targetTicketId: ticketRelations.targetTicketId })
    .from(ticketRelations)
    .where(or(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, ticketId)));
  return new Set(rows.map((row) => (row.sourceTicketId === ticketId ? row.targetTicketId : row.sourceTicketId)));
}

export async function listTicketRelationCandidates(database: DbClient, ticketId: number): Promise<Ticket[]> {
  const source = await getTicketRecord(database, ticketId);
  const sourceContext = await ticketProjectContext(database, ticketId);
  const relatedTicketIds = await ticketRelationPeerIds(database, ticketId);
  const closedStatusKeys = await listClosedCatalogEntryKeys(database, "workStatus");
  if (closedStatusKeys.has(source.status)) {
    return [];
  }

  const allTickets = await listTickets(database);
  const candidatePairs = await Promise.all(
    allTickets
      .filter((ticket) => ticket.id !== ticketId && !relatedTicketIds.has(ticket.id) && !closedStatusKeys.has(ticket.status))
      .map(async (ticket) => ({ ticket, context: await ticketProjectContext(database, ticket.id) }))
  );
  return candidatePairs.filter(({ context }) => projectContextsAreCompatible(sourceContext, context)).map(({ ticket }) => ticket);
}

export async function addTicketRelation(database: DbClient, ticketId: number, input: TicketRelationInput, actor?: JournalActor | null): Promise<void> {
  const source = await getTicketRecord(database, ticketId);
  const target = await getTicketRecord(database, input.targetTicketId);
  const closedStatusKeys = await listClosedCatalogEntryKeys(database, "workStatus");

  if (ticketId === input.targetTicketId) {
    throw badRequest("Ticket cannot be related to itself");
  }
  if (closedStatusKeys.has(source.status) || closedStatusKeys.has(target.status)) {
    throw badRequest("Closed tickets cannot be linked to tickets");
  }

  const existing = firstRow(await database
    .select()
    .from(ticketRelations)
    .where(
      and(
        eq(ticketRelations.sourceTicketId, ticketId),
        eq(ticketRelations.targetTicketId, input.targetTicketId),
        eq(ticketRelations.relationType, input.relationType)
      )
    ));

  if (existing) {
    throw badRequest("Ticket relation already exists");
  }

  assertCompatibleProjectContexts(await ticketProjectContext(database, ticketId), await ticketProjectContext(database, input.targetTicketId));

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    await txDb
      .insert(ticketRelations)
      .values({
        sourceTicketId: ticketId,
        targetTicketId: input.targetTicketId,
        relationType: input.relationType,
        createdAt: nowIso()
      });
    const sourceObject = ticketJournalObject(source);
    const targetObject = ticketJournalObject(target);
    await recordJournalEntry(txDb, {
      operation: "link",
      object: sourceObject,
      summary: buildLinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });
}

export async function removeTicketRelation(database: DbClient, ticketId: number, targetTicketId: number, relationType: TicketRelationType, actor?: JournalActor | null): Promise<void> {
  const source = await getTicketRecord(database, ticketId);
  const target = await getTicketRecord(database, targetTicketId);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const result = await txDb
      .delete(ticketRelations)
      .where(
        and(
          eq(ticketRelations.relationType, relationType),
          or(
            and(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, targetTicketId)),
            and(eq(ticketRelations.sourceTicketId, targetTicketId), eq(ticketRelations.targetTicketId, ticketId))
          )
        )
      );

    if (mutationAffectedRows(result) === 0) {
      throw notFound("Ticket relation not found");
    }
    const sourceObject = ticketJournalObject(source);
    const targetObject = ticketJournalObject(target);
    await recordJournalEntry(txDb, {
      operation: "unlink",
      object: sourceObject,
      summary: buildUnlinkSummary(sourceObject, targetObject),
      actor,
      contexts: [makeJournalContext(targetObject, "related")]
    });
  });
}
