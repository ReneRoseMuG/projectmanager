import type { Feature, UseCase } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  getProjectFeatures,
  getTaskFeatures,
  getTaskUseCases,
  setProjectFeatures as setProjectFeaturesRequest,
  setTaskFeatures as setTaskFeaturesRequest,
  setTaskUseCases as setTaskUseCasesRequest
} from "../api/doc-links";
import { getUseCases } from "../api/use-cases";
import { errorMessage } from "./errors";

export function useProjectFeatureLinks(projectId?: number) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setFeatures([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setFeatures(await getProjectFeatures(projectId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFeaturesForProject = useCallback(
    async (featureIds: number[]) => {
      if (!projectId) {
        throw new Error("Project id is required");
      }
      const updated = await setProjectFeaturesRequest(projectId, featureIds);
      setFeatures(updated);
      return updated;
    },
    [projectId]
  );

  return { features, loading, error, reload: load, setFeaturesForProject };
}

export function useTaskDocLinks(taskId?: number | null) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [availableUseCases, setAvailableUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [error, setError] = useState<string | null>(null);

  const loadAvailableUseCases = useCallback(async (featureIds: number[]) => {
    if (featureIds.length === 0) {
      setAvailableUseCases([]);
      return [];
    }
    const lists = await Promise.all(featureIds.map((featureId) => getUseCases(featureId)));
    const merged = lists.flat();
    setAvailableUseCases(merged);
    return merged;
  }, []);

  const load = useCallback(async () => {
    if (!taskId) {
      setFeatures([]);
      setUseCases([]);
      setAvailableUseCases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [loadedFeatures, loadedUseCases] = await Promise.all([getTaskFeatures(taskId), getTaskUseCases(taskId)]);
      setFeatures(loadedFeatures);
      setUseCases(loadedUseCases);
      await loadAvailableUseCases(loadedFeatures.map((feature) => feature.id));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [loadAvailableUseCases, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFeaturesForTask = useCallback(
    async (featureIds: number[]) => {
      if (!taskId) {
        throw new Error("Task id is required");
      }
      const updated = await setTaskFeaturesRequest(taskId, featureIds);
      setFeatures(updated);
      const nextUseCases = await loadAvailableUseCases(featureIds);
      const allowedIds = new Set(nextUseCases.map((useCase) => useCase.id));
      const filteredUseCaseIds = useCases.filter((useCase) => allowedIds.has(useCase.id)).map((useCase) => useCase.id);
      const updatedUseCases = await setTaskUseCasesRequest(taskId, filteredUseCaseIds);
      setUseCases(updatedUseCases);
      return updated;
    },
    [loadAvailableUseCases, taskId, useCases]
  );

  const setUseCasesForTask = useCallback(
    async (useCaseIds: number[]) => {
      if (!taskId) {
        throw new Error("Task id is required");
      }
      const updated = await setTaskUseCasesRequest(taskId, useCaseIds);
      setUseCases(updated);
      return updated;
    },
    [taskId]
  );

  return { features, useCases, availableUseCases, loading, error, reload: load, setFeaturesForTask, setUseCasesForTask };
}
