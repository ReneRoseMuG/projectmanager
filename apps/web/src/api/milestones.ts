import type { Milestone, MilestoneInput, MilestoneUpdate, Tag } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getMilestones(): Promise<Milestone[]> {
  return api.get("milestones").json<Milestone[]>();
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
