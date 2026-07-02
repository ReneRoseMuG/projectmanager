import type { MoveOwner } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { getProjectContextTreeForOwner } from "../api/project-context-tree";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

export function useProjectContextTree(owner: MoveOwner | null, enabled = true) {
  const hasOwner = Boolean(owner && Number.isFinite(owner.id));
  const query = useQuery({
    queryKey: owner ? queryKeys.projects.contextTree(owner.type, owner.id) : queryKeys.projects.contextTree("project", 0),
    queryFn: () => getProjectContextTreeForOwner(owner as MoveOwner),
    enabled: enabled && hasOwner
  });

  return {
    tree: query.data ?? null,
    loading: query.isLoading,
    error: toQueryError(query.error),
    reload: query.refetch
  };
}
