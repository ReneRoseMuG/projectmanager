import type { MoveOwner, Note, NoteInput, NoteMoveInput, NoteUpdate, VisibleParentContext } from "@taskmanager/shared-types";
import { and, eq, inArray } from "drizzle-orm";
import type { DbClient, DbSession } from "../db/client.js";
import { firstRow, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { dayPlanNotes, dayPlans, milestoneNotes, milestones, notes, projectNotes, projects, taskNotes, tasks, ticketNotes, tickets, wikiPageNotes, wikiPages } from "../db/schema.js";
import { dayPlanRepository } from "../repositories/day-plan.repository.js";
import { noteRepository, type NoteRecord, type NoteUpdateData } from "../repositories/note.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { parseJsonObject, stringifyJsonObject } from "./helpers.js";
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
import { normalizeNoteContentJson } from "./rich-text.service.js";

type MappableNoteRecord = Pick<NoteRecord, "id" | "title" | "contentJson" | "version" | "createdAt" | "updatedAt">;
type NoteOwner = { type: "project" | "milestone" | "task" | "dayPlan" | "ticket" | "wikiPage"; id: number };

const noteJournalFields: Array<JournalFieldDefinition<NoteRecord>> = [
  { key: "title", label: "Titel" },
  { key: "contentJson", label: "Inhalt", format: () => "geändert" }
];

function mapNote(record: MappableNoteRecord, parentContexts?: VisibleParentContext[]): Note {
  return {
    id: record.id,
    title: record.title,
    contentJson: parseJsonObject(record.contentJson),
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(parentContexts ? { parentContexts } : {})
  };
}

function cleanTitle(title: string | undefined): string {
  const trimmed = title?.trim() ?? "";
  return trimmed || "Ohne Titel";
}

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

async function ensureTicketExists(database: DbClient, ticketId: number): Promise<void> {
  const ticket = firstRow(await database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)));
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
}

async function ensureDayPlanOwnedByUser(database: DbClient, dayPlanId: number, userId: number): Promise<void> {
  const dayPlan = firstRow(await database.select({ id: dayPlans.id }).from(dayPlans).where(and(eq(dayPlans.id, dayPlanId), eq(dayPlans.userId, userId))));
  if (!dayPlan) {
    throw notFound("Day plan not found");
  }
}

async function ensureWikiPageExists(database: DbClient, wikiPageId: number): Promise<void> {
  const wikiPage = firstRow(await database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)));
  if (!wikiPage) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
  }
}

function noteJournalObject(note: Pick<NoteRecord, "id" | "title">): JournalObjectRef {
  return makeJournalObject("note", note.id, note.title);
}

async function getOwnerJournalObject(database: DbSession, owner: NoteOwner): Promise<JournalObjectRef> {
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
  if (owner.type === "dayPlan") {
    const dayPlan = firstRow(await database.select({ date: dayPlans.date }).from(dayPlans).where(eq(dayPlans.id, owner.id)));
    return makeJournalObject("dayPlan", owner.id, dayPlan?.date ? `Persönliche Planung ${dayPlan.date}` : `Persönliche Planung ${owner.id}`);
  }
  if (owner.type === "wikiPage") {
    const wikiPage = firstRow(await database.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, owner.id)));
    return makeJournalObject("wikiPage", owner.id, wikiPage?.title ?? `Wiki-Seite ${owner.id}`);
  }
  const ticket = firstRow(await database.select({ title: tickets.title }).from(tickets).where(eq(tickets.id, owner.id)));
  return makeJournalObject("ticket", owner.id, ticket?.title ?? `Ticket ${owner.id}`);
}

async function ownerContext(database: DbSession, owner: NoteOwner) {
  return makeJournalContext(await getOwnerJournalObject(database, owner), "owner");
}

async function noteParentContext(database: DbSession, owner: NoteOwner): Promise<VisibleParentContext> {
  const object = await getOwnerJournalObject(database, owner);
  return {
    type: owner.type,
    id: owner.id,
    label: object.label,
    origin: "direct"
  };
}

