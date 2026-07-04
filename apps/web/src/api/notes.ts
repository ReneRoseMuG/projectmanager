import type { Note, NoteInput, NoteMoveInput, NoteUpdate, Paginated } from "@taskmanager/shared-types";
import { api } from "./client";

// Filter/Suche der Notizen-Hauptliste. Heute nur Freitextsuche (`q`).
export interface NotesListFilter {
  q?: string;
}

// Optionale Seiten-Pagination. Ist `page` gesetzt, liefert das Backend Paginated<Note>;
// ohne `page` weiterhin das nackte Array (Rückwärtskompatibilität).
export interface NotesListPagination {
  page?: number;
  pageSize?: number;
}

function buildNotesQuery(filter: NotesListFilter, pagination?: NotesListPagination): string {
  const params = new URLSearchParams();
  if (filter.q) {
    params.set("q", filter.q);
  }
  if (pagination?.page !== undefined) {
    params.set("page", String(pagination.page));
  }
  if (pagination?.pageSize !== undefined) {
    params.set("pageSize", String(pagination.pageSize));
  }
  const queryString = params.toString();
  return queryString ? `notes?${queryString}` : "notes";
}

export async function getNote(id: number): Promise<Note> {
  return api.get(`notes/${id}`).json<Note>();
}

export async function getNotes(): Promise<Note[]> {
  return api.get("notes").json<Note[]>();
}

// Paginierter Abruf der Notizen-Hauptliste: liefert Paginated<Note> (data + total + page + pageSize).
export async function getNotesPage(filter: NotesListFilter, pagination: NotesListPagination): Promise<Paginated<Note>> {
  const page = pagination.page ?? 1;
  return api.get(buildNotesQuery(filter, { ...pagination, page })).json<Paginated<Note>>();
}

export async function getProjectNotes(projectId: number): Promise<Note[]> {
  return api.get(`projects/${projectId}/notes`).json<Note[]>();
}

export async function getTaskNotes(taskId: number): Promise<Note[]> {
  return api.get(`tasks/${taskId}/notes`).json<Note[]>();
}

export async function getMilestoneNotes(milestoneId: number): Promise<Note[]> {
  return api.get(`milestones/${milestoneId}/notes`).json<Note[]>();
}

export async function getDayPlanNotes(dayPlanId: number): Promise<Note[]> {
  return api.get(`day-plans/${dayPlanId}/notes`).json<Note[]>();
}

export async function getWikiPageNotes(wikiPageId: number): Promise<Note[]> {
  return api.get(`wiki/${wikiPageId}/notes`).json<Note[]>();
}

export async function createProjectNote(projectId: number, input: NoteInput): Promise<Note> {
  return api.post(`projects/${projectId}/notes`, { json: input }).json<Note>();
}

export async function createTaskNote(taskId: number, input: NoteInput): Promise<Note> {
  return api.post(`tasks/${taskId}/notes`, { json: input }).json<Note>();
}

export async function createMilestoneNote(milestoneId: number, input: NoteInput): Promise<Note> {
  return api.post(`milestones/${milestoneId}/notes`, { json: input }).json<Note>();
}

export async function createDayPlanNote(dayPlanId: number, input: NoteInput): Promise<Note> {
  return api.post(`day-plans/${dayPlanId}/notes`, { json: input }).json<Note>();
}

export async function createWikiPageNote(wikiPageId: number, input: NoteInput): Promise<Note> {
  return api.post(`wiki/${wikiPageId}/notes`, { json: input }).json<Note>();
}

export async function linkDayPlanNote(dayPlanId: number, noteId: number): Promise<Note> {
  return api.post(`day-plans/${dayPlanId}/notes/${noteId}`).json<Note>();
}

export async function unlinkDayPlanNote(dayPlanId: number, noteId: number): Promise<void> {
  await api.delete(`day-plans/${dayPlanId}/notes/${noteId}`);
}

export async function updateNote(id: number, input: NoteUpdate): Promise<Note> {
  return api.patch(`notes/${id}`, { json: input }).json<Note>();
}

export async function moveNoteLocation(id: number, input: NoteMoveInput): Promise<Note> {
  return api.patch(`notes/${id}/location`, { json: input }).json<Note>();
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`notes/${id}`).json();
}
