import type { Note, NoteInput, NoteUpdate } from "@taskmanager/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { milestoneNotes, milestones, notes, projectNotes, projects, taskNotes, tasks, ticketNotes, tickets } from "../db/schema.js";
import { noteRepository, type NoteRecord, type NoteUpdateData } from "../repositories/note.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { parseJsonObject, stringifyJsonObject } from "./helpers.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildUnlinkSummary,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";

type MappableNoteRecord = Pick<NoteRecord, "id" | "title" | "contentJson" | "version" | "createdAt" | "updatedAt">;
type NoteOwner = { type: "project" | "milestone" | "task" | "ticket"; id: number };

const noteJournalFields: Array<JournalFieldDefinition<NoteRecord>> = [
  { key: "title", label: "Titel" },
  { key: "contentJson", label: "Inhalt", format: () => "geändert" }
];

function mapNote(record: MappableNoteRecord): Note {
  return {
    id: record.id,
    title: record.title,
    contentJson: parseJsonObject(record.contentJson),
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function cleanTitle(title: string | undefined): string {
  const trimmed = title?.trim() ?? "";
  return trimmed || "Ohne Titel";
}

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

function ensureTicketExists(database: DbClient, ticketId: number): void {
  const ticket = database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
}

function noteJournalObject(note: Pick<NoteRecord, "id" | "title">): JournalObjectRef {
  return makeJournalObject("note", note.id, note.title);
}

function getOwnerJournalObject(database: DbClient, owner: NoteOwner): JournalObjectRef {
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
  const ticket = database.select({ title: tickets.title }).from(tickets).where(eq(tickets.id, owner.id)).get();
  return makeJournalObject("ticket", owner.id, ticket?.title ?? `Ticket ${owner.id}`);
}

function ownerContext(database: DbClient, owner: NoteOwner) {
  return makeJournalContext(getOwnerJournalObject(database, owner), "owner");
}

function listNoteOwners(database: DbClient, noteId: number): NoteOwner[] {
  return [
    ...database.select({ id: projectNotes.projectId }).from(projectNotes).where(eq(projectNotes.noteId, noteId)).all().map((row) => ({ type: "project" as const, id: row.id })),
    ...database.select({ id: milestoneNotes.milestoneId }).from(milestoneNotes).where(eq(milestoneNotes.noteId, noteId)).all().map((row) => ({ type: "milestone" as const, id: row.id })),
    ...database.select({ id: taskNotes.taskId }).from(taskNotes).where(eq(taskNotes.noteId, noteId)).all().map((row) => ({ type: "task" as const, id: row.id })),
    ...database.select({ id: ticketNotes.ticketId }).from(ticketNotes).where(eq(ticketNotes.noteId, noteId)).all().map((row) => ({ type: "ticket" as const, id: row.id }))
  ];
}

export function listProjectNotes(database: DbClient, projectId: number): Note[] {
  ensureProjectExists(database, projectId);
  const rows = database
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
    .orderBy(desc(notes.updatedAt))
    .all();

  return rows.map(mapNote);
}

export function listTaskNotes(database: DbClient, taskId: number): Note[] {
  ensureTaskExists(database, taskId);
  const rows = database
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
    .orderBy(desc(notes.updatedAt))
    .all();

  return rows.map(mapNote);
}

export function listMilestoneNotes(database: DbClient, milestoneId: number): Note[] {
  ensureMilestoneExists(database, milestoneId);
  const rows = database
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
    .orderBy(notes.createdAt, notes.id)
    .all();

  return rows.map(mapNote);
}

export function listTicketNotes(database: DbClient, ticketId: number): Note[] {
  ensureTicketExists(database, ticketId);
  const rows = database
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
    .orderBy(desc(notes.updatedAt))
    .all();

  return rows.map(mapNote);
}

export function createProjectNote(database: DbClient, projectId: number, input: NoteInput, actor?: JournalActor | null): Note {
  ensureProjectExists(database, projectId);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const note = noteRepository.create(txDb, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(input.contentJson)
    }, actor?.actorUserId ?? undefined);
    tx.insert(projectNotes).values({ projectId, noteId: note.id }).run();
    const noteObject = noteJournalObject(note);
    recordJournalEntry(txDb, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [ownerContext(txDb, { type: "project", id: projectId })] });
    return note;
  });

  return mapNote(created);
}

export function createTaskNote(database: DbClient, taskId: number, input: NoteInput, actor?: JournalActor | null): Note {
  ensureTaskExists(database, taskId);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const note = noteRepository.create(txDb, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(input.contentJson)
    }, actor?.actorUserId ?? undefined);
    tx.insert(taskNotes).values({ taskId, noteId: note.id }).run();
    const noteObject = noteJournalObject(note);
    recordJournalEntry(txDb, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [ownerContext(txDb, { type: "task", id: taskId })] });
    return note;
  });

  return mapNote(created);
}

export function createMilestoneNote(database: DbClient, milestoneId: number, input: NoteInput, actor?: JournalActor | null): Note {
  ensureMilestoneExists(database, milestoneId);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const note = noteRepository.create(txDb, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(input.contentJson)
    }, actor?.actorUserId ?? undefined);
    tx.insert(milestoneNotes).values({ milestoneId, noteId: note.id }).run();
    const noteObject = noteJournalObject(note);
    recordJournalEntry(txDb, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [ownerContext(txDb, { type: "milestone", id: milestoneId })] });
    return note;
  });

  return mapNote(created);
}

