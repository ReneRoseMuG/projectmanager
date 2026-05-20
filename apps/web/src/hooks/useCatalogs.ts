import type { CatalogEntry, CatalogEntryInput, CatalogEntryUpdate, CatalogKind } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createCatalogEntry as createCatalogEntryRequest,
  deleteCatalogEntry as deleteCatalogEntryRequest,
  getCatalogEntries,
  updateCatalogEntry as updateCatalogEntryRequest
} from "../api/catalogs";
import { invalidateCatalogs } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";
import { catalogEntriesByKind } from "../utils/catalogs";

export function useCatalogs() {
  const queryClient = useQueryClient();
  const catalogsQuery = useQuery({
    queryKey: queryKeys.catalogs.list(),
    queryFn: getCatalogEntries
  });

  const entries = catalogsQuery.data ?? ([] as CatalogEntry[]);

  const reload = useCallback(async () => {
    await invalidateCatalogs(queryClient);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: ({ kind, input }: { kind: CatalogKind; input: CatalogEntryInput }) => createCatalogEntryRequest(kind, input),
    onSuccess: async () => {
      await invalidateCatalogs(queryClient);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ kind, id, input }: { kind: CatalogKind; id: number; input: CatalogEntryUpdate }) => updateCatalogEntryRequest(kind, id, input),
    onSuccess: async () => {
      await invalidateCatalogs(queryClient);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: CatalogKind; id: number }) => deleteCatalogEntryRequest(kind, id),
    onSuccess: async () => {
      await invalidateCatalogs(queryClient);
    }
  });

  const createEntry = useCallback((kind: CatalogKind, input: CatalogEntryInput) => createMutation.mutateAsync({ kind, input }), [createMutation]);
  const updateEntry = useCallback((kind: CatalogKind, id: number, input: CatalogEntryUpdate) => updateMutation.mutateAsync({ kind, id, input }), [updateMutation]);
  const deleteEntry = useCallback((kind: CatalogKind, id: number) => deleteMutation.mutateAsync({ kind, id }), [deleteMutation]);

  return {
    entries,
    workStatuses: catalogEntriesByKind(entries, "workStatus"),
    featureStatuses: catalogEntriesByKind(entries, "featureStatus"),
    priorities: catalogEntriesByKind(entries, "priority"),
    loading: catalogsQuery.isLoading,
    error: toQueryError(catalogsQuery.error),
    reload,
    createEntry,
    updateEntry,
    deleteEntry
  };
}
