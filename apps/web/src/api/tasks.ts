import type { Task, TaskDetail, TaskInput, TaskPositionInput, TaskUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getProjectTasks(projectId: number): Promise<Task[]> {
  return api.get(`projects/${projectId}/tasks`).json<Task[]>();
}

export async function getTasks(): Promise<Task[]> {
  return api.get("tasks").json<Task[]>();
}

export async function createTask(projectId: number, input: TaskInput): Promise<Task> {
  return api.post(`projects/${projectId}/tasks`, { json: input }).json<Task>();
}

export async function getTask(id: number): Promise<TaskDetail> {
  return api.get(`tasks/${id}`).json<TaskDetail>();
}

export async function updateTask(id: number, input: TaskUpdate): Promise<Task> {
  return api.patch(`tasks/${id}`, { json: input }).json<Task>();
}

export async function updateTaskPosition(id: number, input: TaskPositionInput): Promise<Task> {
  return api.patch(`tasks/${id}/position`, { json: input }).json<Task>();
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`tasks/${id}`).json();
}
