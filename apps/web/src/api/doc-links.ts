import type { Feature, UseCase } from "@taskmanager/shared-types";
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

export async function getTaskUseCases(taskId: number): Promise<UseCase[]> {
  return api.get(`tasks/${taskId}/use-cases`).json<UseCase[]>();
}

export async function setTaskUseCases(taskId: number, useCaseIds: number[]): Promise<UseCase[]> {
  return api.put(`tasks/${taskId}/use-cases`, { json: { useCaseIds } }).json<UseCase[]>();
}
