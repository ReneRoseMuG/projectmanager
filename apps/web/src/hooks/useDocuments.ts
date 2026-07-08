import type { AttachmentCategory, AttachmentFolder } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import * as documentsApi from "../api/documents";
import type { DocumentLibraryFilter } from "../api/documents";
import { useProgressiveList } from "./useProgressiveList";
import { invalidateDocuments } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

// Progressive Bibliotheks-Abfrage (MS-75): statt Seitenzahl-Blättern wird der erste Block
// sofort geladen und die weiteren Blöcke sequenziell automatisch nachgeladen. Server-Filter/
// Suche (`filter`) gehen in jeden Chunk-Abruf. Filterwechsel ändert den queryKey und startet
// das progressive Laden von vorne. `total` ist die Gesamtzahl nach Filter/Suche.
export function useDocumentLibrary(filter: DocumentLibraryFilter) {
  const queryClient = useQueryClient();
  const list = useProgressiveList(
    queryKeys.documents.library(filter as object),
    (page, pageSize) => documentsApi.getDocumentLibraryPage(filter, { page, pageSize })
  );
  const reload = useCallback(async () => {
    await invalidateDocuments(queryClient);
  }, [queryClient]);
  return {
    documents: list.items,
    total: list.total,
    loadedCount: list.loadedCount,
    loading: list.loading,
    loadingMore: list.loadingMore,
    // Erst wenn ALLE Blöcke geladen sind. Zwischen zwei Blöcken sind `loading` und `loadingMore`
    // beide kurz false, obwohl noch Dokumente fehlen — wer auf „fertig" prüfen will, braucht dies.
    isComplete: list.isComplete,
    error: list.error,
    reload
  };
}

export function useCategories() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.documents.categories(), queryFn: documentsApi.getAttachmentCategories });
  const invalidate = useCallback(() => invalidateDocuments(queryClient), [queryClient]);

  const createMutation = useMutation({ mutationFn: documentsApi.createAttachmentCategory, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { name?: string; color?: string; expectedVersion: number } }) =>
      documentsApi.updateAttachmentCategory(id, input),
    onSuccess: invalidate
  });
  const deleteMutation = useMutation({ mutationFn: documentsApi.deleteAttachmentCategory, onSuccess: invalidate });

  return {
    categories: query.data ?? ([] as AttachmentCategory[]),
    loading: query.isLoading,
    error: toQueryError(query.error),
    createCategory: (input: { name: string; color?: string }) => createMutation.mutateAsync(input),
    updateCategory: (id: number, input: { name?: string; color?: string; expectedVersion: number }) =>
      updateMutation.mutateAsync({ id, input }),
    deleteCategory: (id: number) => deleteMutation.mutateAsync(id)
  };
}

export function useFolders() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.documents.folders(), queryFn: documentsApi.getAttachmentFolders });
  const invalidate = useCallback(() => invalidateDocuments(queryClient), [queryClient]);

  const createMutation = useMutation({ mutationFn: documentsApi.createAttachmentFolder, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { name?: string; parentId?: number | null; projectId?: number | null; expectedVersion: number } }) =>
      documentsApi.updateAttachmentFolder(id, input),
    onSuccess: invalidate
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, recursive }: { id: number; recursive?: boolean }) => documentsApi.deleteAttachmentFolder(id, recursive),
    onSuccess: invalidate
  });

  return {
    folders: query.data ?? ([] as AttachmentFolder[]),
    loading: query.isLoading,
    error: toQueryError(query.error),
    createFolder: (input: { name: string; parentId?: number | null; projectId?: number | null }) => createMutation.mutateAsync(input),
    updateFolder: (id: number, input: { name?: string; parentId?: number | null; projectId?: number | null; expectedVersion: number }) =>
      updateMutation.mutateAsync({ id, input }),
    deleteFolder: (id: number, recursive?: boolean) => deleteMutation.mutateAsync({ id, recursive })
  };
}

