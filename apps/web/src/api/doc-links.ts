import type { Feature, FeatureRelation, FeatureRelationInput } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getProjectFeatures(projectId: number): Promise<Feature[]> {
  return api.get(`projects/${projectId}/features`).json<Feature[]>();
}

export async function setProjectFeatures(projectId: number, featureIds: number[]): Promise<Feature[]> {
  return api.put(`projects/${projectId}/features`, { json: { featureIds } }).json<Feature[]>();
}

export async function getMilestoneFeatures(milestoneId: number): Promise<Feature[]> {
  return api.get(`milestones/${milestoneId}/features`).json<Feature[]>();
}

export async function setMilestoneFeatures(milestoneId: number, featureIds: number[]): Promise<Feature[]> {
  return api.put(`milestones/${milestoneId}/features`, { json: { featureIds } }).json<Feature[]>();
}

export async function getFeatureRelations(featureId: number): Promise<FeatureRelation[]> {
  return api.get(`features/${featureId}/relations`).json<FeatureRelation[]>();
}

export async function setFeatureRelations(featureId: number, relations: FeatureRelationInput[]): Promise<FeatureRelation[]> {
  return api.put(`features/${featureId}/relations`, { json: { relations } }).json<FeatureRelation[]>();
}

