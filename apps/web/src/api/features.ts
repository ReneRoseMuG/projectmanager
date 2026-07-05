import type { Feature, FeatureInput, FeatureUpdate, Paginated } from "@taskmanager/shared-types";
import { api } from "./client";

// Serverseitige Filter der Feature-Liste. `status` bildet den Statusfilter, `q` die
// Titel-Suche der Board-Ansicht nach — beide werden serverseitig angewandt.
export interface FeatureListFilter {
  status?: string;
  q?: string;
}

// Optionale Seiten-Pagination. Ist `page` gesetzt, liefert das Backend Paginated<Feature>;
// ohne `page` weiterhin das nackte Array (Rückwärtskompatibilität).
export interface FeatureListPagination {
  page?: number;
  pageSize?: number;
}

function buildFeatureListQuery(filter: FeatureListFilter, pagination?: FeatureListPagination): string {
  const params = new URLSearchParams();
  if (filter.status) {
    params.set("status", filter.status);
  }
  if (filter.q) {
    params.set("q", filter.q);
  }
  if (pagination?.page !== undefined) {
    params.set("page", String(pagination.page));
  }
  if (pagination?.pageSize !== undefined) {
    params.set("pageSize", String(pagination.pageSize));
  }
  const queryString = params.toString();
  return queryString ? `features?${queryString}` : "features";
}

export async function getFeatures(): Promise<Feature[]> {
  return api.get("features").json<Feature[]>();
}

// Paginierter Abruf: liefert Paginated<Feature> (data + total + page + pageSize).
export async function getFeaturesPage(
  filter: FeatureListFilter,
  pagination: FeatureListPagination
): Promise<Paginated<Feature>> {
  const page = pagination.page ?? 1;
  return api.get(buildFeatureListQuery(filter, { ...pagination, page })).json<Paginated<Feature>>();
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
