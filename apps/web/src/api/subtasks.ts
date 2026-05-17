import type { Task, TaskInput } from "@taskmanager/shared-types";
import { api } from "./client";

export async function createSubtask(taskId: number, input: TaskInput): Promise<Task> {
  return api.post(`tasks/${taskId}/subtasks`, { json: input }).json<Task>();
}
