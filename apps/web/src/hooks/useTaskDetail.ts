import type { CommentInput, Tag, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createComment as createCommentRequest, deleteComment as deleteCommentRequest } from "../api/comments";
import { createSubtask as createSubtaskRequest } from "../api/subtasks";
import { setTaskTags } from "../api/tags";
import { deleteTask, getTask, updateTask as updateTaskRequest } from "../api/tasks";
import { invalidateComments, invalidateTags, invalidateTaskScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useTaskDetail(taskId: number | null) {
  const queryClient = useQueryClient();
  const validTaskId = taskId !== null && Number.isFinite(taskId) ? taskId : undefined;

  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.detail(validTaskId ?? 0),
    queryFn: () => getTask(validTaskId as number),
    enabled: validTaskId !== undefined
  });

  const reload = useCallback(async () => {
    if (validTaskId !== undefined) {
      await taskQuery.refetch();
    }
  }, [taskQuery, validTaskId]);

  const updateTaskMutation = useMutation({
    mutationFn: async (input: TaskUpdate) => {
      if (validTaskId === undefined) {
        return null;
      }
      return updateTaskRequest(validTaskId, input);
    },
    onSuccess: async (updated) => {
      await invalidateTaskScope(queryClient, updated?.projectId ?? taskQuery.data?.projectId, updated?.id ?? validTaskId);
    }
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: Tag[]) => {
      if (validTaskId === undefined) {
        return [];
      }
      return setTaskTags(
        validTaskId,
        tags.map((tag) => tag.id)
      );
    },
    onSuccess: async () => {
      await invalidateTaskScope(queryClient, taskQuery.data?.projectId, validTaskId);
      await invalidateTags(queryClient);
    }
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (input: TaskInput) => {
      if (validTaskId === undefined) {
        return null;
      }
      return createSubtaskRequest(validTaskId, input);
    },
    onSuccess: async (created) => {
      await invalidateTaskScope(queryClient, created?.projectId ?? taskQuery.data?.projectId, created?.id);
      await invalidateTaskScope(queryClient, taskQuery.data?.projectId, validTaskId);
    }
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskUpdate }) => updateTaskRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTaskScope(queryClient, updated.projectId, updated.id);
      await invalidateTaskScope(queryClient, updated.projectId, validTaskId);
    }
  });

  const removeSubtaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: async (_result, id) => {
      await invalidateTaskScope(queryClient, taskQuery.data?.projectId, id);
      await invalidateTaskScope(queryClient, taskQuery.data?.projectId, validTaskId);
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async (input: CommentInput) => {
      if (validTaskId === undefined) {
        return null;
      }
      return createCommentRequest(validTaskId, input);
    },
    onSuccess: async () => {
      if (validTaskId !== undefined) {
        await invalidateComments(queryClient, "task", validTaskId);
      }
      await invalidateTaskScope(queryClient, taskQuery.data?.projectId, validTaskId);
    }
  });

  const removeCommentMutation = useMutation({
    mutationFn: deleteCommentRequest,
    onSuccess: async () => {
      if (validTaskId !== undefined) {
        await invalidateComments(queryClient, "task", validTaskId);
      }
      await invalidateTaskScope(queryClient, taskQuery.data?.projectId, validTaskId);
    }
  });

  const updateTask = useCallback(
    async (input: TaskUpdate) => {
      if (validTaskId === undefined) {
        return null;
      }
      await updateTaskMutation.mutateAsync(input);
      return validTaskId;
    },
    [updateTaskMutation, validTaskId]
  );

  const updateTags = useCallback(
    async (tags: Tag[]) => {
      return updateTagsMutation.mutateAsync(tags);
    },
    [updateTagsMutation]
  );

  const createSubtask = useCallback(
    async (input: TaskInput) => {
      return createSubtaskMutation.mutateAsync(input);
    },
    [createSubtaskMutation]
  );

  const updateSubtask = useCallback(
    async (id: number, input: TaskUpdate) => {
      return updateSubtaskMutation.mutateAsync({ id, input });
    },
    [updateSubtaskMutation]
  );

  const removeSubtask = useCallback(
    async (id: number) => {
      await removeSubtaskMutation.mutateAsync(id);
    },
    [removeSubtaskMutation]
  );

  const createComment = useCallback(
    async (input: CommentInput) => {
      return createCommentMutation.mutateAsync(input);
    },
    [createCommentMutation]
  );

  const removeComment = useCallback(
    async (id: number) => {
      await removeCommentMutation.mutateAsync(id);
    },
    [removeCommentMutation]
  );

  return {
    task: taskQuery.data ?? null,
    loading: taskQuery.isLoading,
    error: toQueryError(taskQuery.error),
    reload,
    updateTask,
    updateTags,
    createSubtask,
    updateSubtask,
    removeSubtask,
    createComment,
    removeComment
  };
}
