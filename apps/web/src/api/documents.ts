import type {
  Attachment,
  AttachmentFolder,
  DocumentDuplicateCheck,
  Paginated
} from "@taskmanager/shared-types";
import { api, apiBaseUrl } from "./client";

export function documentThumbnailUrl(id: number): string {
  return `${apiBaseUrl}/documents/${id}/thumbnail`;
}

export interface DocumentLibraryFilter {
  folder?: number | "unsorted";
  tags?: number[];
  type?: string;
  q?: string;
}

// Optionale Seiten-Pagination. Ist `page` gesetzt, liefert das Backend Paginated<Attachment>;
// ohne `page` weiterhin das nackte Array (Rückwärtskompatibilität).
export interface DocumentLibraryPagination {
  page?: number;
  pageSize?: number;
}

function buildLibraryQuery(filter: DocumentLibraryFilter, pagination?: DocumentLibraryPagination): string {
  const params = new URLSearchParams();
  if (filter.folder !== undefined) {
    params.set("folder", String(filter.folder));
  }
  if ((filter.tags?.length ?? 0) > 0) {
    params.set("tags", [...new Set(filter.tags)].sort((left, right) => left - right).join(","));
  }
  if (filter.type) {
    params.set("type", filter.type);
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
  return queryString ? `documents?${queryString}` : "documents";
}

export async function getDocumentLibrary(filter: DocumentLibraryFilter): Promise<Attachment[]> {
  return api.get(buildLibraryQuery(filter)).json<Attachment[]>();
}

// Paginierter Abruf: liefert Paginated<Attachment> (data + total + page + pageSize).
export async function getDocumentLibraryPage(
  filter: DocumentLibraryFilter,
  pagination: DocumentLibraryPagination
): Promise<Paginated<Attachment>> {
  const page = pagination.page ?? 1;
  return api.get(buildLibraryQuery(filter, { ...pagination, page })).json<Paginated<Attachment>>();
}

export async function getDocument(id: number): Promise<Attachment> {
  return api.get(`documents/${id}`).json<Attachment>();
}

export async function uploadDocument(file: File, folderId?: number): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  const path = folderId !== undefined ? `documents?folder=${folderId}` : "documents";
  return api.post(path, { body: formData }).json<Attachment>();
}

export async function updateDocumentMetadata(
  id: number,
  input: { displayName?: string | null; description?: string | null; expectedVersion: number }
): Promise<Attachment> {
  return api.patch(`documents/${id}`, { json: input }).json<Attachment>();
}

export async function setDocumentTags(id: number, tagIds: number[], expectedVersion: number): Promise<Attachment> {
  return api.put(`documents/${id}/tags`, { json: { tagIds, expectedVersion } }).json<Attachment>();
}

export async function setDocumentFolder(id: number, folderId: number | null, expectedVersion: number): Promise<Attachment> {
  return api.put(`documents/${id}/folder`, { json: { folderId, expectedVersion } }).json<Attachment>();
}

export async function removeDocumentFromLibrary(id: number, expectedVersion: number): Promise<void> {
  await api.delete(`documents/${id}/library?expectedVersion=${expectedVersion}`);
}

export async function deleteDocumentPermanently(id: number, expectedVersion: number): Promise<void> {
  await api.delete(`attachments/${id}?expectedVersion=${expectedVersion}`);
}

export async function getDocumentDuplicateCheck(): Promise<DocumentDuplicateCheck> {
  return api.get("documents/duplicate-check").json<DocumentDuplicateCheck>();
}

export async function startDocumentDuplicateCheck(): Promise<DocumentDuplicateCheck> {
  return api.post("documents/duplicate-check").json<DocumentDuplicateCheck>();
}

// --- Sammlungen ---
export async function getAttachmentFolders(): Promise<AttachmentFolder[]> {
  return api.get("attachment-folders").json<AttachmentFolder[]>();
}

export async function createAttachmentFolder(input: {
  name: string;
  parentId?: number | null;
  projectId?: number | null;
}): Promise<AttachmentFolder> {
  return api.post("attachment-folders", { json: input }).json<AttachmentFolder>();
}

export async function updateAttachmentFolder(
  id: number,
  input: { name?: string; parentId?: number | null; projectId?: number | null; expectedVersion: number }
): Promise<AttachmentFolder> {
  return api.patch(`attachment-folders/${id}`, { json: input }).json<AttachmentFolder>();
}

export async function deleteAttachmentFolder(id: number, expectedVersion: number): Promise<void> {
  await api.delete(`attachment-folders/${id}?expectedVersion=${expectedVersion}`);
}
