import type { Note, NoteInput, NoteUpdate } from "@taskmanager/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { notes, projectNotes, projects, taskNotes, tasks, ticketNotes, tickets } from "../db/schema.js";
import { noteRepository, type NoteRecord, type NoteUpdateData } from "../repositories/note.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { parseJsonObject, stringifyJsonObject } from "./helpers.js";

type MappableNoteRecord = Pick<NoteRecord, "id" | "title" | "contentJson" | "version" | "createdAt" | "updatedAt">;

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

function ensureTicketExists(database: DbClient, ticketId: number): void {
  const ticket = database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
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

export function createProjectNote(database: DbClient, projectId: number, input: NoteInput): Note {
  ensureProjectExists(database, projectId);
  const created = database.transaction((tx) => {
    const note = noteRepository.create(tx as unknown as DbClient, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(input.contentJson)
    });
    tx.insert(projectNotes).values({ projectId, noteId: note.id }).run();
    return note;
  });

  return mapNote(created);
}

export function createTaskNote(database: DbClient, taskId: number, input: NoteInput): Note {
  ensureTaskExists(database, taskId);
  const created = database.transaction((tx) => {
    const note = noteRepository.create(tx as unknown as DbClient, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(input.contentJson)
    });
    tx.insert(taskNotes).values({ taskId, noteId: note.id }).run();
    return note;
  });

  return mapNote(created);
}

export function createTicketNote(database: DbClient, ticketId: number, input: NoteInput): Note {
  ensureTicketExists(database, ticketId);
  const created = database.transaction((tx) => {
    const note = noteRepository.create(tx as unknown as DbClient, {
      title: cleanTitle(input.title),
      contentJson: stringifyJsonObject(input.contentJson)
    });
    tx.insert(ticketNotes).values({ ticketId, noteId: note.id }).run();
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

export function updateNote(database: DbClient, id: number, input: NoteUpdate): Note {
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

  const updated = noteRepository.update(database, id, input.expectedVersion, values);
  if (!updated) {
    throw notFound(`Note with id ${id} not found`);
  }

  return mapNote(updated);
}

export function deleteNote(database: DbClient, id: number): void {
  if (noteRepository.delete(database, id) === 0) {
    throw notFound(`Note with id ${id} not found`);
  }
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

export function deleteTicketNotesForIds(database: DbClient, ticketIds: number[]): void {
  const uniqueIds = [...new Set(ticketIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = database.select({ noteId: ticketNotes.noteId }).from(ticketNotes).where(inArray(ticketNotes.ticketId, uniqueIds)).all();
  deleteNotesByIds(database, rows.map((row) => row.noteId));
}

export function deleteTicketNote(database: DbClient, ticketId: number, noteId: number): void {
  ensureTicketExists(database, ticketId);
  const result = database.transaction((tx) => {
    const deletedLink = tx.delete(ticketNotes).where(and(eq(ticketNotes.ticketId, ticketId), eq(ticketNotes.noteId, noteId))).run();
    if (deletedLink.changes > 0) {
      tx.delete(notes).where(eq(notes.id, noteId)).run();
    }
    return deletedLink;
  });

  if (result.changes === 0) {
    throw notFound(`Note with id ${noteId} not found`);
  }
}
