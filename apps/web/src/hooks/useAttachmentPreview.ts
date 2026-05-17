import type { AttachmentPreviewInfo } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { getAttachmentPreview } from "../api/attachments";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useAttachmentPreview(attachmentId: number, enabled: boolean) {
  const previewQuery = useQuery({
    queryKey: queryKeys.attachments.preview(attachmentId),
    queryFn: () => getAttachmentPreview(attachmentId),
    enabled
  });

  return {
    preview: previewQuery.data ?? (null as AttachmentPreviewInfo | null),
    loading: previewQuery.isLoading,
    error: toQueryError(previewQuery.error)
  };
}
