import type { TaskInput, TaskPositionInput, TaskUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  getProjectTasks,
  updateTask as updateTaskRequest,
  updateTaskPosition as updateTaskPositionRequest
} from "../api/tasks";
import { invalidateTaskScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useTasks(projectId?: number) {
  const queryClient = useQueryClient();
  const validProjectId = projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const tasksQuery = useQuery({
    queryKey: queryKeys.projects.tasks(validProjectId ?? 0),
    queryFn: () => getProjectTasks(validProjectId as number),
    enabled: validProjectId !== undefined
  });

  const reload = useCallback(async () => {
    if (validProjectId !== undefined) {
      await tasksQuery.refetch();
    }
  }, [tasksQuery, validProjectId]);

  const createTaskMutation = useMutation({
    mutationFn: async (input: TaskInput) => {
      if (validProjectId === undefined) {
        return null;
      }
      return createTaskRequest(validProjectId, input);
    },
    onSuccess: async (created) => {
      await invalidateTaskScope(queryClient, created?.projectId ?? validProjectId, created?.id);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskUpdate }) => updateTaskRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTaskScope(queryClient, updated.projectId, updated.id);
    }
  });

  const updateTaskPositionMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskPositionInput }) => updateTaskPositionRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTaskScope(queryClient, updated.projectId, updated.id);
    }
  });

  const removeTaskMutation = useMutation({
    mutationFn: deleteTaskRequest,
    onSuccess: async (_result, id) => {
      await invalidateTaskScope(queryClient, validProjectId, id);
    }
  });

  const createTask = useCallback(
    async (input: TaskInput) => {
      return createTaskMutation.mutateAsync(input);
    },
    [createTaskMutation]
  );

  const updateTask = useCallback(
    async (id: number, input: TaskUpdate) => {
      return updateTaskMutation.mutateAsync({ id, input });
    },
    [updateTaskMutation]
  );

  const updateTaskPosition = useCallback(
    async (id: number, input: TaskPositionInput) => {
      return updateTaskPositionMutation.mutateAsync({ id, input });
    },
    [updateTaskPositionMutation]
  );

  const removeTask = useCallback(
    async (id: number) => {
      await removeTaskMutation.mutateAsync(id);
    },
    [removeTaskMutation]
  );

  return {
    tasks: tasksQuery.data ?? [],
    loading: tasksQuery.isLoading,
    error: toQueryError(tasksQuery.error),
    reload,
    createTask,
    updateTask,
    updateTaskPosition,
    removeTask
  };
}
