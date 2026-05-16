import type { Comment, CommentInput } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getComments(taskId: number): Promise<Comment[]> {
  return api.get(`tasks/${taskId}/comments`).json<Comment[]>();
}

export async function createComment(taskId: number, input: CommentInput): Promise<Comment> {
  return api.post(`tasks/${taskId}/comments`, { json: input }).json<Comment>();
}

export async function deleteComment(id: number): Promise<void> {
  await api.delete(`comments/${id}`).json();
}
