import type {
  Attachment,
  AttachmentLocalFileInput,
  AttachmentOwner as SharedAttachmentOwner,
  AttachmentVersionInput,
  ParentAttachmentFolderInput,
  ParentAttachmentFolderUpdate,
  ParentDocumentLinkInput,
  ParentFileMoveInput
} from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  bulkDeleteAttachments as bulkDeleteAttachmentsRequest,
  createParentAttachmentFolder,
  createParentDocumentLink,
  createAttachmentLocalFolder,
  deleteParentAttachmentFolder,
  deleteParentDocumentLink,
  deleteAttachmentLocalFolder,
  downloadAttachmentArchive,
  getFeatureAttachments,
  getMilestoneAttachments,
  getProjectAttachments,
  getTaskAttachments,
  getWikiPageAttachments,
  getAttachmentLocalEntries,
  getAttachmentLocalFolders,
  getParentAttachmentFolders,
  getParentDocumentLinks,
  moveParentAttachment,
  moveParentDocumentLink,
  updateParentAttachmentFolder,
  openAttachment as openAttachmentRequest,
  openAttachmentLocalFile,
  pickAttachmentLocalFolderPath,
  deleteOwnerAttachment,
  uploadMilestoneAttachment,
  uploadFeatureAttachment,
  uploadProjectAttachment,
  uploadTaskAttachment,
  uploadWikiPageAttachment
} from "../api/attachments";
import { openDocument as openDocumentRequest } from "../api/documents";
import { getTicketAttachments, uploadTicketAttachment } from "../api/tickets";
import { invalidateAttachments } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";
import { useProgressiveList } from "./useProgressiveList";
import { useHasPermission } from "./usePermissions";

export type AttachmentOwner = SharedAttachmentOwner;

