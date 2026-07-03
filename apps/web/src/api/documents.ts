import type { Attachment, AttachmentCategory, AttachmentFolder } from "@taskmanager/shared-types";
import { api } from "./client";

export interface DocumentLibraryFilter {
  folder?: number | "unsorted";
  category?: number;
  tag?: number;
  type?: string;
  q?: string;
}

function buildLibraryQuery(filter: DocumentLibraryFilter): string {
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
  const queryString = params.toString();
  return queryString ? `documents?${queryString}` : "documents";
}

export async function getDocumentLibrary(filter: DocumentLibraryFilter): Promise<Attachment[]> {
  return api.get(buildLibraryQuery(filter)).json<Attachment[]>();
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

export async function addDocumentToFolder(folderId: number, attachmentId: number): Promise<void> {
  await api.post(`attachment-folders/${folderId}/documents/${attachmentId}`);
}

export async function removeDocumentFromFolder(folderId: number, attachmentId: number): Promise<void> {
  await api.delete(`attachment-folders/${folderId}/documents/${attachmentId}`);
}
