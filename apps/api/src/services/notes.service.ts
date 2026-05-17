import type { Note, NoteInput } from "@taskmanager/shared-types";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { notes, projectNotes, projects, taskNotes, tasks, ticketNotes, tickets } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { nowIso, parseJsonObject, stringifyJsonObject } from "./helpers.js";

type NoteRecord = typeof notes.$inferSelect;
type MappableNoteRecord = Pick<NoteRecord, "id" | "title" | "contentJson" | "createdAt" | "updatedAt">;

function mapNote(record: MappableNoteRecord): Note {
  return {
    id: record.id,
    title: record.title,
    contentJson: parseJsonObject(record.contentJson),
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
  const now = nowIso();
  const created = database.transaction((tx) => {
    const note = tx
      .insert(notes)
      .values({
        title: cleanTitle(input.title),
        contentJson: stringifyJsonObject(input.contentJson),
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
    tx.insert(projectNotes).values({ projectId, noteId: note.id }).run();
    return note;
  });

  return mapNote(created);
}

export function createTaskNote(database: DbClient, taskId: number, input: NoteInput): Note {
  ensureTaskExists(database, taskId);
  const now = nowIso();
  const created = database.transaction((tx) => {
    const note = tx
      .insert(notes)
      .values({
        title: cleanTitle(input.title),
        contentJson: stringifyJsonObject(input.contentJson),
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
    tx.insert(taskNotes).values({ taskId, noteId: note.id }).run();
    return note;
  });

  return mapNote(created);
}

export function createTicketNote(database: DbClient, ticketId: number, input: NoteInput): Note {
  ensureTicketExists(database, ticketId);
  const now = nowIso();
  const created = database.transaction((tx) => {
    const note = tx
      .insert(notes)
      .values({
        title: cleanTitle(input.title),
        contentJson: stringifyJsonObject(input.contentJson),
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
    tx.insert(ticketNotes).values({ ticketId, noteId: note.id }).run();
    return note;
  });

  return mapNote(created);
}

export function getNote(database: DbClient, id: number): Note {
  const note = database.select().from(notes).where(eq(notes.id, id)).get();
  if (!note) {
    throw notFound(`Note with id ${id} not found`);
  }

  return mapNote(note);
}

export function updateNote(database: DbClient, id: number, input: NoteInput): Note {
  const values: Partial<typeof notes.$inferInsert> = {};

  if (input.title !== undefined) {
    values.title = cleanTitle(input.title);
  }
  if (input.contentJson !== undefined) {
    values.contentJson = stringifyJsonObject(input.contentJson);
  }
  if (Object.keys(values).length === 0) {
    throw badRequest("No note fields provided");
  }

  values.updatedAt = nowIso();

  const updated = database.update(notes).set(values).where(eq(notes.id, id)).returning().get();
  if (!updated) {
    throw notFound(`Note with id ${id} not found`);
  }

  return mapNote(updated);
}

export function deleteNote(database: DbClient, id: number): void {
  const result = database.delete(notes).where(eq(notes.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Note with id ${id} not found`);
  }
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
