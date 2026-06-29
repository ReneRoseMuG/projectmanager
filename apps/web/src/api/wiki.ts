import type { WikiBreadcrumb, WikiPage, WikiPageInput, WikiPageRelationSummary, WikiPageUpdate, WikiTreeMoveRequest } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getRootWikiPages(): Promise<WikiPage[]> {
  return api.get("wiki").json<WikiPage[]>();
}

export async function getWikiChildren(id: number): Promise<WikiPage[]> {
  return api.get(`wiki/${id}/children`).json<WikiPage[]>();
}

export async function getWikiBreadcrumb(id: number): Promise<WikiBreadcrumb[]> {
  return api.get(`wiki/${id}/breadcrumb`).json<WikiBreadcrumb[]>();
}

export async function getWikiPage(id: number): Promise<WikiPage> {
  return api.get(`wiki/${id}`).json<WikiPage>();
}

export async function createWikiPage(input: WikiPageInput): Promise<WikiPage> {
  return api.post("wiki", { json: input }).json<WikiPage>();
}

export async function updateWikiPage(id: number, input: WikiPageUpdate): Promise<WikiPage> {
  return api.patch(`wiki/${id}`, { json: input }).json<WikiPage>();
}

export async function moveWikiPage(input: WikiTreeMoveRequest): Promise<WikiPage> {
  return api.post("wiki/tree/move", { json: input }).json<WikiPage>();
}

export async function getWikiPageRelations(id: number): Promise<WikiPageRelationSummary[]> {
  return api.get(`wiki/${id}/relations`).json<WikiPageRelationSummary[]>();
}

export async function addWikiPageRelation(id: number, targetWikiPageId: number): Promise<WikiPageRelationSummary[]> {
  return api.post(`wiki/${id}/relations`, { json: { targetWikiPageId } }).json<WikiPageRelationSummary[]>();
}

export async function removeWikiPageRelation(id: number, targetWikiPageId: number): Promise<void> {
  await api.delete(`wiki/${id}/relations/${targetWikiPageId}`);
}

export async function deleteWikiPage(id: number): Promise<void> {
  await api.delete(`wiki/${id}`);
}

export async function exportWiki(exportPath: string): Promise<{ filesWritten: number; exportPath: string }> {
  return api.post("wiki/export", { json: { exportPath } }).json();
}
