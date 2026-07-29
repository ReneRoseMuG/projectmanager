import type {
  Attachment,
  AttachmentLibrarySelection,
  AttachmentLocalFileInput,
  AttachmentOwner as SharedAttachmentOwner,
  AttachmentVersionInput
} from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  deleteAttachmentPermanently as deleteAttachmentPermanentlyRequest,
  bulkDeleteAttachments as bulkDeleteAttachmentsRequest,
  bulkSetAttachmentFolder as bulkSetAttachmentFolderRequest,
  bulkUnlinkAttachments as bulkUnlinkAttachmentsRequest,
  createAttachmentLocalFolder,
  deleteAttachmentLocalFolder,
  downloadAttachmentArchive,
  getFeatureAttachments,
  getMilestoneAttachments,
  getProjectAttachments,
  getTaskAttachments,
  getWikiPageAttachments,
  getAttachmentLocalEntries,
  getAttachmentLocalFolders,
  openAttachment as openAttachmentRequest,
  openAttachmentLocalFile,
  pickAttachmentLocalFolderPath,
  unlinkOwnerAttachment,
  uploadMilestoneAttachment,
  uploadFeatureAttachment,
  uploadProjectAttachment,
  uploadTaskAttachment,
  uploadWikiPageAttachment
} from "../api/attachments";
import { getTicketAttachments, uploadTicketAttachment } from "../api/tickets";
import { invalidateAttachments } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";
import { useProgressiveList } from "./useProgressiveList";

export type AttachmentOwner = SharedAttachmentOwner;

