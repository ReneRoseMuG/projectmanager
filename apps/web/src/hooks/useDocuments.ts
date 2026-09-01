import type {
  Attachment,
  AttachmentFolder,
  AttachmentVersionInput,
  DocumentDuplicateCheck,
  Paginated,
} from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { useCallback } from "react";
import * as documentsApi from "../api/documents";
import type { DocumentLibraryFilter } from "../api/documents";
import { useProgressiveList } from "./useProgressiveList";
import { invalidateDocumentDuplicateCheck, invalidateDocuments } from "../queries/invalidation";
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
    error: list.error,
    reload
  };
}

export function useFolders() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.documents.folders(), queryFn: documentsApi.getAttachmentFolders });
  const invalidate = useCallback(() => invalidateDocuments(queryClient), [queryClient]);

  const createMutation = useMutation({ mutationFn: documentsApi.createAttachmentFolder, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { name?: string; parentId?: number | null; expectedVersion: number } }) =>
      documentsApi.updateAttachmentFolder(id, input),
    onSuccess: invalidate
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedVersion }: { id: number; expectedVersion: number }) => documentsApi.deleteAttachmentFolder(id, expectedVersion),
    onSuccess: invalidate
  });

  return {
    folders: query.data ?? ([] as AttachmentFolder[]),
    loading: query.isLoading,
    error: toQueryError(query.error),
    createFolder: (input: { name: string; parentId?: number | null }) => createMutation.mutateAsync(input),
    updateFolder: (id: number, input: { name?: string; parentId?: number | null; expectedVersion: number }) =>
      updateMutation.mutateAsync({ id, input }),
    deleteFolder: (id: number, expectedVersion: number) => deleteMutation.mutateAsync({ id, expectedVersion })
  };
}

export function useDocumentActions() {
  const queryClient = useQueryClient();
  const invalidate = useCallback(() => invalidateDocuments(queryClient), [queryClient]);

  const uploadMutation = useMutation({
    mutationFn: ({ file, folderId, tagIds }: { file: File; folderId?: number; tagIds: number[] }) =>
      documentsApi.uploadDocument(file, folderId, tagIds),
    onSuccess: invalidate
  });
  const metadataMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { displayName?: string | null; description?: string | null; expectedVersion: number } }) =>
      documentsApi.updateDocumentMetadata(id, input),
    onSuccess: invalidate
  });
  const tagsMutation = useMutation({
    mutationFn: ({ id, tagIds, expectedVersion }: { id: number; tagIds: number[]; expectedVersion: number }) =>
      documentsApi.setDocumentTags(id, tagIds, expectedVersion),
    onSuccess: invalidate
  });
  const bulkTagsMutation = useMutation({
    mutationFn: ({ attachments, tagIds }: { attachments: AttachmentVersionInput[]; tagIds: number[] }) =>
      documentsApi.addDocumentTagsBulk(attachments, tagIds),
    onSuccess: async (updatedDocuments) => {
      const updatedById = new Map(updatedDocuments.map((document) => [document.id, document]));
      queryClient.setQueriesData<InfiniteData<Paginated<Attachment>>>(
        { queryKey: [...queryKeys.documents.root, "library"] },
        (current) => {
          if (!current || !Array.isArray(current.pages)) {
            return current;
          }
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.map((document) => updatedById.get(document.id) ?? document),
            })),
          };
        },
      );
      await invalidate();
    }
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, expectedVersion }: { id: number; expectedVersion: number }) => documentsApi.deleteDocumentPermanently(id, expectedVersion),
    onSuccess: invalidate
  });
  const folderMutation = useMutation({
    mutationFn: ({ id, folderId, expectedVersion }: { id: number; folderId: number | null; expectedVersion: number }) =>
      documentsApi.setDocumentFolder(id, folderId, expectedVersion),
    onSuccess: invalidate
  });
  return {
    uploadDocument: (file: File, folderId?: number, tagIds: number[] = []) => uploadMutation.mutateAsync({ file, folderId, tagIds }),
    updateMetadata: (id: number, input: { displayName?: string | null; description?: string | null; expectedVersion: number }) =>
      metadataMutation.mutateAsync({ id, input }),
    setTags: (id: number, tagIds: number[], expectedVersion: number) => tagsMutation.mutateAsync({ id, tagIds, expectedVersion }),
    addTagsBulk: (attachments: AttachmentVersionInput[], tagIds: number[]) =>
      bulkTagsMutation.mutateAsync({ attachments, tagIds }),
    addingTagsBulk: bulkTagsMutation.isPending,
    deleteDocumentPermanently: (id: number, expectedVersion: number) => deleteMutation.mutateAsync({ id, expectedVersion }),
    setDocumentFolder: (id: number, folderId: number | null, expectedVersion: number) =>
      folderMutation.mutateAsync({ id, folderId, expectedVersion })
  };
}

export function useDocumentDuplicateCheck() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.documents.duplicateCheck(),
    queryFn: documentsApi.getDocumentDuplicateCheck,
    refetchInterval: (currentQuery) => currentQuery.state.data?.status === "running" ? 500 : false
  });
  const startMutation = useMutation({
    mutationFn: documentsApi.startDocumentDuplicateCheck,
    onSuccess: async (check) => {
      queryClient.setQueryData(queryKeys.documents.duplicateCheck(), check);
      await invalidateDocumentDuplicateCheck(queryClient);
    }
  });

  return {
    check: query.data ?? (null as DocumentDuplicateCheck | null),
    loading: query.isLoading,
    starting: startMutation.isPending,
    error: toQueryError(query.error ?? startMutation.error),
    startCheck: () => startMutation.mutateAsync()
  };
}
