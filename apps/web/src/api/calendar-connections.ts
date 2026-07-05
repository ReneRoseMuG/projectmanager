import type { CalendarConnection, CalendarJournalEntry } from "@taskmanager/shared-types";
import { api } from "./client";

export interface ConnectNextCloudInput {
  displayName: string;
  baseUrl: string;
  username: string;
  appPassword: string;
}

export interface GoogleCalendarOption {
  id: string;
  summary: string;
  backgroundColor: string | null;
  accessRole: string;
  primary: boolean;
  writable: boolean;
}

export interface CalendarConfigStatus {
  googleConfigured: boolean;
  autoSyncEnabled: boolean;
}

export interface SyncAllResult {
  processed: number;
  synced: number;
  failed: number;
}

export async function listCalendarConnections(): Promise<CalendarConnection[]> {
  return api.get("calendar-connections").json<CalendarConnection[]>();
}

export async function getCalendarConfig(): Promise<CalendarConfigStatus> {
  return api.get("calendar-connections/config").json<CalendarConfigStatus>();
}

export async function connectNextCloud(input: ConnectNextCloudInput): Promise<CalendarConnection> {
  return api.post("calendar-connections/nextcloud", { json: input }).json<CalendarConnection>();
}

export async function listGoogleCalendars(connectionId: number): Promise<GoogleCalendarOption[]> {
  return api.get(`calendar-connections/${connectionId}/google/calendars`).json<GoogleCalendarOption[]>();
}

export async function selectGoogleCalendar(connectionId: number, calendarId: string): Promise<void> {
  await api.post(`calendar-connections/${connectionId}/google/select`, { json: { calendarId } });
}

export async function syncAllConnections(): Promise<SyncAllResult> {
  return api.post("calendar-connections/sync-all").json<SyncAllResult>();
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
