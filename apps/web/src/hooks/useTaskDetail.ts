import type { CommentInput, Tag, TaskDetail, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import { createComment as createCommentRequest, deleteComment as deleteCommentRequest } from "../api/comments";
import { createSubtask as createSubtaskRequest } from "../api/subtasks";
import { setTaskTags } from "../api/tags";
import { deleteTask, getTask, updateTask as updateTaskRequest } from "../api/tasks";
import { errorMessage } from "./errors";

export function useTaskDetail(taskId: number | null) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setTask(await getTask(taskId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateTask = useCallback(
    async (input: TaskUpdate) => {
      if (!taskId) {
        return null;
      }
      await updateTaskRequest(taskId, input);
      await load();
      return taskId;
    },
    [load, taskId]
  );

  const updateTags = useCallback(
    async (tags: Tag[]) => {
      if (!taskId) {
        return [];
      }
      const updated = await setTaskTags(
        taskId,
        tags.map((tag) => tag.id)
      );
      await load();
      return updated;
    },
    [load, taskId]
  );

  const createSubtask = useCallback(
    async (input: TaskInput) => {
      if (!taskId) {
        return null;
      }
      const created = await createSubtaskRequest(taskId, input);
      await load();
      return created;
    },
    [load, taskId]
  );

  const updateSubtask = useCallback(
    async (id: number, input: TaskUpdate) => {
      const updated = await updateTaskRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const removeSubtask = useCallback(
    async (id: number) => {
      await deleteTask(id);
      await load();
    },
    [load]
  );

  const createComment = useCallback(
    async (input: CommentInput) => {
      if (!taskId) {
        return null;
      }
      const created = await createCommentRequest(taskId, input);
      await load();
      return created;
    },
    [load, taskId]
  );

  const removeComment = useCallback(
    async (id: number) => {
      await deleteCommentRequest(id);
      await load();
    },
    [load]
  );

  return {
    task,
    loading,
    error,
    reload: load,
    updateTask,
    updateTags,
    createSubtask,
    updateSubtask,
    removeSubtask,
    createComment,
    removeComment
  };
}
