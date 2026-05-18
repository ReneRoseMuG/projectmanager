import type { Task, TaskBoardItem, TaskBoardPositionInput, TaskDetail, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

export type TaskOwner = { type: "project" | "feature" | "useCase"; id: number };

function ownerPath(owner: TaskOwner): string {
  if (owner.type === "project") {
    return `projects/${owner.id}`;
  }
  if (owner.type === "feature") {
    return `features/${owner.id}`;
  }
  return `use-cases/${owner.id}`;
}

export async function getOwnerTasks(owner: TaskOwner): Promise<TaskBoardItem[]> {
  return api.get(`${ownerPath(owner)}/tasks`).json<TaskBoardItem[]>();
}

export async function getProjectTasks(projectId: number): Promise<TaskBoardItem[]> {
  return getOwnerTasks({ type: "project", id: projectId });
}

export async function getTasks(): Promise<Task[]> {
  return api.get("tasks").json<Task[]>();
}

export async function createOwnerTask(owner: TaskOwner, input: TaskInput): Promise<TaskBoardItem> {
  return api.post(`${ownerPath(owner)}/tasks`, { json: input }).json<TaskBoardItem>();
}

export async function createTask(projectId: number, input: TaskInput): Promise<TaskBoardItem> {
  return createOwnerTask({ type: "project", id: projectId }, input);
}

export async function linkOwnerTask(owner: TaskOwner, taskId: number): Promise<TaskBoardItem> {
  return api.post(`${ownerPath(owner)}/tasks/${taskId}`).json<TaskBoardItem>();
}

export async function unlinkOwnerTask(owner: TaskOwner, taskId: number): Promise<void> {
  await api.delete(`${ownerPath(owner)}/tasks/${taskId}`).json();
}

export async function updateOwnerTaskBoard(owner: TaskOwner, taskId: number, input: TaskBoardPositionInput): Promise<TaskBoardItem> {
  return api.patch(`${ownerPath(owner)}/tasks/${taskId}/board`, { json: input }).json<TaskBoardItem>();
}

export async function getTask(id: number): Promise<TaskDetail> {
  return api.get(`tasks/${id}`).json<TaskDetail>();
}

export async function createSubtask(taskId: number, input: TaskInput): Promise<Task> {
  return api.post(`tasks/${taskId}/subtasks`, { json: input }).json<Task>();
}

export async function updateTask(id: number, input: TaskUpdate): Promise<Task> {
  return api.patch(`tasks/${id}`, { json: input }).json<Task>();
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`tasks/${id}`).json();
}
