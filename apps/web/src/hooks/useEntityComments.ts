import type { CommentInput, CommentEntityType, CommentUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createEntityComment, deleteEntityComment, getEntityComments, updateComment as updateCommentRequest } from "../api/comments";
import { invalidateComments } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useEntityComments(entityType: CommentEntityType, entityId?: number | null) {
  const queryClient = useQueryClient();
  const validEntityId = entityId !== null && entityId !== undefined && Number.isFinite(entityId) ? entityId : undefined;

  const commentsQuery = useQuery({
    queryKey: queryKeys.comments.entity(entityType, validEntityId ?? 0),
    queryFn: () => getEntityComments(entityType, validEntityId as number),
    enabled: validEntityId !== undefined
  });

  const reload = useCallback(async () => {
    if (validEntityId !== undefined) {
      await commentsQuery.refetch();
    }
  }, [commentsQuery, validEntityId]);

  const createCommentMutation = useMutation({
    mutationFn: async (input: CommentInput) => {
      if (validEntityId === undefined) {
        return null;
      }
      return createEntityComment(entityType, validEntityId, input);
    },
    onSuccess: async () => {
      if (validEntityId !== undefined) {
        await invalidateComments(queryClient, entityType, validEntityId);
      }
    }
  });

  const removeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      if (validEntityId === undefined) {
        return;
      }
      return deleteEntityComment(entityType, validEntityId, commentId);
    },
    onSuccess: async () => {
      if (validEntityId !== undefined) {
        await invalidateComments(queryClient, entityType, validEntityId);
      }
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, input }: { commentId: number; input: CommentUpdate }) => {
      if (validEntityId === undefined) {
        return null;
      }
      return updateCommentRequest(commentId, input);
    },
    onSuccess: async () => {
      if (validEntityId !== undefined) {
        await invalidateComments(queryClient, entityType, validEntityId);
      }
    }
  });

  const createComment = useCallback(
    async (input: CommentInput) => {
      return createCommentMutation.mutateAsync(input);
    },
    [createCommentMutation]
  );

  const removeComment = useCallback(
    async (commentId: number) => {
      await removeCommentMutation.mutateAsync(commentId);
    },
    [removeCommentMutation]
  );

  const updateComment = useCallback(
    async (commentId: number, input: CommentUpdate) => {
      return updateCommentMutation.mutateAsync({ commentId, input });
    },
    [updateCommentMutation]
  );

  return {
    comments: commentsQuery.data ?? [],
    loading: commentsQuery.isLoading,
    error: toQueryError(commentsQuery.error),
    reload,
    createComment,
    updateComment,
    removeComment
  };
}