async function listNoteOwners(database: DbSession, noteId: number): Promise<NoteOwner[]> {
  const projectRows = await database.select({ id: projectNotes.projectId }).from(projectNotes).where(eq(projectNotes.noteId, noteId));
  const milestoneRows = await database.select({ id: milestoneNotes.milestoneId }).from(milestoneNotes).where(eq(milestoneNotes.noteId, noteId));
  const taskRows = await database.select({ id: taskNotes.taskId }).from(taskNotes).where(eq(taskNotes.noteId, noteId));
  const dayPlanRows = await database.select({ id: dayPlanNotes.dayPlanId }).from(dayPlanNotes).where(eq(dayPlanNotes.noteId, noteId));
  const ticketRows = await database.select({ id: ticketNotes.ticketId }).from(ticketNotes).where(eq(ticketNotes.noteId, noteId));
  const wikiPageRows = await database.select({ id: wikiPageNotes.wikiPageId }).from(wikiPageNotes).where(eq(wikiPageNotes.noteId, noteId));
  return [
    ...projectRows.map((row) => ({ type: "project" as const, id: row.id })),
    ...milestoneRows.map((row) => ({ type: "milestone" as const, id: row.id })),
    ...taskRows.map((row) => ({ type: "task" as const, id: row.id })),
    ...dayPlanRows.map((row) => ({ type: "dayPlan" as const, id: row.id })),
    ...ticketRows.map((row) => ({ type: "ticket" as const, id: row.id })),
    ...wikiPageRows.map((row) => ({ type: "wikiPage" as const, id: row.id }))
  ];
}

function addParentContext(
  contextsByNoteId: Map<number, VisibleParentContext[]>,
  noteId: number,
  context: VisibleParentContext
): void {
  const contexts = contextsByNoteId.get(noteId) ?? [];
  contexts.push(context);
  contextsByNoteId.set(noteId, contexts);
}

async function listParentContextsByNoteId(database: DbSession, noteIds: number[]): Promise<Map<number, VisibleParentContext[]>> {
  const uniqueNoteIds = [...new Set(noteIds)];
  const contextsByNoteId = new Map<number, VisibleParentContext[]>();
  if (uniqueNoteIds.length === 0) {
    return contextsByNoteId;
  }

  const projectRows = await database
    .select({ noteId: projectNotes.noteId, id: projectNotes.projectId, label: projects.name })
    .from(projectNotes)
    .innerJoin(projects, eq(projectNotes.projectId, projects.id))
    .where(inArray(projectNotes.noteId, uniqueNoteIds));
  projectRows.forEach((row) => addParentContext(contextsByNoteId, row.noteId, { type: "project", id: row.id, label: row.label, origin: "direct" }));

  const milestoneRows = await database
    .select({ noteId: milestoneNotes.noteId, id: milestoneNotes.milestoneId, label: milestones.name })
    .from(milestoneNotes)
    .innerJoin(milestones, eq(milestoneNotes.milestoneId, milestones.id))
    .where(inArray(milestoneNotes.noteId, uniqueNoteIds));
  milestoneRows.forEach((row) => addParentContext(contextsByNoteId, row.noteId, { type: "milestone", id: row.id, label: row.label, origin: "direct" }));

  const taskRows = await database
    .select({ noteId: taskNotes.noteId, id: taskNotes.taskId, label: tasks.title })
    .from(taskNotes)
    .innerJoin(tasks, eq(taskNotes.taskId, tasks.id))
    .where(inArray(taskNotes.noteId, uniqueNoteIds));
  taskRows.forEach((row) => addParentContext(contextsByNoteId, row.noteId, { type: "task", id: row.id, label: row.label, origin: "direct" }));

  const dayPlanRows = await database
    .select({ noteId: dayPlanNotes.noteId, id: dayPlanNotes.dayPlanId, date: dayPlans.date })
    .from(dayPlanNotes)
    .innerJoin(dayPlans, eq(dayPlanNotes.dayPlanId, dayPlans.id))
    .where(inArray(dayPlanNotes.noteId, uniqueNoteIds));
  dayPlanRows.forEach((row) =>
    addParentContext(contextsByNoteId, row.noteId, {
      type: "dayPlan",
      id: row.id,
      label: row.date ? `Persönliche Planung ${row.date}` : `Persönliche Planung ${row.id}`,
      origin: "direct"
    })
  );

  const ticketRows = await database
    .select({ noteId: ticketNotes.noteId, id: ticketNotes.ticketId, label: tickets.title })
    .from(ticketNotes)
    .innerJoin(tickets, eq(ticketNotes.ticketId, tickets.id))
    .where(inArray(ticketNotes.noteId, uniqueNoteIds));
  ticketRows.forEach((row) => addParentContext(contextsByNoteId, row.noteId, { type: "ticket", id: row.id, label: row.label, origin: "direct" }));

  const wikiPageRows = await database
    .select({ noteId: wikiPageNotes.noteId, id: wikiPageNotes.wikiPageId, label: wikiPages.title })
    .from(wikiPageNotes)
    .innerJoin(wikiPages, eq(wikiPageNotes.wikiPageId, wikiPages.id))
    .where(inArray(wikiPageNotes.noteId, uniqueNoteIds));
  wikiPageRows.forEach((row) => addParentContext(contextsByNoteId, row.noteId, { type: "wikiPage", id: row.id, label: row.label, origin: "direct" }));

  return contextsByNoteId;
}

