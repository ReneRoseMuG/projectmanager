import type { CalendarSyncConfigView, UpdateCalendarSyncConfigRequest } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getCalendarSyncConfig(): Promise<CalendarSyncConfigView> {
  return api.get("calendar-settings").json<CalendarSyncConfigView>();
}

export async function updateCalendarSyncConfig(input: UpdateCalendarSyncConfigRequest): Promise<CalendarSyncConfigView> {
  return api.put("calendar-settings", { json: input }).json<CalendarSyncConfigView>();
}
