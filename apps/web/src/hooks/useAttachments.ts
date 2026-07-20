import type { Attachment, AttachmentLibrarySelection } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  deleteAttachmentPermanently as deleteAttachmentPermanentlyRequest,
  getFeatureAttachments,
  getMilestoneAttachments,
  getProjectAttachments,
  getTaskAttachments,
  getWikiPageAttachments,
  openAttachment as openAttachmentRequest,
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

export type AttachmentOwner =
  | { type: "project"; id: number }
  | { type: "milestone"; id: number }
  | { type: "task"; id: number }
  | { type: "feature"; id: number }
  | { type: "ticket"; id: number }
  | { type: "wikiPage"; id: number };

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

  const reload = useCallback(async () => {
    if (hasOwner) {
      await attachmentsQuery.refetch();
    }
  }, [attachmentsQuery, hasOwner]);

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
    onSuccess: () => {
      if (hasOwner) {
        void invalidateAttachments(queryClient, ownerType as AttachmentOwner["type"], ownerId as number);
      }
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      if (!owner) {
        return;
      }
      const orphanAction = !attachment.isInDocumentLibrary && attachment.owners.length <= 1 ? "add-to-library" as const : undefined;
      await unlinkOwnerAttachment(owner, attachment, orphanAction);
    },
    onSuccess: () => {
      if (hasOwner) {
        void invalidateAttachments(queryClient, ownerType as AttachmentOwner["type"], ownerId as number);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttachmentPermanentlyRequest,
    onSuccess: () => {
      if (hasOwner) {
        void invalidateAttachments(queryClient, ownerType as AttachmentOwner["type"], ownerId as number);
      }
    }
  });

  const openMutation = useMutation({
    mutationFn: openAttachmentRequest
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
    loading: attachmentsQuery.isLoading,
    error: toQueryError(attachmentsQuery.error),
    reload,
    uploadAttachment,
    unlinkAttachment,
    deleteAttachmentPermanently,
    openAttachment,
    openingAttachmentId: openMutation.isPending ? (openMutation.variables ?? null) : null
  };
}
