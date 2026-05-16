import type { Tag } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getTags(): Promise<Tag[]> {
  return api.get("tags").json<Tag[]>();
}

export async function createTag(input: { name: string; color: string }): Promise<Tag> {
  return api.post("tags", { json: input }).json<Tag>();
}

export async function updateTag(id: number, input: { name?: string; color?: string }): Promise<Tag> {
  return api.patch(`tags/${id}`, { json: input }).json<Tag>();
}

export async function deleteTag(id: number): Promise<void> {
  await api.delete(`tags/${id}`).json();
}

export async function setTaskTags(id: number, tagIds: number[]): Promise<Tag[]> {
  return api.put(`tasks/${id}/tags`, { json: { tagIds } }).json<Tag[]>();
}
