import type { FeatureInput, FeatureUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createFeature as createFeatureRequest,
  deleteFeature as deleteFeatureRequest,
  getFeature,
  getFeatures,
  updateFeature as updateFeatureRequest
} from "../api/features";
import { invalidateFeatureScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

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
    features: featuresQuery.data ?? [],
    feature: featureQuery.data ?? null,
    loading: featuresQuery.isLoading || featureQuery.isLoading,
    error: toQueryError(featuresQuery.error ?? featureQuery.error),
    reload,
    createFeature,
    updateFeature,
    removeFeature
  };
}
