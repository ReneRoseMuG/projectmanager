import type { NoteInput } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createProjectNote,
  createTaskNote,
  deleteNote as deleteNoteRequest,
  getProjectNotes,
  getTaskNotes,
  updateNote as updateNoteRequest
} from "../api/notes";
import { invalidateNotes } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export type NoteOwner = { type: "project"; id: number } | { type: "task"; id: number };

export function useNotes(owner: NoteOwner | null) {
  const queryClient = useQueryClient();
  const ownerType = owner?.type;
  const ownerId = owner?.id;
  const hasOwner = ownerType !== undefined && ownerId !== undefined && Number.isFinite(ownerId);

  const notesQuery = useQuery({
    queryKey: queryKeys.notes.owner(ownerType ?? "project", ownerId ?? 0),
    queryFn: () => (ownerType === "project" ? getProjectNotes(ownerId as number) : getTaskNotes(ownerId as number)),
    enabled: hasOwner
  });

  const reload = useCallback(async () => {
    if (hasOwner) {
      await notesQuery.refetch();
    }
  }, [hasOwner, notesQuery]);

  const createNoteMutation = useMutation({
    mutationFn: async (input: NoteInput) => {
      if (!hasOwner) {
        return null;
      }
      return ownerType === "project" ? createProjectNote(ownerId as number, input) : createTaskNote(ownerId as number, input);
    },
    onSuccess: async () => {
      if (hasOwner) {
        await invalidateNotes(queryClient, ownerType as NoteOwner["type"], ownerId as number);
      }
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: NoteInput }) => updateNoteRequest(id, input),
    onSuccess: async () => {
      if (hasOwner) {
        await invalidateNotes(queryClient, ownerType as NoteOwner["type"], ownerId as number);
      }
    }
  });

  const removeNoteMutation = useMutation({
    mutationFn: deleteNoteRequest,
    onSuccess: async () => {
      if (hasOwner) {
        await invalidateNotes(queryClient, ownerType as NoteOwner["type"], ownerId as number);
      }
    }
  });

  const createNote = useCallback(
    async (input: NoteInput) => {
      return createNoteMutation.mutateAsync(input);
    },
    [createNoteMutation]
  );

  const updateNote = useCallback(
    async (id: number, input: NoteInput) => {
      return updateNoteMutation.mutateAsync({ id, input });
    },
    [updateNoteMutation]
  );

  const removeNote = useCallback(
    async (id: number) => {
      await removeNoteMutation.mutateAsync(id);
    },
    [removeNoteMutation]
  );

  return {
    notes: notesQuery.data ?? [],
    loading: notesQuery.isLoading,
    error: toQueryError(notesQuery.error),
    reload,
    createNote,
    updateNote,
    removeNote
  };
}
