import type { TicketInput, TicketPositionInput, TicketUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createTicket as createTicketRequest,
  deleteTicket as deleteTicketRequest,
  getProjectTickets,
  getTickets,
  updateTicket as updateTicketRequest,
  updateTicketPosition as updateTicketPositionRequest
} from "../api/tickets";
import { invalidateTicketScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useTickets(projectId?: number) {
  const queryClient = useQueryClient();
  const validProjectId = projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const ticketsQuery = useQuery({
    queryKey: validProjectId !== undefined ? queryKeys.tickets.byProject(validProjectId) : queryKeys.tickets.list(),
    queryFn: () => (validProjectId !== undefined ? getProjectTickets(validProjectId) : getTickets())
  });

  const reload = useCallback(async () => {
    await ticketsQuery.refetch();
  }, [ticketsQuery]);

  const createTicketMutation = useMutation({
    mutationFn: async (input: TicketInput) => {
      if (validProjectId === undefined) {
        return null;
      }
      return createTicketRequest(validProjectId, input);
    },
    onSuccess: async (created) => {
      await invalidateTicketScope(queryClient, created?.projectId ?? validProjectId, created?.id);
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketUpdate }) => updateTicketRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTicketScope(queryClient, updated.projectId, updated.id);
    }
  });

  const updateTicketPositionMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketPositionInput }) => updateTicketPositionRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTicketScope(queryClient, updated.projectId, updated.id);
    }
  });

  const removeTicketMutation = useMutation({
    mutationFn: deleteTicketRequest,
    onSuccess: async (_result, id) => {
      await invalidateTicketScope(queryClient, validProjectId, id);
    }
  });

  const createTicket = useCallback(
    async (input: TicketInput) => {
      return createTicketMutation.mutateAsync(input);
    },
    [createTicketMutation]
  );

  const updateTicket = useCallback(
    async (id: number, input: TicketUpdate) => {
      return updateTicketMutation.mutateAsync({ id, input });
    },
    [updateTicketMutation]
  );

  const updateTicketPosition = useCallback(
    async (id: number, input: TicketPositionInput) => {
      return updateTicketPositionMutation.mutateAsync({ id, input });
    },
    [updateTicketPositionMutation]
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
    updateTicket,
    updateTicketPosition,
    removeTicket
  };
}
