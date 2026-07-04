import type { Tag, TagDomain } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createTag as createTagRequest, getTags } from "../api/tags";
import { invalidateTags } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useTags(domain?: TagDomain, enabled = true) {
  const queryClient = useQueryClient();
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.list(domain),
    queryFn: () => getTags(domain),
    enabled
  });

  const reload = useCallback(async () => {
    await invalidateTags(queryClient);
  }, [queryClient]);

  const createTagMutation = useMutation({
    mutationFn: createTagRequest,
    onSuccess: async () => {
      await invalidateTags(queryClient);
    }
  });

  const createTag = useCallback(
    async (input: { name: string; color: string; domain?: TagDomain }) => {
      return createTagMutation.mutateAsync(input);
    },
    [createTagMutation]
  );

  return {
    tags: tagsQuery.data ?? ([] as Tag[]),
    loading: tagsQuery.isLoading,
    error: toQueryError(tagsQuery.error),
    reload,
    createTag
  };
}