export async function listProjectNotes(database: DbClient, projectId: number): Promise<Note[]> {
  await ensureProjectExists(database, projectId);
  const rows = await database
    .select({
      id: notes.id,
      title: notes.title,
      contentJson: notes.contentJson,
      version: notes.version,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt
    })
    .from(projectNotes)
    .innerJoin(notes, eq(projectNotes.noteId, notes.id))
    .where(eq(projectNotes.projectId, projectId))
    .orderBy(...recencyOrder(notes));

  return rows.map((row) => mapNote(row));
}

export async function listTaskNotes(database: DbClient, taskId: number): Promise<Note[]> {
  await ensureTaskExists(database, taskId);
  const rows = await database
    .select({
      id: notes.id,
      title: notes.title,
      contentJson: notes.contentJson,
      version: notes.version,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt
    })
    .from(taskNotes)
    .innerJoin(notes, eq(taskNotes.noteId, notes.id))
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(...recencyOrder(notes));

  return rows.map((row) => mapNote(row));
}

export async function listMilestoneNotes(database: DbClient, milestoneId: number): Promise<Note[]> {
  await ensureMilestoneExists(database, milestoneId);
  const rows = await database
    .select({
      id: notes.id,
      title: notes.title,
      contentJson: notes.contentJson,
      version: notes.version,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt
    })
    .from(milestoneNotes)
    .innerJoin(notes, eq(milestoneNotes.noteId, notes.id))
    .where(eq(milestoneNotes.milestoneId, milestoneId))
    .orderBy(...recencyOrder(notes));

  return rows.map((row) => mapNote(row));
}

export async function listTicketNotes(database: DbClient, ticketId: number): Promise<Note[]> {
  await ensureTicketExists(database, ticketId);
  const rows = await database
    .select({
      id: notes.id,
      title: notes.title,
      contentJson: notes.contentJson,
      version: notes.version,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt
    })
    .from(ticketNotes)
    .innerJoin(notes, eq(ticketNotes.noteId, notes.id))
    .where(eq(ticketNotes.ticketId, ticketId))
    .orderBy(...recencyOrder(notes));

  return rows.map((row) => mapNote(row));
}

export async function listDayPlanNotes(database: DbClient, dayPlanId: number, userId: number): Promise<Note[]> {
  await ensureDayPlanOwnedByUser(database, dayPlanId, userId);
  return (await dayPlanRepository.listNotes(database, dayPlanId)).map((row) => mapNote(row));
}

export async function listWikiPageNotes(database: DbClient, wikiPageId: number): Promise<Note[]> {
  await ensureWikiPageExists(database, wikiPageId);
  const rows = await database
    .select({
      id: notes.id,
      title: notes.title,
      contentJson: notes.contentJson,
      version: notes.version,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt
    })
    .from(wikiPageNotes)
    .innerJoin(notes, eq(wikiPageNotes.noteId, notes.id))
    .where(eq(wikiPageNotes.wikiPageId, wikiPageId))
    .orderBy(...recencyOrder(notes));

  return rows.map((row) => mapNote(row));
}

