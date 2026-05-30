import type { JournalListResponse, JournalObjectType, JournalOperation } from "@taskmanager/shared-types";
import { api } from "./client";

export interface JournalQueryParams {
  limit?: number;
  cursor?: number;
  q?: string;
  operation?: JournalOperation | "";
  objectType?: JournalObjectType | "";
  objectId?: number;
  actorUserId?: number;
  from?: string;
  to?: string;
}

function buildSearchParams(params: JournalQueryParams): Record<string, string | number> {
  const searchParams: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    searchParams[key] = value;
  }
  return searchParams;
}

export async function getJournalEntries(params: JournalQueryParams = {}): Promise<JournalListResponse> {
  return api.get("journal", { searchParams: buildSearchParams(params) }).json<JournalListResponse>();
}

export async function getObjectJournalEntries(objectType: JournalObjectType, objectId: number, params: JournalQueryParams = {}): Promise<JournalListResponse> {
  return api.get(`journal/objects/${objectType}/${objectId}`, { searchParams: buildSearchParams(params) }).json<JournalListResponse>();
}