export function useDocumentActions() {
  const queryClient = useQueryClient();
  const invalidate = useCallback(() => invalidateDocuments(queryClient), [queryClient]);

  // BEWUSST OHNE `onSuccess: invalidate`. Der Uploader lädt mehrere Dateien sequenziell hoch; eine
  // Invalidierung je Datei würde jedes Mal die gesamte (progressiv geladene) Bibliothek neu holen —
  // und weil `mutateAsync` auf `onSuccess` wartet, würde der nächste Upload darauf blockieren.
  // Der Aufrufer lädt stattdessen EINMAL am Ende des Upload-Vorgangs über `refreshDocuments` nach.
  const uploadMutation = useMutation({
    mutationFn: ({ file, folderId, categoryId }: { file: File; folderId?: number; categoryId?: number }) =>
      documentsApi.uploadDocument(file, folderId, categoryId)
  });
  const metadataMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { displayName?: string | null; description?: string | null; expectedVersion: number } }) =>
      documentsApi.updateDocumentMetadata(id, input),
    onSuccess: invalidate
  });
  const tagsMutation = useMutation({
    mutationFn: ({ id, tagIds }: { id: number; tagIds: number[] }) => documentsApi.setDocumentTags(id, tagIds),
    onSuccess: invalidate
  });
  const deleteMutation = useMutation({ mutationFn: documentsApi.deleteDocument, onSuccess: invalidate });
  const moveMutation = useMutation({
    mutationFn: ({ id, fromFolderId, toFolderId }: { id: number; fromFolderId: number; toFolderId: number }) =>
      documentsApi.moveDocument(id, fromFolderId, toFolderId),
    onSuccess: invalidate
  });
  const assignCategoryMutation = useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId: number }) => documentsApi.assignDocumentCategory(id, categoryId),
    onSuccess: invalidate
  });
  const removeCategoryMutation = useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId: number }) => documentsApi.removeDocumentCategory(id, categoryId),
    onSuccess: invalidate
  });
  const addToFolderMutation = useMutation({
    mutationFn: ({ folderId, attachmentId }: { folderId: number; attachmentId: number }) => documentsApi.addDocumentToFolder(folderId, attachmentId),
    onSuccess: invalidate
  });
  const removeFromFolderMutation = useMutation({
    mutationFn: ({ folderId, attachmentId }: { folderId: number; attachmentId: number }) => documentsApi.removeDocumentFromFolder(folderId, attachmentId),
    onSuccess: invalidate
  });
  const addToFolderBulkMutation = useMutation({
    mutationFn: ({ folderId, attachmentIds }: { folderId: number; attachmentIds: number[] }) => documentsApi.addDocumentsToFolder(folderId, attachmentIds),
    onSuccess: invalidate
  });
  const assignCategoryBulkMutation = useMutation({
    mutationFn: ({ categoryId, attachmentIds }: { categoryId: number; attachmentIds: number[] }) => documentsApi.assignDocumentsCategory(categoryId, attachmentIds),
    onSuccess: invalidate
  });

  return {
    uploadDocument: (file: File, folderId?: number, categoryId?: number) =>
      uploadMutation.mutateAsync({ file, folderId, categoryId }),
    // Gehört zu `uploadDocument`: einmal nach dem gesamten Upload-Vorgang aufrufen.
    refreshDocuments: invalidate,
    updateMetadata: (id: number, input: { displayName?: string | null; description?: string | null; expectedVersion: number }) =>
      metadataMutation.mutateAsync({ id, input }),
    setTags: (id: number, tagIds: number[]) => tagsMutation.mutateAsync({ id, tagIds }),
    deleteDocument: (id: number) => deleteMutation.mutateAsync(id),
    moveDocument: (id: number, fromFolderId: number, toFolderId: number) => moveMutation.mutateAsync({ id, fromFolderId, toFolderId }),
    assignCategory: (id: number, categoryId: number) => assignCategoryMutation.mutateAsync({ id, categoryId }),
    removeCategory: (id: number, categoryId: number) => removeCategoryMutation.mutateAsync({ id, categoryId }),
    addToFolder: (folderId: number, attachmentId: number) => addToFolderMutation.mutateAsync({ folderId, attachmentId }),
    removeFromFolder: (folderId: number, attachmentId: number) => removeFromFolderMutation.mutateAsync({ folderId, attachmentId }),
    addToFolderBulk: (folderId: number, attachmentIds: number[]) => addToFolderBulkMutation.mutateAsync({ folderId, attachmentIds }),
    assignCategoryBulk: (categoryId: number, attachmentIds: number[]) => assignCategoryBulkMutation.mutateAsync({ categoryId, attachmentIds }),
    // Reiner Lese-Download (Zip-Blob), kein Server-State → keine Invalidierung.
    downloadZip: (attachmentIds: number[]) => documentsApi.downloadDocumentsZip(attachmentIds)
  };
}
