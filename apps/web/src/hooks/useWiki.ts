import type { WikiBreadcrumb, WikiPage, WikiPageInput, WikiPageUpdate } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createWikiPage as createWikiPageRequest,
  deleteWikiPage as deleteWikiPageRequest,
  getRootWikiPages,
  getWikiBreadcrumb,
  getWikiChildren,
  getWikiPage,
  updateWikiPage as updateWikiPageRequest
} from "../api/wiki";
import { errorMessage } from "./errors";

export interface WikiTreeNode extends WikiPage {
  children: WikiTreeNode[];
}

async function loadNode(page: WikiPage): Promise<WikiTreeNode> {
  const children = page.childCount > 0 ? await getWikiChildren(page.id) : [];
  return {
    ...page,
    children: await Promise.all(children.map(loadNode))
  };
}

export function useWiki(pageId?: number) {
  const [tree, setTree] = useState<WikiTreeNode[]>([]);
  const [page, setPage] = useState<WikiPage | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<WikiBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const roots = await getRootWikiPages();
      setTree(await Promise.all(roots.map(loadNode)));
      if (pageId) {
        const [loadedPage, loadedBreadcrumb] = await Promise.all([getWikiPage(pageId), getWikiBreadcrumb(pageId)]);
        setPage(loadedPage);
        setBreadcrumb(loadedBreadcrumb);
      } else {
        setPage(null);
        setBreadcrumb([]);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createWikiPage = useCallback(
    async (input: WikiPageInput) => {
      const created = await createWikiPageRequest(input);
      await load();
      return created;
    },
    [load]
  );

  const updateWikiPage = useCallback(
    async (id: number, input: WikiPageUpdate) => {
      const updated = await updateWikiPageRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const removeWikiPage = useCallback(
    async (id: number) => {
      await deleteWikiPageRequest(id);
      await load();
    },
    [load]
  );

  return { tree, page, breadcrumb, loading, error, reload: load, createWikiPage, updateWikiPage, removeWikiPage };
}
