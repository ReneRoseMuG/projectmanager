import type { Tag } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import { createTag as createTagRequest, getTags } from "../api/tags";
import { errorMessage } from "./errors";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTags(await getTags());
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTag = useCallback(
    async (input: { name: string; color: string }) => {
      const tag = await createTagRequest(input);
      await load();
      return tag;
    },
    [load]
  );

  return { tags, loading, error, reload: load, createTag };
}