export function useAttachments(owner: AttachmentOwner | null) {
  const queryClient = useQueryClient();
  const ownerType = owner?.type;
  const ownerId = owner?.id;
  const hasOwner = ownerType !== undefined && ownerId !== undefined && Number.isFinite(ownerId);

  const attachmentsQuery = useQuery({
    queryKey: queryKeys.attachments.owner(ownerType ?? "project", ownerId ?? 0),
    queryFn: () => {
      if (ownerType === "project") {
        return getProjectAttachments(ownerId as number);
      }
      if (ownerType === "task") {
        return getTaskAttachments(ownerId as number);
      }
      if (ownerType === "milestone") {
        return getMilestoneAttachments(ownerId as number);
      }
      if (ownerType === "ticket") {
        return getTicketAttachments(ownerId as number);
      }
      if (ownerType === "wikiPage") {
        return getWikiPageAttachments(ownerId as number);
      }
      return getFeatureAttachments(ownerId as number);
    },
    enabled: hasOwner
  });
  const localFoldersQuery = useQuery({
    queryKey: queryKeys.attachments.localFolders(ownerType ?? "project", ownerId ?? 0),
    queryFn: () => getAttachmentLocalFolders(owner as AttachmentOwner),
    enabled: hasOwner
  });

  const invalidate = useCallback(async () => {
    if (hasOwner) {
      await invalidateAttachments(queryClient, ownerType as AttachmentOwner["type"], ownerId as number);
    }
  }, [hasOwner, ownerId, ownerType, queryClient]);

  const reload = useCallback(async () => {
    if (hasOwner) {
      await Promise.all([attachmentsQuery.refetch(), localFoldersQuery.refetch()]);
    }
  }, [attachmentsQuery, hasOwner, localFoldersQuery]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, librarySelection }: { file: File; librarySelection: AttachmentLibrarySelection }) => {
      if (!hasOwner) {
        return null;
      }
      if (ownerType === "project") {
        return uploadProjectAttachment(ownerId as number, file, librarySelection);
      }
      if (ownerType === "task") {
        return uploadTaskAttachment(ownerId as number, file, librarySelection);
      }
      if (ownerType === "milestone") {
        return uploadMilestoneAttachment(ownerId as number, file, librarySelection);
      }
      if (ownerType === "ticket") {
        return uploadTicketAttachment(ownerId as number, file, librarySelection);
      }
      if (ownerType === "wikiPage") {
        return uploadWikiPageAttachment(ownerId as number, file, librarySelection);
      }
      return uploadFeatureAttachment(ownerId as number, file, librarySelection);
    },
    onSuccess: invalidate
  });

  const unlinkMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      if (!owner) {
        return;
      }
      const orphanAction = !attachment.isInDocumentLibrary && attachment.owners.length <= 1 ? "add-to-library" as const : undefined;
      await unlinkOwnerAttachment(owner, attachment, orphanAction);
    },
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttachmentPermanentlyRequest,
    onSuccess: invalidate
  });

  const openMutation = useMutation({
    mutationFn: openAttachmentRequest
  });

  const bulkUnlinkMutation = useMutation({
    mutationFn: (items: AttachmentVersionInput[]) => {
      if (!owner) {
        return Promise.resolve();
      }
      return bulkUnlinkAttachmentsRequest(owner, items);
    },
    onSuccess: invalidate
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (items: AttachmentVersionInput[]) => {
      if (!owner) {
        return Promise.resolve();
      }
      return bulkDeleteAttachmentsRequest(owner, items);
    },
    onSuccess: invalidate
  });

  const bulkFolderMutation = useMutation({
    mutationFn: ({
      items,
      folderId
    }: {
      items: AttachmentVersionInput[];
      folderId: number | null;
    }) => {
      if (!owner) {
        return Promise.resolve();
      }
      return bulkSetAttachmentFolderRequest(owner, items, folderId);
    },
    onSuccess: invalidate
  });

  const archiveMutation = useMutation({
    mutationFn: ({
      attachmentIds,
      localFiles
    }: {
      attachmentIds: number[];
      localFiles: AttachmentLocalFileInput[];
    }) => {
      if (!owner) {
        return Promise.reject(new Error("Attachment owner is required"));
      }
      return downloadAttachmentArchive(owner, attachmentIds, localFiles);
    }
  });

  const createLocalFolderMutation = useMutation({
    mutationFn: ({ rootPath, name }: { rootPath: string; name?: string }) => {
      if (!owner) {
        return Promise.reject(new Error("Attachment owner is required"));
      }
      return createAttachmentLocalFolder(owner, rootPath, name);
    },
    onSuccess: invalidate
  });

  const deleteLocalFolderMutation = useMutation({
    mutationFn: ({ id, expectedVersion }: { id: number; expectedVersion: number }) =>
      deleteAttachmentLocalFolder(id, expectedVersion),
    onSuccess: invalidate
  });

  const pickLocalFolderMutation = useMutation({
    mutationFn: pickAttachmentLocalFolderPath
  });

  const uploadAttachment = useCallback(
    async (file: File, librarySelection: AttachmentLibrarySelection) => {
      return uploadMutation.mutateAsync({ file, librarySelection });
    },
    [uploadMutation]
  );

  const unlinkAttachment = useCallback(
    async (attachment: Attachment) => {
      await unlinkMutation.mutateAsync(attachment);
    },
    [unlinkMutation]
  );

  const deleteAttachmentPermanently = useCallback(
    async (attachment: Attachment) => {
      await deleteMutation.mutateAsync(attachment);
    },
    [deleteMutation]
  );

  const openAttachment = useCallback(
    async (id: number) => {
      await openMutation.mutateAsync(id);
    },
    [openMutation]
  );

  return {
    attachments: attachmentsQuery.data ?? [],
    localFolders: localFoldersQuery.data ?? [],
    loading: attachmentsQuery.isLoading || localFoldersQuery.isLoading,
    error: toQueryError(attachmentsQuery.error ?? localFoldersQuery.error),
    reload,
    uploadAttachment,
    unlinkAttachment,
    deleteAttachmentPermanently,
    openAttachment,
    bulkUnlinkAttachments: (items: AttachmentVersionInput[]) =>
      bulkUnlinkMutation.mutateAsync(items),
    bulkDeleteAttachments: (items: AttachmentVersionInput[]) =>
      bulkDeleteMutation.mutateAsync(items),
    bulkSetAttachmentFolder: (items: AttachmentVersionInput[], folderId: number | null) =>
      bulkFolderMutation.mutateAsync({ items, folderId }),
    downloadArchive: (attachmentIds: number[], localFiles: AttachmentLocalFileInput[]) =>
      archiveMutation.mutateAsync({ attachmentIds, localFiles }),
    pickLocalFolderPath: () => pickLocalFolderMutation.mutateAsync(),
    createLocalFolder: (rootPath: string, name?: string) =>
      createLocalFolderMutation.mutateAsync({ rootPath, name }),
    deleteLocalFolder: (id: number, expectedVersion: number) =>
      deleteLocalFolderMutation.mutateAsync({ id, expectedVersion }),
    openingAttachmentId: openMutation.isPending ? (openMutation.variables ?? null) : null
  };
}

export function useAttachmentLocalEntries(folderId: number | null, relativePath: string) {
  const list = useProgressiveList(
    queryKeys.attachments.localEntries(folderId ?? 0, relativePath),
    (page, pageSize) =>
      getAttachmentLocalEntries(folderId as number, relativePath, page, pageSize),
    { enabled: folderId !== null }
  );
  const openMutation = useMutation({
    mutationFn: ({ selectedFolderId, selectedPath }: { selectedFolderId: number; selectedPath: string }) =>
      openAttachmentLocalFile(selectedFolderId, selectedPath)
  });
  return {
    entries: list.items,
    total: list.total,
    loadedCount: list.loadedCount,
    loading: list.loading,
    loadingMore: list.loadingMore,
    error: list.error,
    openLocalFile: (selectedFolderId: number, selectedPath: string) =>
      openMutation.mutateAsync({ selectedFolderId, selectedPath }),
    openingPath: openMutation.isPending ? (openMutation.variables?.selectedPath ?? null) : null
  };
}
