import type { Paginated, Project, ProjectInput, ProjectUpdate, Tag } from "@taskmanager/shared-types";
import { api } from "./client";

// Serverseitiger Filter der Projektliste. `status` ersetzt den bisher clientseitigen
// Statusfilter, `q` sucht in Name und Beschreibung.
export interface ProjectListFilter {
  status?: string;
  q?: string;
}

// Optionale Seiten-Pagination. Ist `page` gesetzt, liefert das Backend Paginated<Project>;
// ohne `page` weiterhin das nackte Array (Rückwärtskompatibilität).
export interface ProjectListPagination {
  page?: number;
  pageSize?: number;
}

function buildProjectListQuery(filter: ProjectListFilter, pagination?: ProjectListPagination): string {
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
  return queryString ? `projects?${queryString}` : "projects";
}

export async function getProjects(): Promise<Project[]> {
  return api.get("projects").json<Project[]>();
}

// Paginierter Abruf: liefert Paginated<Project> (data + total + page + pageSize).
export async function getProjectsPage(
  filter: ProjectListFilter,
  pagination: ProjectListPagination
): Promise<Paginated<Project>> {
  const page = pagination.page ?? 1;
  return api.get(buildProjectListQuery(filter, { ...pagination, page })).json<Paginated<Project>>();
}

export async function getProject(id: number): Promise<Project> {
  return api.get(`projects/${id}`).json<Project>();
}

export async function createProject(input: ProjectInput): Promise<Project> {
  return api.post("projects", { json: input }).json<Project>();
}

export async function updateProject(id: number, input: ProjectUpdate): Promise<Project> {
  return api.patch(`projects/${id}`, { json: input }).json<Project>();
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`projects/${id}`).json();
}

export async function setProjectTags(id: number, tagIds: number[]): Promise<Tag[]> {
  return api.put(`projects/${id}/tags`, { json: { tagIds } }).json<Tag[]>();
}
