import type { TicketInput, TicketMoveInput, TicketPositionInput, TicketUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createOwnerTicket as createOwnerTicketRequest,
  createTicket as createTicketRequest,
  deleteTicket as deleteTicketRequest,
  getOwnerTickets,
  getTickets,
  linkOwnerTicket as linkOwnerTicketRequest,
  moveTicketLocation as moveTicketLocationRequest,
  setTicketTags,
  type TicketOwner,
  unlinkOwnerTicket as unlinkOwnerTicketRequest,
  updateTicket as updateTicketRequest,
  updateTicketPosition as updateTicketPositionRequest
} from "../api/tickets";
import { invalidateTicketScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

function ownerTicketKey(owner?: TicketOwner | null) {
  if (!owner) {
    return queryKeys.tickets.list();
  }
  if (owner.type === "project") {
    return queryKeys.projects.tickets(owner.id);
  }
  if (owner.type === "milestone") {
    return queryKeys.milestones.tickets(owner.id);
  }
  if (owner.type === "task") {
    return queryKeys.tasks.tickets(owner.id);
  }
  if (owner.type === "feature") {
    return queryKeys.features.tickets(owner.id);
  }
  if (owner.type === "wikiPage") {
    return queryKeys.wiki.tickets(owner.id);
  }
  return queryKeys.useCases.tickets(owner.id);
}

export function useTickets(owner?: TicketOwner | null) {
  const queryClient = useQueryClient();
  const validOwner = owner && Number.isFinite(owner.id) ? owner : undefined;
  const enabled = owner !== null;

  const ticketsQuery = useQuery({
    queryKey: ownerTicketKey(validOwner),
    queryFn: () => (validOwner !== undefined ? getOwnerTickets(validOwner) : getTickets()),
    enabled
  });

  const reload = useCallback(async () => {
    await ticketsQuery.refetch();
  }, [ticketsQuery]);

  const createTicketMutation = useMutation({
    mutationFn: async (input: TicketInput) => {
      return validOwner !== undefined ? createOwnerTicketRequest(validOwner, input) : createTicketRequest(input);
    },
    onSuccess: (created) => {
      void invalidateTicketScope(queryClient, validOwner, created?.id);
    }
  });

  const linkTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      if (validOwner === undefined) {
        return null;
      }
      return linkOwnerTicketRequest(validOwner, ticketId);
    },
    onSuccess: (linked) => {
      void invalidateTicketScope(queryClient, validOwner, linked?.id);
    }
  });

  const unlinkTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      if (validOwner === undefined) {
        return;
      }
      await unlinkOwnerTicketRequest(validOwner, ticketId);
    },
    onSuccess: (_result, ticketId) => {
      void invalidateTicketScope(queryClient, validOwner, ticketId);
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketUpdate }) => updateTicketRequest(id, input),
    onSuccess: (updated) => {
      void invalidateTicketScope(queryClient, validOwner, updated.id);
    }
  });

  const moveTicketMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketMoveInput }) => moveTicketLocationRequest(id, input),
    onSuccess: (updated) => {
      void invalidateTicketScope(queryClient, validOwner, updated.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
    }
  });

  const updateTicketTagsMutation = useMutation({
    mutationFn: ({ id, tagIds }: { id: number; tagIds: number[] }) => setTicketTags(id, tagIds),
    onSuccess: (_tags, { id }) => {
      void invalidateTicketScope(queryClient, validOwner, id);
    }
  });

  const updateTicketPositionMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketPositionInput }) => updateTicketPositionRequest(id, input),
    onSuccess: (updated) => {
      void invalidateTicketScope(queryClient, validOwner, updated.id);
    }
  });

  const removeTicketMutation = useMutation({
    mutationFn: deleteTicketRequest,
    onSuccess: (_result, id) => {
      void invalidateTicketScope(queryClient, validOwner, id);
    }
  });

  const createTicket = useCallback(
    async (input: TicketInput) => {
      return createTicketMutation.mutateAsync(input);
    },
    [createTicketMutation]
  );

  const linkTicket = useCallback(
    async (ticketId: number) => {
      return linkTicketMutation.mutateAsync(ticketId);
    },
    [linkTicketMutation]
  );

  const unlinkTicket = useCallback(
    async (ticketId: number) => {
      await unlinkTicketMutation.mutateAsync(ticketId);
    },
    [unlinkTicketMutation]
  );

  const updateTicket = useCallback(
    async (id: number, input: TicketUpdate) => {
      return updateTicketMutation.mutateAsync({ id, input });
    },
    [updateTicketMutation]
  );

  const moveTicket = useCallback(
    async (id: number, input: TicketMoveInput) => {
      return moveTicketMutation.mutateAsync({ id, input });
    },
    [moveTicketMutation]
  );

  const updateTicketPosition = useCallback(
    async (id: number, input: TicketPositionInput) => {
      return updateTicketPositionMutation.mutateAsync({ id, input });
    },
    [updateTicketPositionMutation]
  );

  const updateTicketTags = useCallback(
    async (id: number, tagIds: number[]) => {
      return updateTicketTagsMutation.mutateAsync({ id, tagIds });
    },
    [updateTicketTagsMutation]
  );

  const removeTicket = useCallback(
    async (id: number) => {
      await removeTicketMutation.mutateAsync(id);
    },
    [removeTicketMutation]
  );

  return {
    tickets: ticketsQuery.data ?? [],
    loading: ticketsQuery.isLoading,
    error: toQueryError(ticketsQuery.error),
    reload,
    createTicket,
    linkTicket,
    unlinkTicket,
    updateTicket,
    moveTicket,
    updateTicketPosition,
    updateTicketTags,
    removeTicket
  };
}
