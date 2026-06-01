import type { UseCase, UseCaseInput, UseCaseUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  createUseCase as createUseCaseRequest,
  deleteUseCase as deleteUseCaseRequest,
  getUseCase,
  getUseCases,
  updateUseCase as updateUseCaseRequest
} from "../api/use-cases";
import { invalidateUseCaseScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useUseCases(featureId?: number) {
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const queryClient = useQueryClient();
  const validFeatureId = featureId !== undefined && Number.isFinite(featureId) ? featureId : undefined;

  const useCasesQuery = useQuery({
    queryKey: queryKeys.features.useCases(validFeatureId ?? 0),
    queryFn: () => getUseCases(validFeatureId as number),
    enabled: validFeatureId !== undefined
  });

  const reload = useCallback(async () => {
    if (validFeatureId !== undefined) {
      await useCasesQuery.refetch();
    }
  }, [useCasesQuery, validFeatureId]);

  const loadUseCase = useCallback(
    async (id: number) => {
      setDetailLoading(true);
      try {
        const cached = queryClient.getQueryData<UseCase>(queryKeys.useCases.detail(id));
        const loaded = cached?.content !== undefined ? cached : await getUseCase(id);
        queryClient.setQueryData(queryKeys.useCases.detail(id), loaded);
        setSelectedUseCase(loaded);
        return loaded;
      } finally {
        setDetailLoading(false);
      }
    },
    [queryClient]
  );

  const createUseCaseMutation = useMutation({
    mutationFn: (input: UseCaseInput) => {
      if (validFeatureId === undefined) {
        throw new Error("Feature id is required");
      }
      return createUseCaseRequest(validFeatureId, input);
    },
    onSuccess: (created) => {
      setSelectedUseCase(created);
      void invalidateUseCaseScope(queryClient, created.featureId, created.id);
    }
  });

  const updateUseCaseMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: UseCaseUpdate }) => updateUseCaseRequest(id, input),
    onSuccess: (updated) => {
      setSelectedUseCase(updated);
      void invalidateUseCaseScope(queryClient, updated.featureId, updated.id);
    }
  });

  const removeUseCaseMutation = useMutation({
    mutationFn: deleteUseCaseRequest,
    onSuccess: (_result, id) => {
      setSelectedUseCase((current) => (current?.id === id ? null : current));
      void invalidateUseCaseScope(queryClient, validFeatureId, id);
    }
  });

  const createUseCase = useCallback(
    async (input: UseCaseInput) => {
      return createUseCaseMutation.mutateAsync(input);
    },
    [createUseCaseMutation]
  );

  const updateUseCase = useCallback(
    async (id: number, input: UseCaseUpdate) => {
      return updateUseCaseMutation.mutateAsync({ id, input });
    },
    [updateUseCaseMutation]
  );

  const removeUseCase = useCallback(
    async (id: number) => {
      await removeUseCaseMutation.mutateAsync(id);
    },
    [removeUseCaseMutation]
  );

  return {
    useCases: useCasesQuery.data ?? [],
    selectedUseCase,
    loading: useCasesQuery.isLoading,
    detailLoading: detailLoading || createUseCaseMutation.isPending || updateUseCaseMutation.isPending,
    error: toQueryError(useCasesQuery.error ?? createUseCaseMutation.error ?? updateUseCaseMutation.error ?? removeUseCaseMutation.error),
    reload,
    loadUseCase,
    createUseCase,
    updateUseCase,
    removeUseCase
  };
}
