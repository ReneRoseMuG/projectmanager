import type { Feature, FeatureInput, FeatureUpdate } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createFeature as createFeatureRequest,
  deleteFeature as deleteFeatureRequest,
  getFeature,
  getFeatures,
  updateFeature as updateFeatureRequest
} from "../api/features";
import { errorMessage } from "./errors";

export function useFeatures(featureId?: number) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getFeatures();
      setFeatures(items);
      if (featureId) {
        setFeature(await getFeature(featureId));
      } else {
        setFeature(null);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createFeature = useCallback(
    async (input: FeatureInput) => {
      const created = await createFeatureRequest(input);
      await load();
      return created;
    },
    [load]
  );

  const updateFeature = useCallback(
    async (id: number, input: FeatureUpdate) => {
      const updated = await updateFeatureRequest(id, input);
      await load();
      return updated;
    },
    [load]
  );

  const removeFeature = useCallback(
    async (id: number) => {
      await deleteFeatureRequest(id);
      await load();
    },
    [load]
  );

  return { features, feature, loading, error, reload: load, createFeature, updateFeature, removeFeature };
}
