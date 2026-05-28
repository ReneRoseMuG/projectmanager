import type { Note, NoteInput, NoteUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

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

export async function linkDayPlanNote(dayPlanId: number, noteId: number): Promise<Note> {
  return api.post(`day-plans/${dayPlanId}/notes/${noteId}`).json<Note>();
}

export async function unlinkDayPlanNote(dayPlanId: number, noteId: number): Promise<void> {
  await api.delete(`day-plans/${dayPlanId}/notes/${noteId}`);
}

export async function updateNote(id: number, input: NoteUpdate): Promise<Note> {
  return api.patch(`notes/${id}`, { json: input }).json<Note>();
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`notes/${id}`).json();
}
