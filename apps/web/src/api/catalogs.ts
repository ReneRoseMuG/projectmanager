import type { CatalogEntry, CatalogEntryInput, CatalogEntryUpdate, CatalogKind } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getCatalogEntries(): Promise<CatalogEntry[]> {
  return api.get("catalogs").json<CatalogEntry[]>();
}

export async function createCatalogEntry(kind: CatalogKind, input: CatalogEntryInput): Promise<CatalogEntry> {
  return api.post(`catalogs/${kind}`, { json: input }).json<CatalogEntry>();
}

export async function updateCatalogEntry(kind: CatalogKind, id: number, input: CatalogEntryUpdate): Promise<CatalogEntry> {
  return api.patch(`catalogs/${kind}/${id}`, { json: input }).json<CatalogEntry>();
}

export async function deleteCatalogEntry(kind: CatalogKind, id: number): Promise<void> {
  await api.delete(`catalogs/${kind}/${id}`).json();
}
