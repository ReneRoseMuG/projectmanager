import type { Attachment, AttachmentCategory, AttachmentCategoryOrderInput, AttachmentFolder, AttachmentFolderOrderInput, Paginated } from "@taskmanager/shared-types";
import { api, apiBaseUrl } from "./client";

// Quelle für das Kachel-Vorschaubild. Wird direkt als `<img src>` benutzt: Der Browser schickt die
// Session-Cookie mit (SameSite=lax greift auch bei abweichendem Port), und `loading="lazy"` sorgt
// dafür, dass nur sichtbare Kacheln eine Erzeugung anstoßen. Fehlt ein Bild, antwortet die Route 404
// und die Kachel behält ihr Typ-Icon.
export function documentThumbnailUrl(id: number): string {
  return `${apiBaseUrl}/documents/${id}/thumbnail`;
}

export interface DocumentLibraryFilter {
  folder?: number | "unsorted";
  category?: number;
  tag?: number;
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
  if (filter.category !== undefined) {
    params.set("category", String(filter.category));
  }
  if (filter.tag !== undefined) {
    params.set("tag", String(filter.tag));
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

export async function downloadDocument(id: number): Promise<Blob> {
  return api.get(`documents/${id}/download`, { timeout: 120000 }).blob();
}

// `folderId` und `categoryId` sind der Ablage-Kontext der Dokumente-Seite: Die Datei wird direkt in
// die geöffnete Sammlung bzw. unter die gewählte Kategorie einsortiert. Beide optional, symmetrisch.
export async function uploadDocument(
  file: File,
  folderId?: number,
  categoryId?: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (folderId !== undefined) {
    params.set("folder", String(folderId));
  }
  if (categoryId !== undefined) {
    params.set("category", String(categoryId));
  }
  const queryString = params.toString();
  const path = queryString ? `documents?${queryString}` : "documents";
  return api.post(path, { body: formData }).json<Attachment>();
}

export async function updateDocumentMetadata(
  id: number,
  input: { displayName?: string | null; description?: string | null; expectedVersion: number }
): Promise<Attachment> {
  return api.patch(`documents/${id}`, { json: input }).json<Attachment>();
}

export async function setDocumentTags(id: number, tagIds: number[]): Promise<Attachment> {
  return api.put(`documents/${id}/tags`, { json: { tagIds } }).json<Attachment>();
}

export async function moveDocument(id: number, fromFolderId: number, toFolderId: number): Promise<void> {
  await api.post(`documents/${id}/move`, { json: { fromFolderId, toFolderId } });
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`documents/${id}`);
}

export async function assignDocumentCategory(id: number, categoryId: number): Promise<void> {
  await api.post(`documents/${id}/categories/${categoryId}`);
}

export async function removeDocumentCategory(id: number, categoryId: number): Promise<void> {
  await api.delete(`documents/${id}/categories/${categoryId}`);
}

// --- Kategorien ---
export async function getAttachmentCategories(): Promise<AttachmentCategory[]> {
  return api.get("attachment-categories").json<AttachmentCategory[]>();
}

export async function createAttachmentCategory(input: { name: string; color?: string }): Promise<AttachmentCategory> {
  return api.post("attachment-categories", { json: input }).json<AttachmentCategory>();
}

export async function updateAttachmentCategory(
  id: number,
  input: { name?: string; color?: string; expectedVersion: number }
): Promise<AttachmentCategory> {
  return api.patch(`attachment-categories/${id}`, { json: input }).json<AttachmentCategory>();
}

export async function deleteAttachmentCategory(id: number): Promise<void> {
  await api.delete(`attachment-categories/${id}`);
}

export async function reorderAttachmentCategories(input: AttachmentCategoryOrderInput): Promise<AttachmentCategory[]> {
  return api.put("attachment-categories/order", { json: input }).json<AttachmentCategory[]>();
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

export async function deleteAttachmentFolder(id: number, recursive?: boolean): Promise<void> {
  await api.delete(recursive ? `attachment-folders/${id}?recursive=true` : `attachment-folders/${id}`);
}

export async function reorderAttachmentFolders(input: AttachmentFolderOrderInput): Promise<AttachmentFolder[]> {
  return api.put("attachment-folders/order", { json: input }).json<AttachmentFolder[]>();
}

export async function addDocumentToFolder(folderId: number, attachmentId: number): Promise<void> {
  await api.post(`attachment-folders/${folderId}/documents/${attachmentId}`);
}

export async function removeDocumentFromFolder(folderId: number, attachmentId: number): Promise<void> {
  await api.delete(`attachment-folders/${folderId}/documents/${attachmentId}`);
}

// --- Mehrfachauswahl (Bulk) ---
export async function addDocumentsToFolder(folderId: number, attachmentIds: number[]): Promise<void> {
  await api.post(`documents/bulk/folders/${folderId}`, { json: { attachmentIds } });
}

export async function assignDocumentsCategory(categoryId: number, attachmentIds: number[]): Promise<void> {
  await api.post(`documents/bulk/categories/${categoryId}`, { json: { attachmentIds } });
}

// Bulk-Download: das Backend bündelt die Dokumente zu einem Zip. Höherer Timeout, weil das
// Packen mehrerer/großer Dateien länger dauern kann als der Standard-Request.
export async function downloadDocumentsZip(attachmentIds: number[]): Promise<Blob> {
  return api.post("documents/download", { json: { attachmentIds }, timeout: 120000 }).blob();
}