export async function listNotes(database: DbClient): Promise<Note[]> {
  const rows = await database
    .select({
      id: notes.id,
      title: notes.title,
      contentJson: notes.contentJson,
      version: notes.version,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt
    })
    .from(notes)
    .orderBy(...recencyOrder(notes));

  const parentContextsByNoteId = await listParentContextsByNoteId(database, rows.map((row) => row.id));

  return rows.map((row) => mapNote(row, parentContextsByNoteId.get(row.id) ?? []));
}

export async function createProjectNote(database: DbClient, projectId: number, input: NoteInput, actor?: JournalActor | null): Promise<Note> {
  await ensureProjectExists(database, projectId);
  const created = await database.transaction(async (tx) => {
    const note = await noteRepository.create(tx, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(normalizeNoteContentJson(input.contentJson))
    }, actor?.actorUserId ?? undefined);
    await tx.insert(projectNotes).values({ projectId, noteId: note.id });
    const noteObject = noteJournalObject(note);
    await recordJournalEntry(tx, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [await ownerContext(tx, { type: "project", id: projectId })] });
    return note;
  });

  return mapNote(created);
}

export async function createTaskNote(database: DbClient, taskId: number, input: NoteInput, actor?: JournalActor | null): Promise<Note> {
  await ensureTaskExists(database, taskId);
  const created = await database.transaction(async (tx) => {
    const note = await noteRepository.create(tx, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(normalizeNoteContentJson(input.contentJson))
    }, actor?.actorUserId ?? undefined);
    await tx.insert(taskNotes).values({ taskId, noteId: note.id });
    const noteObject = noteJournalObject(note);
    await recordJournalEntry(tx, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [await ownerContext(tx, { type: "task", id: taskId })] });
    return note;
  });

  return mapNote(created);
}

export async function createMilestoneNote(database: DbClient, milestoneId: number, input: NoteInput, actor?: JournalActor | null): Promise<Note> {
  await ensureMilestoneExists(database, milestoneId);
  const created = await database.transaction(async (tx) => {
    const note = await noteRepository.create(tx, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(normalizeNoteContentJson(input.contentJson))
    }, actor?.actorUserId ?? undefined);
    await tx.insert(milestoneNotes).values({ milestoneId, noteId: note.id });
    const noteObject = noteJournalObject(note);
    await recordJournalEntry(tx, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [await ownerContext(tx, { type: "milestone", id: milestoneId })] });
    return note;
  });

  return mapNote(created);
}

export async function createTicketNote(database: DbClient, ticketId: number, input: NoteInput, actor?: JournalActor | null): Promise<Note> {
  await ensureTicketExists(database, ticketId);
  const created = await database.transaction(async (tx) => {
    const note = await noteRepository.create(tx, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(normalizeNoteContentJson(input.contentJson))
    }, actor?.actorUserId ?? undefined);
    await tx.insert(ticketNotes).values({ ticketId, noteId: note.id });
    const noteObject = noteJournalObject(note);
    await recordJournalEntry(tx, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [await ownerContext(tx, { type: "ticket", id: ticketId })] });
    return note;
  });

  return mapNote(created);
}

export async function createDayPlanNote(database: DbClient, dayPlanId: number, userId: number, input: NoteInput, actor?: JournalActor | null): Promise<Note> {
  await ensureDayPlanOwnedByUser(database, dayPlanId, userId);
  const created = await database.transaction(async (tx) => {
    const note = await noteRepository.create(tx, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(normalizeNoteContentJson(input.contentJson))
    }, actor?.actorUserId ?? undefined);
    await dayPlanRepository.addNote(tx, dayPlanId, note.id);
    const noteObject = noteJournalObject(note);
    await recordJournalEntry(tx, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [await ownerContext(tx, { type: "dayPlan", id: dayPlanId })] });
    return note;
  });

  return mapNote(created);
}

