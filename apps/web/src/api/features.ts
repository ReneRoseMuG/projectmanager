import type { Feature, FeatureInput, FeatureUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getFeatures(): Promise<Feature[]> {
  return api.get("features").json<Feature[]>();
}

export async function getFeature(id: number): Promise<Feature> {
  return api.get(`features/${id}`).json<Feature>();
}

export async function createFeature(input: FeatureInput): Promise<Feature> {
  return api.post("features", { json: input }).json<Feature>();
}

export async function updateFeature(id: number, input: FeatureUpdate): Promise<Feature> {
  return api.patch(`features/${id}`, { json: input }).json<Feature>();
}

export async function deleteFeature(id: number): Promise<void> {
  await api.delete(`features/${id}`);
}
