import type { Comment, CommentEntityType, CommentInput } from "@taskmanager/shared-types";
import { api } from "./client";

const entityPaths: Record<CommentEntityType, string> = {
  task: "tasks",
  feature: "features",
  milestone: "milestones",
  project: "projects",
  useCase: "use-cases",
  backlogItem: "backlog",
  wikiPage: "wiki",
  ticket: "tickets"
};

export async function createComment(taskId: number, input: CommentInput): Promise<Comment> {
  return api.post(`tasks/${taskId}/comments`, { json: input }).json<Comment>();
}

export async function deleteComment(id: number): Promise<void> {
  await api.delete(`comments/${id}`).json();
}

export async function getEntityComments(entityType: CommentEntityType, entityId: number): Promise<Comment[]> {
  return api.get(`${entityPaths[entityType]}/${entityId}/comments`).json<Comment[]>();
}

export async function createEntityComment(entityType: CommentEntityType, entityId: number, input: CommentInput): Promise<Comment> {
  return api.post(`${entityPaths[entityType]}/${entityId}/comments`, { json: input }).json<Comment>();
}

export async function deleteEntityComment(entityType: CommentEntityType, entityId: number, commentId: number): Promise<void> {
  await api.delete(`${entityPaths[entityType]}/${entityId}/comments/${commentId}`);
}