export function useAttachments(owner: AttachmentOwner | null) {
  const queryClient = useQueryClient();
  const ownerType = owner?.type;
  const ownerId = owner?.id;
  const hasOwner = ownerType !== undefined && ownerId !== undefined && Number.isFinite(ownerId);
  const canReadDocuments = useHasPermission("documents", "read");

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
  const parentFoldersQuery = useQuery({
    queryKey: queryKeys.attachments.parentFolders(ownerType ?? "project", ownerId ?? 0),
    queryFn: () => getParentAttachmentFolders(owner as AttachmentOwner),
    enabled: hasOwner
  });
  const documentLinksQuery = useQuery({
    queryKey: queryKeys.attachments.documentLinks(ownerType ?? "project", ownerId ?? 0),
    queryFn: () => getParentDocumentLinks(owner as AttachmentOwner),
    enabled: hasOwner && canReadDocuments
  });

  const invalidate = useCallback(async () => {
    if (hasOwner) {
      await invalidateAttachments(queryClient, ownerType as AttachmentOwner["type"], ownerId as number);
    }
  }, [hasOwner, ownerId, ownerType, queryClient]);

  const reload = useCallback(async () => {
    if (hasOwner) {
      await attachmentsQuery.refetch();
      await parentFoldersQuery.refetch();
      await localFoldersQuery.refetch();
      if (canReadDocuments) {
        await documentLinksQuery.refetch();
      }
    }
  }, [attachmentsQuery, canReadDocuments, documentLinksQuery, hasOwner, localFoldersQuery, parentFoldersQuery]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!hasOwner) {
        return null;
      }
      if (ownerType === "project") {
        return uploadProjectAttachment(ownerId as number, file);
      }
      if (ownerType === "task") {
        return uploadTaskAttachment(ownerId as number, file);
      }
      if (ownerType === "milestone") {
        return uploadMilestoneAttachment(ownerId as number, file);
      }
      if (ownerType === "ticket") {
        return uploadTicketAttachment(ownerId as number, file);
      }
      if (ownerType === "wikiPage") {
        return uploadWikiPageAttachment(ownerId as number, file);
      }
      return uploadFeatureAttachment(ownerId as number, file);
    },
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      if (!owner) {
        return;
      }
      await deleteOwnerAttachment(owner, attachment);
    },
    onSuccess: invalidate
  });

  const openMutation = useMutation({
    mutationFn: openAttachmentRequest
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

  const createParentFolderMutation = useMutation({
    mutationFn: (input: ParentAttachmentFolderInput) => createParentAttachmentFolder(owner as AttachmentOwner, input),
    onSuccess: invalidate
  });
  const updateParentFolderMutation = useMutation({
    mutationFn: ({ folderId, input }: { folderId: number; input: ParentAttachmentFolderUpdate }) =>
      updateParentAttachmentFolder(owner as AttachmentOwner, folderId, input),
    onSuccess: invalidate
  });
  const deleteParentFolderMutation = useMutation({
    mutationFn: ({ folderId, expectedVersion }: { folderId: number; expectedVersion: number }) =>
      deleteParentAttachmentFolder(owner as AttachmentOwner, folderId, expectedVersion),
    onSuccess: invalidate
  });
  const moveAttachmentMutation = useMutation({
    mutationFn: ({ attachmentId, input }: { attachmentId: number; input: ParentFileMoveInput }) =>
      moveParentAttachment(owner as AttachmentOwner, attachmentId, input),
    onSuccess: invalidate
  });
  const linkDocumentMutation = useMutation({
    mutationFn: (input: ParentDocumentLinkInput) => createParentDocumentLink(owner as AttachmentOwner, input),
    onSuccess: invalidate
  });
  const moveDocumentLinkMutation = useMutation({
    mutationFn: ({ linkId, input }: { linkId: number; input: ParentFileMoveInput }) =>
      moveParentDocumentLink(owner as AttachmentOwner, linkId, input),
    onSuccess: invalidate
  });
  const unlinkDocumentMutation = useMutation({
    mutationFn: ({ linkId, expectedVersion }: { linkId: number; expectedVersion: number }) =>
      deleteParentDocumentLink(owner as AttachmentOwner, linkId, expectedVersion),
    onSuccess: invalidate
  });
  const openDocumentMutation = useMutation({ mutationFn: openDocumentRequest });

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
    async (file: File) => {
      return uploadMutation.mutateAsync(file);
    },
    [uploadMutation]
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
    parentFolders: parentFoldersQuery.data ?? [],
    documentLinks: canReadDocuments ? documentLinksQuery.data ?? [] : [],
    canReadDocuments,
    localFolders: localFoldersQuery.data ?? [],
    loading: attachmentsQuery.isLoading || parentFoldersQuery.isLoading || localFoldersQuery.isLoading || (canReadDocuments && documentLinksQuery.isLoading),
    error: toQueryError(attachmentsQuery.error ?? parentFoldersQuery.error ?? localFoldersQuery.error ?? documentLinksQuery.error),
    reload,
    uploadAttachment,
    deleteAttachmentPermanently,
    openAttachment,
    bulkDeleteAttachments: (items: AttachmentVersionInput[]) =>
      bulkDeleteMutation.mutateAsync(items),
    createParentFolder: (input: ParentAttachmentFolderInput) => createParentFolderMutation.mutateAsync(input),
    updateParentFolder: (folderId: number, input: ParentAttachmentFolderUpdate) => updateParentFolderMutation.mutateAsync({ folderId, input }),
    deleteParentFolder: (folderId: number, expectedVersion: number) => deleteParentFolderMutation.mutateAsync({ folderId, expectedVersion }),
    moveAttachment: (attachmentId: number, input: ParentFileMoveInput) => moveAttachmentMutation.mutateAsync({ attachmentId, input }),
    linkDocument: (input: ParentDocumentLinkInput) => linkDocumentMutation.mutateAsync(input),
    moveDocumentLink: (linkId: number, input: ParentFileMoveInput) => moveDocumentLinkMutation.mutateAsync({ linkId, input }),
    unlinkDocument: (linkId: number, expectedVersion: number) => unlinkDocumentMutation.mutateAsync({ linkId, expectedVersion }),
    openDocument: (id: number) => openDocumentMutation.mutateAsync(id),
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
