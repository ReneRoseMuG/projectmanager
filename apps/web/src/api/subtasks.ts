import type { Task, TaskInput } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getSubtasks(taskId: number): Promise<Task[]> {
  return api.get(`tasks/${taskId}/subtasks`).json<Task[]>();
}

export async function createSubtask(taskId: number, input: TaskInput): Promise<Task> {
  return api.post(`tasks/${taskId}/subtasks`, { json: input }).json<Task>();
}
