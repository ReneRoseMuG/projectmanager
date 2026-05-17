import type { WikiBreadcrumb, WikiPage, WikiPageInput, WikiPageUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createWikiPage as createWikiPageRequest,
  deleteWikiPage as deleteWikiPageRequest,
  getRootWikiPages,
  getWikiBreadcrumb,
  getWikiChildren,
  getWikiPage,
  updateWikiPage as updateWikiPageRequest
} from "../api/wiki";
import { invalidateWiki } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export interface WikiTreeNode extends WikiPage {
  children: WikiTreeNode[];
}

interface WikiData {
  tree: WikiTreeNode[];
  page: WikiPage | null;
  breadcrumb: WikiBreadcrumb[];
}

async function loadNode(page: WikiPage): Promise<WikiTreeNode> {
  const children = page.childCount > 0 ? await getWikiChildren(page.id) : [];
  return {
    ...page,
    children: await Promise.all(children.map(loadNode))
  };
}

async function loadWikiData(pageId?: number): Promise<WikiData> {
  const roots = await getRootWikiPages();
  const tree = await Promise.all(roots.map(loadNode));
  if (!pageId) {
    return { tree, page: null, breadcrumb: [] };
  }

  const [page, breadcrumb] = await Promise.all([getWikiPage(pageId), getWikiBreadcrumb(pageId)]);
  return { tree, page, breadcrumb };
}

export function useWiki(pageId?: number) {
  const queryClient = useQueryClient();
  const validPageId = pageId !== undefined && Number.isFinite(pageId) ? pageId : undefined;

  const wikiQuery = useQuery({
    queryKey: validPageId !== undefined ? queryKeys.wiki.detail(validPageId) : queryKeys.wiki.tree(),
    queryFn: () => loadWikiData(validPageId)
  });

  const reload = useCallback(async () => {
    await wikiQuery.refetch();
  }, [wikiQuery]);

  const createWikiPageMutation = useMutation({
    mutationFn: createWikiPageRequest,
    onSuccess: async () => {
      await invalidateWiki(queryClient);
    }
  });

  const updateWikiPageMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: WikiPageUpdate }) => updateWikiPageRequest(id, input),
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
    async (id: number, input: WikiPageUpdate) => {
      return updateWikiPageMutation.mutateAsync({ id, input });
    },
    [updateWikiPageMutation]
  );

  const removeWikiPage = useCallback(
    async (id: number) => {
      await removeWikiPageMutation.mutateAsync(id);
    },
    [removeWikiPageMutation]
  );

  return {
    tree: wikiQuery.data?.tree ?? [],
    page: wikiQuery.data?.page ?? null,
    breadcrumb: wikiQuery.data?.breadcrumb ?? [],
    loading: wikiQuery.isLoading,
    error: toQueryError(wikiQuery.error),
    reload,
    createWikiPage,
    updateWikiPage,
    removeWikiPage
  };
}
