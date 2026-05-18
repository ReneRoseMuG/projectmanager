import type { TaskBoardPositionInput, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createOwnerTask as createOwnerTaskRequest,
  deleteTask as deleteTaskRequest,
  getOwnerTasks,
  linkOwnerTask as linkOwnerTaskRequest,
  type TaskOwner,
  unlinkOwnerTask as unlinkOwnerTaskRequest,
  updateOwnerTaskBoard as updateOwnerTaskBoardRequest,
  updateTask as updateTaskRequest
} from "../api/tasks";
import { invalidateFeatureScope, invalidateProjectScope, invalidateTaskScope, invalidateUseCaseScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

function ownerTaskKey(owner?: TaskOwner) {
  if (!owner) {
    return queryKeys.tasks.root;
  }
  if (owner.type === "project") {
    return queryKeys.projects.tasks(owner.id);
  }
  if (owner.type === "feature") {
    return queryKeys.features.tasks(owner.id);
  }
  return queryKeys.useCases.tasks(owner.id);
}

async function invalidateOwner(queryClient: QueryClient, owner?: TaskOwner, taskId?: number): Promise<void> {
  if (owner?.type === "project") {
    await invalidateProjectScope(queryClient, owner.id);
  } else if (owner?.type === "feature") {
    await invalidateFeatureScope(queryClient, owner.id);
  } else if (owner?.type === "useCase") {
    await invalidateUseCaseScope(queryClient, undefined, owner.id);
  }
  await invalidateTaskScope(queryClient, taskId);
}

export function useTasks(owner?: TaskOwner) {
  const queryClient = useQueryClient();
  const validOwner = owner && Number.isFinite(owner.id) ? owner : undefined;

  const tasksQuery = useQuery({
    queryKey: ownerTaskKey(validOwner),
    queryFn: () => getOwnerTasks(validOwner as TaskOwner),
    enabled: validOwner !== undefined
  });

  const reload = useCallback(async () => {
    if (validOwner !== undefined) {
      await tasksQuery.refetch();
    }
  }, [tasksQuery, validOwner]);

  const createTaskMutation = useMutation({
    mutationFn: async (input: TaskInput) => {
      if (validOwner === undefined) {
        return null;
      }
      return createOwnerTaskRequest(validOwner, input);
    },
    onSuccess: async (created) => {
      await invalidateOwner(queryClient, validOwner, created?.id);
    }
  });

  const linkTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      if (validOwner === undefined) {
        return null;
      }
      return linkOwnerTaskRequest(validOwner, taskId);
    },
    onSuccess: async (linked) => {
      await invalidateOwner(queryClient, validOwner, linked?.id);
    }
  });

  const unlinkTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      if (validOwner === undefined) {
        return;
      }
      await unlinkOwnerTaskRequest(validOwner, taskId);
    },
    onSuccess: async (_result, taskId) => {
      await invalidateOwner(queryClient, validOwner, taskId);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskUpdate }) => updateTaskRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateOwner(queryClient, validOwner, updated.id);
    }
  });

  const updateTaskBoardMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskBoardPositionInput }) => {
      if (validOwner === undefined) {
        throw new Error("Task owner is required");
      }
      return updateOwnerTaskBoardRequest(validOwner, id, input);
    },
    onSuccess: async (updated) => {
      await invalidateOwner(queryClient, validOwner, updated.id);
    }
  });

  const removeTaskMutation = useMutation({
    mutationFn: deleteTaskRequest,
    onSuccess: async (_result, id) => {
      await invalidateOwner(queryClient, validOwner, id);
    }
  });

  const createTask = useCallback(
    async (input: TaskInput) => {
      return createTaskMutation.mutateAsync(input);
    },
    [createTaskMutation]
  );

  const linkTask = useCallback(
    async (taskId: number) => {
      return linkTaskMutation.mutateAsync(taskId);
    },
    [linkTaskMutation]
  );

  const unlinkTask = useCallback(
    async (taskId: number) => {
      return unlinkTaskMutation.mutateAsync(taskId);
    },
    [unlinkTaskMutation]
  );

  const updateTask = useCallback(
    async (id: number, input: TaskUpdate) => {
      return updateTaskMutation.mutateAsync({ id, input });
    },
    [updateTaskMutation]
  );

  const updateTaskBoard = useCallback(
    async (id: number, input: TaskBoardPositionInput) => {
      return updateTaskBoardMutation.mutateAsync({ id, input });
    },
    [updateTaskBoardMutation]
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
    linkTask,
    unlinkTask,
    updateTask,
    updateTaskBoard,
    removeTask
  };
}
