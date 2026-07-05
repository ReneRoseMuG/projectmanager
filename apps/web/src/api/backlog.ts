import type { BacklogItem, BacklogItemInput, BacklogItemUpdate, BacklogStatus, Paginated } from "@taskmanager/shared-types";
import { api } from "./client";

export interface BacklogFilters {
  featureId?: number;
  useCaseId?: number;
  status?: BacklogStatus;
  q?: string;
}

// Optionale Seiten-Pagination. Ist `page` gesetzt, liefert das Backend Paginated<BacklogItem>;
// ohne `page` weiterhin das nackte Array (Rückwärtskompatibilität).
export interface BacklogPagination {
  page?: number;
  pageSize?: number;
}

function buildSearchParams(filters: BacklogFilters, pagination?: BacklogPagination): URLSearchParams {
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
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (pagination?.page !== undefined) {
    params.set("page", String(pagination.page));
  }
  if (pagination?.pageSize !== undefined) {
    params.set("pageSize", String(pagination.pageSize));
  }
  return params;
}

export async function getBacklogItems(projectId: number, filters: BacklogFilters = {}): Promise<BacklogItem[]> {
  const searchParams = buildSearchParams(filters);
  return api.get(`projects/${projectId}/backlog`, { searchParams }).json<BacklogItem[]>();
}

// Paginierter Abruf: liefert Paginated<BacklogItem> (data + total + page + pageSize).
export async function getBacklogItemsPage(
  projectId: number,
  filters: BacklogFilters,
  pagination: BacklogPagination
): Promise<Paginated<BacklogItem>> {
  const page = pagination.page ?? 1;
  const searchParams = buildSearchParams(filters, { ...pagination, page });
  return api.get(`projects/${projectId}/backlog`, { searchParams }).json<Paginated<BacklogItem>>();
}

export async function getBacklogItem(id: number): Promise<BacklogItem> {
  return api.get(`backlog/${id}`).json<BacklogItem>();
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
