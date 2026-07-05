import type { CalendarConnection, CalendarJournalEntry } from "@taskmanager/shared-types";
import { api } from "./client";

export async function listCalendarConnections(): Promise<CalendarConnection[]> {
  return api.get("calendar-connections").json<CalendarConnection[]>();
}

export async function listCalendarJournal(): Promise<CalendarJournalEntry[]> {
  return api.get("calendar-connections/journal").json<CalendarJournalEntry[]>();
}

export async function getGoogleAuthUrl(): Promise<{ url: string }> {
  return api.get("calendar-connections/google/auth-url").json<{ url: string }>();
}

export async function syncCalendarConnection(id: number): Promise<CalendarConnection> {
  return api.post(`calendar-connections/${id}/sync`).json<CalendarConnection>();
}

export async function deleteCalendarConnection(id: number): Promise<void> {
  await api.delete(`calendar-connections/${id}`);
}
