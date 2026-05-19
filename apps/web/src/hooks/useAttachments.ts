import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  deleteAttachment as deleteAttachmentRequest,
  getFeatureAttachments,
  getMilestoneAttachments,
  getProjectAttachments,
  getTaskAttachments,
  uploadMilestoneAttachment,
  uploadFeatureAttachment,
  uploadProjectAttachment,
  uploadTaskAttachment
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
  | { type: "ticket"; id: number };

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
      return uploadFeatureAttachment(ownerId as number, file);
    },
    onSuccess: async () => {
      if (hasOwner) {
        await invalidateAttachments(queryClient, ownerType as AttachmentOwner["type"], ownerId as number);
      }
    }
  });

  const removeMutation = useMutation({
    mutationFn: deleteAttachmentRequest,
    onSuccess: async () => {
      if (hasOwner) {
        await invalidateAttachments(queryClient, ownerType as AttachmentOwner["type"], ownerId as number);
      }
    }
  });

  const uploadAttachment = useCallback(
    async (file: File) => {
      return uploadMutation.mutateAsync(file);
    },
    [uploadMutation]
  );

  const removeAttachment = useCallback(
    async (id: number) => {
      await removeMutation.mutateAsync(id);
    },
    [removeMutation]
  );

  return {
    attachments: attachmentsQuery.data ?? [],
    loading: attachmentsQuery.isLoading,
    error: toQueryError(attachmentsQuery.error),
    reload,
    uploadAttachment,
    removeAttachment
  };
}
