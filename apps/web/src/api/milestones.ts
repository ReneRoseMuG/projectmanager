import type { Milestone, MilestoneInput, MilestoneUpdate, Paginated, Tag } from "@taskmanager/shared-types";
import { api } from "./client";

// Serverseitiger Filter der globalen Meilensteinliste. `status` ersetzt den bisher
// clientseitigen Statusfilter, `q` sucht im Namen.
export interface MilestoneListFilter {
  status?: string;
  q?: string;
}

// Optionale Seiten-Pagination. Ist `page` gesetzt, liefert das Backend Paginated<Milestone>;
// ohne `page` weiterhin das nackte Array (Rückwärtskompatibilität).
export interface MilestoneListPagination {
  page?: number;
  pageSize?: number;
}

function buildMilestoneListQuery(filter: MilestoneListFilter, pagination?: MilestoneListPagination): string {
  const params = new URLSearchParams();
  if (filter.status !== undefined) {
    params.set("status", filter.status);
  }
  if (filter.q) {
    params.set("q", filter.q);
  }
  if (pagination?.page !== undefined) {
    params.set("page", String(pagination.page));
  }
  if (pagination?.pageSize !== undefined) {
    params.set("pageSize", String(pagination.pageSize));
  }
  const queryString = params.toString();
  return queryString ? `milestones?${queryString}` : "milestones";
}

export async function getMilestones(): Promise<Milestone[]> {
  return api.get("milestones").json<Milestone[]>();
}

// Paginierter Abruf: liefert Paginated<Milestone> (data + total + page + pageSize).
export async function getMilestonesPage(
  filter: MilestoneListFilter,
  pagination: MilestoneListPagination
): Promise<Paginated<Milestone>> {
  const page = pagination.page ?? 1;
  return api.get(buildMilestoneListQuery(filter, { ...pagination, page })).json<Paginated<Milestone>>();
}

export async function getProjectMilestones(projectId: number): Promise<Milestone[]> {
  return api.get(`projects/${projectId}/milestones`).json<Milestone[]>();
}

export async function getMilestone(id: number): Promise<Milestone> {
  return api.get(`milestones/${id}`).json<Milestone>();
}

export async function createMilestone(input: MilestoneInput): Promise<Milestone> {
  return api.post("milestones", { json: input }).json<Milestone>();
}

export async function createProjectMilestone(projectId: number, input: Omit<MilestoneInput, "projectId">): Promise<Milestone> {
  return api.post(`projects/${projectId}/milestones`, { json: input }).json<Milestone>();
}

export async function updateMilestone(id: number, input: MilestoneUpdate): Promise<Milestone> {
  return api.patch(`milestones/${id}`, { json: input }).json<Milestone>();
}

export async function deleteMilestone(id: number): Promise<void> {
  await api.delete(`milestones/${id}`).json();
}

export async function setMilestoneTags(id: number, tagIds: number[]): Promise<Tag[]> {
  return api.put(`milestones/${id}/tags`, { json: { tagIds } }).json<Tag[]>();
}
