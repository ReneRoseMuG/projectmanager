import type { Task, TaskUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getTasks, updateTask as updateTaskRequest } from "../api/tasks";
import { setTaskTags } from "../api/tags";
import { invalidateTaskScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

async function getCalendarTasks(): Promise<Task[]> {
  return getTasks();
}

export function useCalendarTasks(enabled = true) {
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: queryKeys.calendarTasks.list(),
    queryFn: getCalendarTasks,
    enabled
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskUpdate }) => updateTaskRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTaskScope(queryClient, updated.id);
    }
  });
  const updateTaskTagsMutation = useMutation({
    mutationFn: ({ id, tagIds }: { id: number; tagIds: number[] }) => setTaskTags(id, tagIds),
    onSuccess: async (_tags, { id }) => {
      await invalidateTaskScope(queryClient, id);
    }
  });

  const reload = useCallback(async () => {
    await tasksQuery.refetch();
  }, [tasksQuery]);

  const updateTask = useCallback(
    async (id: number, input: TaskUpdate) => {
      return updateTaskMutation.mutateAsync({ id, input });
    },
    [updateTaskMutation]
  );
  const updateTaskTags = useCallback(
    async (id: number, tagIds: number[]) => {
      return updateTaskTagsMutation.mutateAsync({ id, tagIds });
    },
    [updateTaskTagsMutation]
  );

  return {
    tasks: tasksQuery.data ?? [],
    loading: tasksQuery.isLoading,
    error: toQueryError(tasksQuery.error),
    reload,
    updateTask,
    updateTaskTags
  };
}