export async function createWikiPageNote(database: DbClient, wikiPageId: number, input: NoteInput, actor?: JournalActor | null): Promise<Note> {
  await ensureWikiPageExists(database, wikiPageId);
  const created = await database.transaction(async (tx) => {
    const note = await noteRepository.create(tx, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(normalizeNoteContentJson(input.contentJson))
    }, actor?.actorUserId ?? undefined);
    await tx.insert(wikiPageNotes).values({ wikiPageId, noteId: note.id });
    const noteObject = noteJournalObject(note);
    await recordJournalEntry(tx, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [await ownerContext(tx, { type: "wikiPage", id: wikiPageId })] });
    return note;
  });

  return mapNote(created);
}

export async function linkDayPlanNote(database: DbClient, dayPlanId: number, noteId: number, userId: number, actor?: JournalActor | null): Promise<Note> {
  await ensureDayPlanOwnedByUser(database, dayPlanId, userId);
  const note = await noteRepository.findById(database, noteId);
  if (!note) {
    throw notFound(`Note with id ${noteId} not found`);
  }
  await database.transaction(async (tx) => {
    await dayPlanRepository.addNote(tx, dayPlanId, noteId);
    const noteObject = noteJournalObject(note);
    const ownerObject = await getOwnerJournalObject(tx, { type: "dayPlan", id: dayPlanId });
    await recordJournalEntry(tx, { operation: "link", object: noteObject, summary: buildLinkSummary(ownerObject, noteObject), actor, contexts: [makeJournalContext(ownerObject, "owner")] });
  });
  return mapNote(note);
}

type MovableNoteOwner = MoveOwner<"project" | "milestone" | "task" | "ticket">;

function sameNoteOwner(a: MovableNoteOwner, b: MovableNoteOwner): boolean {
  return a.type === b.type && a.id === b.id;
}

async function ensureMovableNoteOwnerExists(database: DbClient, owner: MovableNoteOwner): Promise<void> {
  if (owner.type === "project") {
    await ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    await ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "task") {
    await ensureTaskExists(database, owner.id);
    return;
  }
  await ensureTicketExists(database, owner.id);
}

async function hasNoteOwner(database: DbSession, owner: MovableNoteOwner, noteId: number): Promise<boolean> {
  if (owner.type === "project") {
    return Boolean(firstRow(await database.select({ noteId: projectNotes.noteId }).from(projectNotes).where(and(eq(projectNotes.projectId, owner.id), eq(projectNotes.noteId, noteId)))));
  }
  if (owner.type === "milestone") {
    return Boolean(firstRow(await database.select({ noteId: milestoneNotes.noteId }).from(milestoneNotes).where(and(eq(milestoneNotes.milestoneId, owner.id), eq(milestoneNotes.noteId, noteId)))));
  }
  if (owner.type === "task") {
    return Boolean(firstRow(await database.select({ noteId: taskNotes.noteId }).from(taskNotes).where(and(eq(taskNotes.taskId, owner.id), eq(taskNotes.noteId, noteId)))));
  }
  return Boolean(firstRow(await database.select({ noteId: ticketNotes.noteId }).from(ticketNotes).where(and(eq(ticketNotes.ticketId, owner.id), eq(ticketNotes.noteId, noteId)))));
}

async function insertNoteOwner(database: DbSession, owner: MovableNoteOwner, noteId: number): Promise<void> {
  if (await hasNoteOwner(database, owner, noteId)) {
    return;
  }
  if (owner.type === "project") {
    await database.insert(projectNotes).values({ projectId: owner.id, noteId });
    return;
  }
  if (owner.type === "milestone") {
    await database.insert(milestoneNotes).values({ milestoneId: owner.id, noteId });
    return;
  }
  if (owner.type === "task") {
    await database.insert(taskNotes).values({ taskId: owner.id, noteId });
    return;
  }
  await database.insert(ticketNotes).values({ ticketId: owner.id, noteId });
}

