import type { Attachment } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAttachment as deleteAttachmentRequest,
  getProjectAttachments,
  getTaskAttachments,
  uploadProjectAttachment,
  uploadTaskAttachment
} from "../api/attachments";
import { errorMessage } from "./errors";

export type AttachmentOwner = { type: "project"; id: number } | { type: "task"; id: number };

export function useAttachments(owner: AttachmentOwner | null) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(Boolean(owner));
  const [error, setError] = useState<string | null>(null);
  const ownerType = owner?.type;
  const ownerId = owner?.id;

  const load = useCallback(async () => {
    if (!ownerType || !ownerId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = ownerType === "project" ? await getProjectAttachments(ownerId) : await getTaskAttachments(ownerId);
      setAttachments(items);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [ownerId, ownerType]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadAttachment = useCallback(
    async (file: File) => {
      if (!ownerType || !ownerId) {
        return null;
      }

      const uploaded = ownerType === "project" ? await uploadProjectAttachment(ownerId, file) : await uploadTaskAttachment(ownerId, file);
      await load();
      return uploaded;
    },
    [load, ownerId, ownerType]
  );

  const removeAttachment = useCallback(
    async (id: number) => {
      await deleteAttachmentRequest(id);
      await load();
    },
    [load]
  );

  return { attachments, loading, error, reload: load, uploadAttachment, removeAttachment };
}
