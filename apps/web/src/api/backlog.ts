import type { BacklogItem, BacklogItemInput, BacklogItemUpdate, BacklogStatus } from "@taskmanager/shared-types";
import { api } from "./client";

export interface BacklogFilters {
  featureId?: number;
  useCaseId?: number;
  status?: BacklogStatus;
}

function buildSearchParams(filters: BacklogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.featureId !== undefined) {
    params.set("featureId", String(filters.featureId));
  }
  if (filters.useCaseId !== undefined) {
    params.set("useCaseId", String(filters.useCaseId));
  }
  if (filters.status !== undefined) {
    params.set("status", filters.status);
  }
  return params;
}

export async function getBacklogItems(projectId: number, filters: BacklogFilters = {}): Promise<BacklogItem[]> {
  const searchParams = buildSearchParams(filters);
  return api.get(`projects/${projectId}/backlog`, { searchParams }).json<BacklogItem[]>();
}

export async function createBacklogItem(projectId: number, input: BacklogItemInput): Promise<BacklogItem> {
  return api.post(`projects/${projectId}/backlog`, { json: input }).json<BacklogItem>();
}

export async function updateBacklogItem(id: number, input: BacklogItemUpdate): Promise<BacklogItem> {
  return api.patch(`backlog/${id}`, { json: input }).json<BacklogItem>();
}

export async function deleteBacklogItem(id: number): Promise<void> {
  await api.delete(`backlog/${id}`);
}