async function deleteNoteOwner(database: DbSession, owner: MovableNoteOwner, noteId: number): Promise<number> {
  if (owner.type === "project") {
    return mutationAffectedRows(await database.delete(projectNotes).where(and(eq(projectNotes.projectId, owner.id), eq(projectNotes.noteId, noteId))));
  }
  if (owner.type === "milestone") {
    return mutationAffectedRows(await database.delete(milestoneNotes).where(and(eq(milestoneNotes.milestoneId, owner.id), eq(milestoneNotes.noteId, noteId))));
  }
  if (owner.type === "task") {
    return mutationAffectedRows(await database.delete(taskNotes).where(and(eq(taskNotes.taskId, owner.id), eq(taskNotes.noteId, noteId))));
  }
  return mutationAffectedRows(await database.delete(ticketNotes).where(and(eq(ticketNotes.ticketId, owner.id), eq(ticketNotes.noteId, noteId))));
}

export async function moveNote(database: DbClient, id: number, input: NoteMoveInput, actor?: JournalActor | null): Promise<Note> {
  if (sameNoteOwner(input.source, input.target)) {
    throw badRequest("Quelle und Ziel dürfen nicht identisch sein");
  }
  await ensureMovableNoteOwnerExists(database, input.source);
  await ensureMovableNoteOwnerExists(database, input.target);
  const note = await noteRepository.findById(database, id);
  if (!note) {
    throw notFound(`Note with id ${id} not found`);
  }
  if (!(await hasNoteOwner(database, input.source, id))) {
    throw notFound(`Note ${id} is not linked to ${input.source.type} ${input.source.id}`);
  }

  await database.transaction(async (tx) => {
    const deleted = await deleteNoteOwner(tx, input.source, id);
    if (deleted === 0) {
      throw notFound(`Note ${id} is not linked to ${input.source.type} ${input.source.id}`);
    }
    await insertNoteOwner(tx, input.target, id);
    const noteObject = noteJournalObject(note);
    const sourceObject = await getOwnerJournalObject(tx, input.source);
    const targetObject = await getOwnerJournalObject(tx, input.target);
    await recordJournalEntry(tx, {
      operation: "update",
      object: noteObject,
      summary: `Notiz "${note.title}" verschoben`,
      actor,
      contexts: [makeJournalContext(sourceObject, "owner"), makeJournalContext(targetObject, "owner")]
    });
  });

  return getNote(database, id);
}

export async function getNote(database: DbClient, id: number): Promise<Note> {
  const note = await noteRepository.findById(database, id);
  if (!note) {
    throw notFound(`Note with id ${id} not found`);
  }

  const parentContexts = await Promise.all((await listNoteOwners(database, id)).map((owner) => noteParentContext(database, owner)));
  return mapNote(note, parentContexts);
}

