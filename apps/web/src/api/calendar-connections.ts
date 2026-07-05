import type { CalendarConnection } from "@taskmanager/shared-types";
import { api } from "./client";

export async function listCalendarConnections(): Promise<CalendarConnection[]> {
  return api.get("calendar-connections").json<CalendarConnection[]>();
}

export async function syncCalendarConnection(id: number): Promise<CalendarConnection> {
  return api.post(`calendar-connections/${id}/sync`).json<CalendarConnection>();
}

export async function deleteCalendarConnection(id: number): Promise<void> {
  await api.delete(`calendar-connections/${id}`);
}
