import type { Comment, CommentEntityType, CommentInput } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import { createEntityComment, deleteEntityComment, getEntityComments } from "../api/comments";
import { errorMessage } from "./errors";

export function useEntityComments(entityType: CommentEntityType, entityId?: number | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(Boolean(entityId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!entityId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setComments(await getEntityComments(entityType, entityId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const createComment = useCallback(
    async (input: CommentInput) => {
      if (!entityId) {
        return null;
      }
      const created = await createEntityComment(entityType, entityId, input);
      await load();
      return created;
    },
    [entityId, entityType, load]
  );

  const removeComment = useCallback(
    async (commentId: number) => {
      if (!entityId) {
        return;
      }
      await deleteEntityComment(entityType, entityId, commentId);
      await load();
    },
    [entityId, entityType, load]
  );

  return { comments, loading, error, reload: load, createComment, removeComment };
}