export function createTicketNote(database: DbClient, ticketId: number, input: NoteInput, actor?: JournalActor | null): Note {
  ensureTicketExists(database, ticketId);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const note = noteRepository.create(txDb, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(input.contentJson)
    }, actor?.actorUserId ?? undefined);
    tx.insert(ticketNotes).values({ ticketId, noteId: note.id }).run();
    const noteObject = noteJournalObject(note);
    recordJournalEntry(txDb, { operation: "create", object: noteObject, summary: buildCreateSummary(noteObject), actor, contexts: [ownerContext(txDb, { type: "ticket", id: ticketId })] });
    return note;
  });

  return mapNote(created);
}

export function getNote(database: DbClient, id: number): Note {
  const note = noteRepository.findById(database, id);
  if (!note) {
    throw notFound(`Note with id ${id} not found`);
  }

  return mapNote(note);
}

export function updateNote(database: DbClient, id: number, input: NoteUpdate, actor?: JournalActor | null): Note {
  const values: NoteUpdateData = {};

  if (input.title !== undefined) {
    values.title = cleanTitle(input.title);
  }
  if (input.contentJson !== undefined) {
    values.contentJson = stringifyJsonObject(input.contentJson);
  }
  if (Object.keys(values).length === 0) {
    throw badRequest("No note fields provided");
  }

  const updated = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const current = noteRepository.findById(txDb, id);
    if (!current) {
      throw notFound(`Note with id ${id} not found`);
    }
    const note = noteRepository.update(txDb, id, input.expectedVersion, values, actor?.actorUserId ?? undefined);
    if (!note) {
      throw notFound(`Note with id ${id} not found`);
    }
    const noteObject = noteJournalObject(note);
    const changes = buildJournalChanges(current, note, noteJournalFields);
    recordJournalEntry(txDb, {
      operation: "update",
      object: noteObject,
      summary: buildUpdateSummary(noteObject, changes),
      actor,
      changes,
      contexts: listNoteOwners(txDb, id).map((owner) => ownerContext(txDb, owner))
    });
    return note;
  });

  return mapNote(updated);
}

export function deleteNote(database: DbClient, id: number, actor?: JournalActor | null): void {
  const note = noteRepository.findById(database, id);
  if (!note) {
    throw notFound(`Note with id ${id} not found`);
  }
  const owners = listNoteOwners(database, id);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const noteObject = noteJournalObject(note);
    recordJournalEntry(txDb, { operation: "delete", object: noteObject, summary: buildDeleteSummary(noteObject), actor, contexts: owners.map((owner) => ownerContext(txDb, owner)) });
    if (noteRepository.delete(txDb, id) === 0) {
      throw notFound(`Note with id ${id} not found`);
    }
  });
}

function deleteNotesByIds(database: DbClient, noteIds: number[]): void {
  const uniqueIds = [...new Set(noteIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  noteRepository.deleteByIds(database, uniqueIds);
}

export function deleteProjectNotesForIds(database: DbClient, projectIds: number[]): void {
  const uniqueIds = [...new Set(projectIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = database.select({ noteId: projectNotes.noteId }).from(projectNotes).where(inArray(projectNotes.projectId, uniqueIds)).all();
  deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export function deleteTaskNotesForIds(database: DbClient, taskIds: number[]): void {
  const uniqueIds = [...new Set(taskIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = database.select({ noteId: taskNotes.noteId }).from(taskNotes).where(inArray(taskNotes.taskId, uniqueIds)).all();
  deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export function deleteMilestoneNotesForIds(database: DbClient, milestoneIds: number[]): void {
  const uniqueIds = [...new Set(milestoneIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = database.select({ noteId: milestoneNotes.noteId }).from(milestoneNotes).where(inArray(milestoneNotes.milestoneId, uniqueIds)).all();
  deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export function deleteTicketNotesForIds(database: DbClient, ticketIds: number[]): void {
  const uniqueIds = [...new Set(ticketIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = database.select({ noteId: ticketNotes.noteId }).from(ticketNotes).where(inArray(ticketNotes.ticketId, uniqueIds)).all();
  deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export function deleteTicketNote(database: DbClient, ticketId: number, noteId: number, actor?: JournalActor | null): void {
  ensureTicketExists(database, ticketId);
  const note = noteRepository.findById(database, noteId);
  if (!note) {
    throw notFound(`Note with id ${noteId} not found`);
  }
  const result = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const deletedLink = tx.delete(ticketNotes).where(and(eq(ticketNotes.ticketId, ticketId), eq(ticketNotes.noteId, noteId))).run();
    if (deletedLink.changes > 0) {
      const noteObject = noteJournalObject(note);
      const ticketObject = getOwnerJournalObject(txDb, { type: "ticket", id: ticketId });
      recordJournalEntry(txDb, { operation: "unlink", object: noteObject, summary: buildUnlinkSummary(ticketObject, noteObject), actor, contexts: [makeJournalContext(ticketObject, "owner")] });
      tx.delete(notes).where(eq(notes.id, noteId)).run();
    }
    return deletedLink;
  });

  if (result.changes === 0) {
    throw notFound(`Note with id ${noteId} not found`);
  }
}