export async function updateNote(database: DbClient, id: number, input: NoteUpdate, actor?: JournalActor | null): Promise<Note> {
  const values: NoteUpdateData = {};

  if (input.title !== undefined) {
    values.title = cleanTitle(input.title);
  }
  if (input.contentJson !== undefined) {
    values.contentJson = stringifyJsonObject(normalizeNoteContentJson(input.contentJson));
  }
  if (Object.keys(values).length === 0) {
    throw badRequest("No note fields provided");
  }

  const updated = await database.transaction(async (tx) => {
    const current = await noteRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Note with id ${id} not found`);
    }
    const note = await noteRepository.update(tx, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!note) {
      throw notFound(`Note with id ${id} not found`);
    }
    const noteObject = noteJournalObject(note);
    const changes = buildJournalChanges(current, note, noteJournalFields);
    await recordJournalEntry(tx, {
      operation: "update",
      object: noteObject,
      summary: buildUpdateSummary(noteObject, changes),
      actor,
      changes,
      contexts: await Promise.all((await listNoteOwners(tx, id)).map((owner) => ownerContext(tx, owner)))
    });
    return note;
  });

  return mapNote(updated);
}

export async function deleteNote(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const note = await noteRepository.findById(database, id);
  if (!note) {
    throw notFound(`Note with id ${id} not found`);
  }
  const owners = await listNoteOwners(database, id);
  await database.transaction(async (tx) => {
    const noteObject = noteJournalObject(note);
    await recordJournalEntry(tx, { operation: "delete", object: noteObject, summary: buildDeleteSummary(noteObject), actor, contexts: await Promise.all(owners.map((owner) => ownerContext(tx, owner))) });
    if ((await noteRepository.delete(tx, id)) === 0) {
      throw notFound(`Note with id ${id} not found`);
    }
  });
}

async function deleteNotesByIds(database: DbClient, noteIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(noteIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  await noteRepository.deleteByIds(database, uniqueIds);
}

export async function deleteProjectNotesForIds(database: DbClient, projectIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(projectIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await database.select({ noteId: projectNotes.noteId }).from(projectNotes).where(inArray(projectNotes.projectId, uniqueIds));
  await deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export async function deleteTaskNotesForIds(database: DbClient, taskIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(taskIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await database.select({ noteId: taskNotes.noteId }).from(taskNotes).where(inArray(taskNotes.taskId, uniqueIds));
  await deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export async function deleteMilestoneNotesForIds(database: DbClient, milestoneIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(milestoneIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await database.select({ noteId: milestoneNotes.noteId }).from(milestoneNotes).where(inArray(milestoneNotes.milestoneId, uniqueIds));
  await deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export async function deleteTicketNotesForIds(database: DbClient, ticketIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(ticketIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await database.select({ noteId: ticketNotes.noteId }).from(ticketNotes).where(inArray(ticketNotes.ticketId, uniqueIds));
  await deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export async function deleteDayPlanNotesForIds(database: DbClient, dayPlanIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(dayPlanIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await database.select({ noteId: dayPlanNotes.noteId }).from(dayPlanNotes).where(inArray(dayPlanNotes.dayPlanId, uniqueIds));
  await deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export async function deleteWikiPageNotesForIds(database: DbClient, wikiPageIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(wikiPageIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await database.select({ noteId: wikiPageNotes.noteId }).from(wikiPageNotes).where(inArray(wikiPageNotes.wikiPageId, uniqueIds));
  await deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export async function deleteDayPlanNote(database: DbClient, dayPlanId: number, noteId: number, userId: number, actor?: JournalActor | null): Promise<void> {
  await ensureDayPlanOwnedByUser(database, dayPlanId, userId);
  const note = await noteRepository.findById(database, noteId);
  if (!note) {
    throw notFound(`Note with id ${noteId} not found`);
  }
  const result = await database.transaction(async (tx) => {
    const deletedLink = await dayPlanRepository.removeNote(tx, dayPlanId, noteId);
    if (deletedLink > 0) {
      const noteObject = noteJournalObject(note);
      const ownerObject = await getOwnerJournalObject(tx, { type: "dayPlan", id: dayPlanId });
      await recordJournalEntry(tx, { operation: "unlink", object: noteObject, summary: buildUnlinkSummary(ownerObject, noteObject), actor, contexts: [makeJournalContext(ownerObject, "owner")] });
    }
    return deletedLink;
  });

  if (result === 0) {
    throw notFound(`Note with id ${noteId} not found`);
  }
}

export async function deleteTicketNote(database: DbClient, ticketId: number, noteId: number, actor?: JournalActor | null): Promise<void> {
  await ensureTicketExists(database, ticketId);
  const note = await noteRepository.findById(database, noteId);
  if (!note) {
    throw notFound(`Note with id ${noteId} not found`);
  }
  const result = await database.transaction(async (tx) => {
    const deletedLink = await tx.delete(ticketNotes).where(and(eq(ticketNotes.ticketId, ticketId), eq(ticketNotes.noteId, noteId)));
    if (mutationAffectedRows(deletedLink) > 0) {
      const noteObject = noteJournalObject(note);
      const ticketObject = await getOwnerJournalObject(tx, { type: "ticket", id: ticketId });
      await recordJournalEntry(tx, { operation: "unlink", object: noteObject, summary: buildUnlinkSummary(ticketObject, noteObject), actor, contexts: [makeJournalContext(ticketObject, "owner")] });
      await tx.delete(notes).where(eq(notes.id, noteId));
    }
    return deletedLink;
  });

  if (mutationAffectedRows(result) === 0) {
    throw notFound(`Note with id ${noteId} not found`);
  }
}
