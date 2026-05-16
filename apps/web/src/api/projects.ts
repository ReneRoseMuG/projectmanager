import type { Project, ProjectInput, ProjectUpdate, Tag } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getProjects(): Promise<Project[]> {
  return api.get("projects").json<Project[]>();
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
