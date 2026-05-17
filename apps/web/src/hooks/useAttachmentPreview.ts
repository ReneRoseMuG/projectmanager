import type { AttachmentPreviewInfo } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import { getAttachmentPreview } from "../api/attachments";
import { errorMessage } from "./errors";

export function useAttachmentPreview(attachmentId: number, enabled: boolean) {
  const [preview, setPreview] = useState<AttachmentPreviewInfo | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setPreview(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setPreview(await getAttachmentPreview(attachmentId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [attachmentId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { preview, loading, error, reload: load };
}
