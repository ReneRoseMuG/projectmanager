import type { FeatureInput, FeatureUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createFeature as createFeatureRequest,
  deleteFeature as deleteFeatureRequest,
  getFeature,
  getFeatures,
  getFeaturesPage,
  updateFeature as updateFeatureRequest,
  type FeatureListFilter
} from "../api/features";
import { invalidateFeatureScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";
import { useProgressiveList } from "./useProgressiveList";

// Progressiv nachgeladene Feature-Liste (MS-75, analog useDocumentLibrary). Statt
// Seitenzahl-Blättern lädt useProgressiveList die Blöcke sequenziell nach und hängt sie
// an, bis alle Datensätze da sind. `total` ist die Gesamtzahl nach Filter/Suche;
// `loadedCount` die bereits geladene Menge. Der bestehende useFeatures-Hook bleibt für
// Detail/Board-Ansicht und Chip-Counts unberührt.
export function useFeatureLibrary(filter: FeatureListFilter) {
  const list = useProgressiveList(
    queryKeys.features.list(filter as object),
    (page, pageSize) => getFeaturesPage(filter, { page, pageSize })
  );
  return {
    features: list.items,
    total: list.total,
    loadedCount: list.loadedCount,
    loading: list.loading,
    loadingMore: list.loadingMore,
    error: list.error
  };
}

export function useFeatures(featureId?: number) {
  const queryClient = useQueryClient();
  const validFeatureId = featureId !== undefined && Number.isFinite(featureId) ? featureId : undefined;

  const featuresQuery = useQuery({
    queryKey: queryKeys.features.list(),
    queryFn: getFeatures
  });

  const featureQuery = useQuery({
    queryKey: queryKeys.features.detail(validFeatureId ?? 0),
    queryFn: () => getFeature(validFeatureId as number),
    enabled: validFeatureId !== undefined
  });

  const reload = useCallback(async () => {
    await featuresQuery.refetch();
    if (validFeatureId !== undefined) {
      await featureQuery.refetch();
    }
  }, [featureQuery, featuresQuery, validFeatureId]);

  const createFeatureMutation = useMutation({
    mutationFn: createFeatureRequest,
    onSuccess: (created) => {
      void invalidateFeatureScope(queryClient, created.id);
    }
  });

  const updateFeatureMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: FeatureUpdate }) => updateFeatureRequest(id, input),
    onSuccess: (updated) => {
      void invalidateFeatureScope(queryClient, updated.id);
    }
  });

  const removeFeatureMutation = useMutation({
    mutationFn: deleteFeatureRequest,
    onSuccess: (_result, id) => {
      void invalidateFeatureScope(queryClient, id);
    }
  });

  const createFeature = useCallback(
    async (input: FeatureInput) => {
      return createFeatureMutation.mutateAsync(input);
    },
    [createFeatureMutation]
  );

  const updateFeature = useCallback(
    async (id: number, input: FeatureUpdate) => {
      return updateFeatureMutation.mutateAsync({ id, input });
    },
    [updateFeatureMutation]
  );

  const removeFeature = useCallback(
    async (id: number) => {
      await removeFeatureMutation.mutateAsync(id);
    },
    [removeFeatureMutation]
  );

  return {
    // Array-Guard: schützt die Status-Chip-Counts (features.filter(...)) selbst dann, wenn der
    // Cache-Eintrag versehentlich mit einer Nicht-Array-Form belegt würde (siehe useProgressiveList).
    features: Array.isArray(featuresQuery.data) ? featuresQuery.data : [],
    feature: featureQuery.data ?? null,
    loading: featuresQuery.isLoading || featureQuery.isLoading,
    error: toQueryError(featuresQuery.error ?? featureQuery.error),
    reload,
    createFeature,
    updateFeature,
    removeFeature
  };
}
