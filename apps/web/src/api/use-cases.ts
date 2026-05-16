import type { UseCase, UseCaseInput, UseCaseUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getUseCases(featureId: number): Promise<UseCase[]> {
  return api.get(`features/${featureId}/use-cases`).json<UseCase[]>();
}

export async function getUseCase(id: number): Promise<UseCase> {
  return api.get(`use-cases/${id}`).json<UseCase>();
}

export async function createUseCase(featureId: number, input: UseCaseInput): Promise<UseCase> {
  return api.post(`features/${featureId}/use-cases`, { json: input }).json<UseCase>();
}

export async function updateUseCase(id: number, input: UseCaseUpdate): Promise<UseCase> {
  return api.patch(`use-cases/${id}`, { json: input }).json<UseCase>();
}

export async function deleteUseCase(id: number): Promise<void> {
  await api.delete(`use-cases/${id}`);
}
