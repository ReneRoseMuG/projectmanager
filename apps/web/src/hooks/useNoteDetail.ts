import type { NoteUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getNote, updateNote as updateNoteRequest } from "../api/notes";
import { invalidateNoteDetail } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useNoteDetail(noteId: number | null) {
  const queryClient = useQueryClient();
  const validNoteId = noteId !== null && Number.isFinite(noteId) ? noteId : undefined;

  const noteQuery = useQuery({
    queryKey: queryKeys.notes.detail(validNoteId ?? 0),
    queryFn: () => getNote(validNoteId as number),
    enabled: validNoteId !== undefined
  });

  const reload = useCallback(async () => {
    if (validNoteId !== undefined) {
      await noteQuery.refetch();
    }
  }, [noteQuery, validNoteId]);

  const updateNoteMutation = useMutation({
    mutationFn: async (input: NoteUpdate) => {
      if (validNoteId === undefined) {
        return null;
      }
      return updateNoteRequest(validNoteId, input);
    },
    onSuccess: async (updated) => {
      await invalidateNoteDetail(queryClient, updated?.id ?? validNoteId ?? 0);
    }
  });

  const updateNote = useCallback(
    async (_id: number, input: NoteUpdate) => {
      if (validNoteId === undefined) {
        return null;
      }
      return updateNoteMutation.mutateAsync(input);
    },
    [updateNoteMutation, validNoteId]
  );

  return {
    note: noteQuery.data ?? null,
    loading: noteQuery.isLoading,
    error: toQueryError(noteQuery.error),
    reload,
    updateNote
  };
}
