import type { Task, TaskInput, TaskPositionInput, TaskUpdate } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  getProjectTasks,
  updateTask as updateTaskRequest,
  updateTaskPosition as updateTaskPositionRequest
} from "../api/tasks";
import { errorMessage } from "./errors";

export function useTasks(projectId?: number) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setTasks(await getProjectTasks(projectId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createTask = useCallback(
    async (input: TaskInput) => {
      if (!projectId) {
        return null;
      }
      const created = await createTaskRequest(projectId, input);
      await load();
      return created;
    },
    [load, projectId]
  );

  const updateTask = useCallback(
    async (id: number, input: TaskUpdate) => {
      const updated = await updateTaskRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const updateTaskPosition = useCallback(
    async (id: number, input: TaskPositionInput) => {
      const updated = await updateTaskPositionRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const removeTask = useCallback(
    async (id: number) => {
      await deleteTaskRequest(id);
      await load();
    },
    [load]
  );

  return { tasks, loading, error, reload: load, createTask, updateTask, updateTaskPosition, removeTask };
}
