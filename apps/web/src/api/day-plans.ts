import type { CalendarEvent, DayPlan, DayPlanUpdate, EventInput, Task, TaskBoardItem, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { updateTask } from "./tasks";
import { api } from "./client";

export async function getDayPlan(date: string): Promise<DayPlan> {
  return api.get(`day-plans/${date}`).json<DayPlan>();
}

export async function updateDayPlan(date: string, input: DayPlanUpdate): Promise<DayPlan> {
  return api.patch(`day-plans/${date}`, { json: input }).json<DayPlan>();
}

export async function createDayPlanTask(date: string, input: TaskInput): Promise<TaskBoardItem> {
  return api.post(`day-plans/${date}/tasks`, { json: input }).json<TaskBoardItem>();
}

export async function linkDayPlanTask(date: string, taskId: number): Promise<TaskBoardItem> {
  return api.post(`day-plans/${date}/tasks/${taskId}`).json<TaskBoardItem>();
}

export async function unlinkDayPlanTask(date: string, taskId: number): Promise<void> {
  await api.delete(`day-plans/${date}/tasks/${taskId}`).json();
}

export async function listDayPlanTasks(): Promise<TaskBoardItem[]> {
  return api.get("day-plans/tasks").json<TaskBoardItem[]>();
}

export async function listDayPlanEvents(): Promise<CalendarEvent[]> {
  return api.get("day-plans/events").json<CalendarEvent[]>();
}

export async function unlinkDayPlanTaskAnyDate(taskId: number): Promise<void> {
  await api.delete(`day-plans/tasks/${taskId}`).json();
}

export async function createDayPlanEvent(date: string, input: EventInput): Promise<CalendarEvent> {
  return api.post(`day-plans/${date}/events`, { json: input }).json<CalendarEvent>();
}

export async function linkDayPlanEvent(date: string, eventId: number): Promise<CalendarEvent> {
  return api.post(`day-plans/${date}/events/${eventId}`).json<CalendarEvent>();
}

export async function unlinkDayPlanEvent(date: string, eventId: number): Promise<void> {
  await api.delete(`day-plans/${date}/events/${eventId}`).json();
}

export async function updateDayPlanTask(taskId: number, input: TaskUpdate): Promise<Task> {
  return updateTask(taskId, input);
}
