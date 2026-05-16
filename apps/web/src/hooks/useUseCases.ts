import type { UseCase, UseCaseInput, UseCaseUpdate } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createUseCase as createUseCaseRequest,
  deleteUseCase as deleteUseCaseRequest,
  getUseCase,
  getUseCases,
  updateUseCase as updateUseCaseRequest
} from "../api/use-cases";
import { errorMessage } from "./errors";

export function useUseCases(featureId?: number) {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [loading, setLoading] = useState(Boolean(featureId));
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!featureId) {
      setUseCases([]);
      setSelectedUseCase(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setUseCases(await getUseCases(featureId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadUseCase = useCallback(async (id: number) => {
    setDetailLoading(true);
    setError(null);
    try {
      const loaded = await getUseCase(id);
      setSelectedUseCase(loaded);
      return loaded;
    } catch (requestError) {
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const createUseCase = useCallback(
    async (input: UseCaseInput) => {
      if (!featureId) {
        throw new Error("Feature id is required");
      }
      const created = await createUseCaseRequest(featureId, input);
      await load();
      setSelectedUseCase(created);
      return created;
    },
    [featureId, load]
  );

  const updateUseCase = useCallback(
    async (id: number, input: UseCaseUpdate) => {
      const updated = await updateUseCaseRequest(id, input);
      await load();
      setSelectedUseCase(updated);
      return updated;
    },
    [load]
  );

  const removeUseCase = useCallback(
    async (id: number) => {
      await deleteUseCaseRequest(id);
      await load();
      setSelectedUseCase((current) => (current?.id === id ? null : current));
    },
    [load]
  );

  return {
    useCases,
    selectedUseCase,
    loading,
    detailLoading,
    error,
    reload: load,
    loadUseCase,
    createUseCase,
    updateUseCase,
    removeUseCase
  };
}
