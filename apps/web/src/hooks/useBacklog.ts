import type { BacklogItem, BacklogItemInput, BacklogItemUpdate, BacklogStatus } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createBacklogItem as createBacklogItemRequest,
  deleteBacklogItem as deleteBacklogItemRequest,
  getBacklogItems,
  updateBacklogItem as updateBacklogItemRequest,
  type BacklogFilters
} from "../api/backlog";
import { errorMessage } from "./errors";

export function useBacklog(projectId?: number) {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<BacklogStatus | "all">("all");
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const filters: BacklogFilters = statusFilter === "all" ? {} : { status: statusFilter };
      setItems(await getBacklogItems(projectId, filters));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const createItem = useCallback(
    async (input: BacklogItemInput) => {
      if (!projectId) {
        throw new Error("Project id is required");
      }
      const created = await createBacklogItemRequest(projectId, input);
      await load();
      return created;
    },
    [projectId, load]
  );

  const updateItem = useCallback(
    async (id: number, input: BacklogItemUpdate) => {
      const updated = await updateBacklogItemRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const removeItem = useCallback(
    async (id: number) => {
      await deleteBacklogItemRequest(id);
      await load();
    },
    [load]
  );

  return { items, statusFilter, setStatusFilter, loading, error, reload: load, createItem, updateItem, removeItem };
}
