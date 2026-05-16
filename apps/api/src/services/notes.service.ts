import type { Note, NoteInput } from "@taskmanager/shared-types";
import { desc, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { notes, projectNotes, projects, taskNotes, tasks } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { nowIso, parseJsonObject, stringifyJsonObject } from "./helpers.js";

type NoteRecord = typeof notes.$inferSelect;

function mapNote(record: NoteRecord): Note {
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
