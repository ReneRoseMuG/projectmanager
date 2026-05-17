import type {
  SeedRun,
  SeedRunCreateRequest,
  SeedRunDeletePreview,
  SeedRunDeleteRequest,
  SeedRunDeleteResult
} from "@taskmanager/shared-types";
import { api } from "./client";

export async function getSeedRuns(): Promise<SeedRun[]> {
  return api.get("admin/seed-runs").json<SeedRun[]>();
}

export async function createSeedRun(input: SeedRunCreateRequest): Promise<SeedRun> {
  return api.post("admin/seed-runs", { json: input }).json<SeedRun>();
}

export async function previewSeedRunDelete(id: string): Promise<SeedRunDeletePreview> {
  return api.get(`admin/seed-runs/${id}/delete-preview`).json<SeedRunDeletePreview>();
}

export async function deleteSeedRun(id: string, input: SeedRunDeleteRequest): Promise<SeedRunDeleteResult> {
  return api.delete(`admin/seed-runs/${id}`, { json: input }).json<SeedRunDeleteResult>();
}
