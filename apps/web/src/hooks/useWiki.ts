import type { WikiPageInput, WikiPageUpdate, WikiTreeMoveRequest } from "@taskmanager/shared-types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  addWikiPageRelation,
  createWikiPage as createWikiPageRequest,
  deleteWikiPage as deleteWikiPageRequest,
  getWikiPage,
  getWikiTree,
  moveWikiPage as moveWikiPageRequest,
  removeWikiPageRelation,
  updateWikiPage as updateWikiPageRequest
} from "../api/wiki";
import { invalidateWiki, invalidateWikiDetail } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export type { WikiTreeNode } from "@taskmanager/shared-types";

export function useWiki(pageId?: number) {
  const queryClient = useQueryClient();
  const validPageId = pageId !== undefined && Number.isFinite(pageId) ? pageId : undefined;

  // Der Navigationsbaum ist seitenunabhängig und wird unter einem eigenen Query-Key gehalten,
  // damit er nur einmal geladen und beim Wechsel zwischen Seiten wiederverwendet wird.
  const treeQuery = useQuery({
    queryKey: queryKeys.wiki.tree(),
    queryFn: getWikiTree
  });

  // Nur der Inhalt der aktiven Seite hängt an der pageId. keepPreviousData hält die vorige
  // Seite sichtbar, bis die neue geladen ist — beim Wechsel kein Skeleton-/Header-Flackern.
  const pageQuery = useQuery({
    queryKey: queryKeys.wiki.detail(validPageId ?? -1),
    queryFn: () => getWikiPage(validPageId!),
    enabled: validPageId !== undefined,
    placeholderData: keepPreviousData
  });

  const reload = useCallback(async () => {
    await Promise.all([
      treeQuery.refetch(),
      validPageId !== undefined ? pageQuery.refetch() : Promise.resolve()
    ]);
  }, [treeQuery, pageQuery, validPageId]);

  const createWikiPageMutation = useMutation({
    mutationFn: createWikiPageRequest,
    onSuccess: async () => {
      await invalidateWiki(queryClient);
    }
  });

  const updateWikiPageMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: WikiPageUpdate; affectsTree?: boolean }) => updateWikiPageRequest(id, input),
    onSuccess: async (_data, variables) => {
      // Reine Inhaltsänderungen berühren den Baum nicht (er zeigt nur Titel/Hierarchie),
      // daher nur die Detailabfrage invalidieren und den Baum stehen lassen.
      if (variables.affectsTree === false) {
        await invalidateWikiDetail(queryClient, variables.id);
      } else {
        await invalidateWiki(queryClient);
      }
    }
  });

  const moveWikiPageMutation = useMutation({
    mutationFn: moveWikiPageRequest,
    onSuccess: async () => {
      await invalidateWiki(queryClient);
    }
  });

  const removeWikiPageMutation = useMutation({
    mutationFn: deleteWikiPageRequest,
    onSuccess: async () => {
      await invalidateWiki(queryClient);
    }
  });

  const createWikiPage = useCallback(
    async (input: WikiPageInput) => {
      return createWikiPageMutation.mutateAsync(input);
    },
    [createWikiPageMutation]
  );

  const updateWikiPage = useCallback(
    async (id: number, input: WikiPageUpdate, options?: { affectsTree?: boolean }) => {
      return updateWikiPageMutation.mutateAsync({ id, input, affectsTree: options?.affectsTree });
    },
    [updateWikiPageMutation]
  );

  const moveWikiPage = useCallback(
    async (input: WikiTreeMoveRequest) => {
      return moveWikiPageMutation.mutateAsync(input);
    },
    [moveWikiPageMutation]
  );

  const removeWikiPage = useCallback(
    async (id: number) => {
      await removeWikiPageMutation.mutateAsync(id);
    },
    [removeWikiPageMutation]
  );

  const syncWikiPageRelations = useCallback(
    async (id: number, currentRelationIds: number[], nextRelationIds: number[]) => {
      const current = new Set(currentRelationIds);
      const next = new Set(nextRelationIds);
      const additions = [...next].filter((relationId) => !current.has(relationId));
      const removals = [...current].filter((relationId) => !next.has(relationId));

      await Promise.all([
        ...additions.map((relationId) => addWikiPageRelation(id, relationId)),
        ...removals.map((relationId) => removeWikiPageRelation(id, relationId))
      ]);
      await invalidateWiki(queryClient);
    },
    [queryClient]
  );

  return {
    tree: treeQuery.data ?? [],
    // In der Listenansicht (keine pageId) nie eine – via keepPreviousData gehaltene – Seite durchreichen.
    page: validPageId !== undefined ? pageQuery.data ?? null : null,
    loading: treeQuery.isLoading,
    pageLoading: validPageId !== undefined && pageQuery.isLoading,
    error: toQueryError(treeQuery.error ?? pageQuery.error),
    reload,
    createWikiPage,
    updateWikiPage,
    moveWikiPage,
    syncWikiPageRelations,
    removeWikiPage
  };
}
