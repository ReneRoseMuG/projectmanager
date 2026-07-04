import type { Note } from "@taskmanager/shared-types";
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNote as deleteNoteRequest, getNotesPage, type NotesListFilter } from "../api/notes";
import { invalidateNoteDetail } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { useProgressiveList } from "./useProgressiveList";

// Notizen-Hauptliste (global) mit progressivem Nachladen (MS-75 Muster). Filter/Suche laufen
// serverseitig je Chunk; `total` ist die Gesamtzahl nach Filter. Der Hook lädt den ersten Block
// sofort und hängt weitere Blöcke sequenziell an, bis alle Notizen geladen sind.
export function useAllNotes(filter: NotesListFilter) {
  const queryClient = useQueryClient();
  const notesQuery = useProgressiveList<Note>(
    queryKeys.notes.list(filter as object),
    (page, pageSize) => getNotesPage(filter, { page, pageSize })
  );

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNoteRequest,
    onSuccess: async (_data, noteId) => {
      await invalidateNoteDetail(queryClient, noteId);
    }
  });

  const removeNote = useCallback(
    async (id: number) => {
      await deleteNoteMutation.mutateAsync(id);
    },
    [deleteNoteMutation]
  );

  return {
    notes: notesQuery.items,
    total: notesQuery.total,
    loadedCount: notesQuery.loadedCount,
    loading: notesQuery.loading,
    loadingMore: notesQuery.loadingMore,
    error: notesQuery.error,
    removeNote
  };
}
