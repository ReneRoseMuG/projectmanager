import type { WikiImportPreviewRequest, WikiImportReport, WikiImportRunRequest } from "@taskmanager/shared-types";
import { api } from "./client";

export async function previewWikiImport(projectId: number, input: WikiImportPreviewRequest): Promise<WikiImportReport> {
  return api.post(`projects/${projectId}/import/wiki/preview`, { json: input }).json<WikiImportReport>();
}

export async function runWikiImport(projectId: number, input: WikiImportRunRequest): Promise<WikiImportReport> {
  return api.post(`projects/${projectId}/import/wiki/run`, { json: input }).json<WikiImportReport>();
}
