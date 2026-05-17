import type { Feature, FeatureRelation, FeatureRelationInput, Task, UseCase } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getProjectFeatures(projectId: number): Promise<Feature[]> {
  return api.get(`projects/${projectId}/features`).json<Feature[]>();
}

export async function setProjectFeatures(projectId: number, featureIds: number[]): Promise<Feature[]> {
  return api.put(`projects/${projectId}/features`, { json: { featureIds } }).json<Feature[]>();
}

export async function getTaskFeatures(taskId: number): Promise<Feature[]> {
  return api.get(`tasks/${taskId}/features`).json<Feature[]>();
}

export async function setTaskFeatures(taskId: number, featureIds: number[]): Promise<Feature[]> {
  return api.put(`tasks/${taskId}/features`, { json: { featureIds } }).json<Feature[]>();
}

export async function getFeatureTasks(featureId: number): Promise<Task[]> {
  return api.get(`features/${featureId}/tasks`).json<Task[]>();
}

export async function setFeatureTasks(featureId: number, taskIds: number[]): Promise<Task[]> {
  return api.put(`features/${featureId}/tasks`, { json: { taskIds } }).json<Task[]>();
}

export async function getFeatureRelations(featureId: number): Promise<FeatureRelation[]> {
  return api.get(`features/${featureId}/relations`).json<FeatureRelation[]>();
}

export async function setFeatureRelations(featureId: number, relations: FeatureRelationInput[]): Promise<FeatureRelation[]> {
  return api.put(`features/${featureId}/relations`, { json: { relations } }).json<FeatureRelation[]>();
}

export async function getTaskUseCases(taskId: number): Promise<UseCase[]> {
  return api.get(`tasks/${taskId}/use-cases`).json<UseCase[]>();
}

export async function setTaskUseCases(taskId: number, useCaseIds: number[]): Promise<UseCase[]> {
  return api.put(`tasks/${taskId}/use-cases`, { json: { useCaseIds } }).json<UseCase[]>();
}

export async function getUseCaseTasks(useCaseId: number): Promise<Task[]> {
  return api.get(`use-cases/${useCaseId}/tasks`).json<Task[]>();
}

export async function setUseCaseTasks(useCaseId: number, taskIds: number[]): Promise<Task[]> {
  return api.put(`use-cases/${useCaseId}/tasks`, { json: { taskIds } }).json<Task[]>();
}
