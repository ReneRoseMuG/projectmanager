import type { CommentInput, CommentUpdate, Tag, TicketInput, TicketRelationInput, TicketUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createEntityComment as createEntityCommentRequest,
  deleteEntityComment as deleteEntityCommentRequest,
  updateComment as updateCommentRequest
} from "../api/comments";
import {
  addTicketRelation as addTicketRelationRequest,
  createSubTicket as createSubTicketRequest,
  deleteTicket,
  getTicket,
  removeTicketRelation as removeTicketRelationRequest,
  setTicketTags,
  updateTicket as updateTicketRequest
} from "../api/tickets";
import { invalidateComments, invalidateTags, invalidateTicketScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useTicketDetail(ticketId: number | null) {
  const queryClient = useQueryClient();
  const validTicketId = ticketId !== null && Number.isFinite(ticketId) ? ticketId : undefined;

  const ticketQuery = useQuery({
    queryKey: queryKeys.tickets.detail(validTicketId ?? 0),
    queryFn: () => getTicket(validTicketId as number),
    enabled: validTicketId !== undefined
  });

  const reload = useCallback(async () => {
    if (validTicketId !== undefined) {
      await ticketQuery.refetch();
    }
  }, [ticketQuery, validTicketId]);

  const updateTicketMutation = useMutation({
    mutationFn: async (input: TicketUpdate) => {
      if (validTicketId === undefined) {
        return null;
      }
      return updateTicketRequest(validTicketId, input);
    },
    onSuccess: async (updated) => {
      await invalidateTicketScope(queryClient, undefined, updated?.id ?? validTicketId);
    }
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: Tag[]) => {
      if (validTicketId === undefined) {
        return [];
      }
      return setTicketTags(
        validTicketId,
        tags.map((tag) => tag.id)
      );
    },
    onSuccess: async () => {
      await invalidateTicketScope(queryClient, undefined, validTicketId);
      await invalidateTags(queryClient);
    }
  });

  const createSubTicketMutation = useMutation({
    mutationFn: async (input: TicketInput) => {
      if (validTicketId === undefined) {
        return null;
      }
      return createSubTicketRequest(validTicketId, input);
    },
    onSuccess: async (created) => {
      await invalidateTicketScope(queryClient, undefined, created?.id);
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const updateSubTicketMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketUpdate }) => updateTicketRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTicketScope(queryClient, undefined, updated.id);
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const removeSubTicketMutation = useMutation({
    mutationFn: deleteTicket,
    onSuccess: async (_result, id) => {
      await invalidateTicketScope(queryClient, undefined, id);
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const addRelationMutation = useMutation({
    mutationFn: async (input: TicketRelationInput) => {
      if (validTicketId === undefined) {
        return;
      }
      await addTicketRelationRequest(validTicketId, input);
    },
    onSuccess: async () => {
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const removeRelationMutation = useMutation({
    mutationFn: async (input: TicketRelationInput) => {
      if (validTicketId === undefined) {
        return;
      }
      await removeTicketRelationRequest(validTicketId, input);
    },
    onSuccess: async () => {
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async (input: CommentInput) => {
      if (validTicketId === undefined) {
        return null;
      }
      return createEntityCommentRequest("ticket", validTicketId, input);
    },
    onSuccess: async () => {
      if (validTicketId !== undefined) {
        await invalidateComments(queryClient, "ticket", validTicketId);
      }
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const removeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      if (validTicketId === undefined) {
        return;
      }
      return deleteEntityCommentRequest("ticket", validTicketId, commentId);
    },
    onSuccess: async () => {
      if (validTicketId !== undefined) {
        await invalidateComments(queryClient, "ticket", validTicketId);
      }
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, input }: { commentId: number; input: CommentUpdate }) => updateCommentRequest(commentId, input),
    onSuccess: async () => {
      if (validTicketId !== undefined) {
        await invalidateComments(queryClient, "ticket", validTicketId);
      }
      await invalidateTicketScope(queryClient, undefined, validTicketId);
    }
  });

  const updateTicket = useCallback(
    async (input: TicketUpdate) => {
      if (validTicketId === undefined) {
        return null;
      }
      await updateTicketMutation.mutateAsync(input);
      return validTicketId;
    },
    [updateTicketMutation, validTicketId]
  );

  const updateTags = useCallback(
    async (tags: Tag[]) => {
      return updateTagsMutation.mutateAsync(tags);
    },
    [updateTagsMutation]
  );

  const createSubTicket = useCallback(
    async (input: TicketInput) => {
      return createSubTicketMutation.mutateAsync(input);
    },
    [createSubTicketMutation]
  );

  const updateSubTicket = useCallback(
    async (id: number, input: TicketUpdate) => {
      return updateSubTicketMutation.mutateAsync({ id, input });
    },
    [updateSubTicketMutation]
  );

  const removeSubTicket = useCallback(
    async (id: number) => {
      await removeSubTicketMutation.mutateAsync(id);
    },
    [removeSubTicketMutation]
  );

  const addRelation = useCallback(
    async (input: TicketRelationInput) => {
      await addRelationMutation.mutateAsync(input);
    },
    [addRelationMutation]
  );

  const removeRelation = useCallback(
    async (input: TicketRelationInput) => {
      await removeRelationMutation.mutateAsync(input);
    },
    [removeRelationMutation]
  );

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
    ticket: ticketQuery.data ?? null,
    loading: ticketQuery.isLoading,
    error: toQueryError(ticketQuery.error),
    reload,
    updateTicket,
    updateTags,
    createSubTicket,
    updateSubTicket,
    removeSubTicket,
    addRelation,
    removeRelation,
    createComment,
    updateComment,
    removeComment
  };
}
