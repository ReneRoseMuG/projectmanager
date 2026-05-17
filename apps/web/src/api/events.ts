import type { CalendarEvent, EventInput, EventUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getEvents(query: { from?: string; to?: string } = {}): Promise<CalendarEvent[]> {
  return api.get("events", { searchParams: query }).json<CalendarEvent[]>();
}

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  return api.post("events", { json: input }).json<CalendarEvent>();
}

export async function updateEvent(id: number, input: EventUpdate): Promise<CalendarEvent> {
  return api.patch(`events/${id}`, { json: input }).json<CalendarEvent>();
}

export async function deleteEvent(id: number): Promise<void> {
  await api.delete(`events/${id}`).json();
}
