import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteNote as deleteNoteRequest, getNotes } from "../api/notes";
import { invalidateNoteDetail } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

export function useAllNotes() {
  const queryClient = useQueryClient();
  const notesQuery = useQuery({
    queryKey: queryKeys.notes.list(),
    queryFn: getNotes
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNoteRequest,
    onSuccess: async (_data, noteId) => {
      await invalidateNoteDetail(queryClient, noteId);
    }
  });

  const reload = useCallback(async () => {
    await notesQuery.refetch();
  }, [notesQuery]);

  const removeNote = useCallback(
    async (id: number) => {
      await deleteNoteMutation.mutateAsync(id);
    },
    [deleteNoteMutation]
  );

  return {
    notes: notesQuery.data ?? [],
    loading: notesQuery.isLoading,
    error: toQueryError(notesQuery.error),
    reload,
    removeNote
  };
}
