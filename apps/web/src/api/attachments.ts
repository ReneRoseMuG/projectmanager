import type {
  Attachment,
  AttachmentLocalEntry,
  AttachmentLocalFileInput,
  AttachmentLocalFolder,
  AttachmentOwner,
  AttachmentPreviewInfo,
  AttachmentVersionInput,
  ParentAttachmentFolder,
  ParentAttachmentFolderInput,
  ParentAttachmentFolderUpdate,
  ParentDocumentLink,
  ParentDocumentLinkInput,
  ParentFileMoveInput,
  Paginated
} from "@taskmanager/shared-types";
import { api } from "./client";

export async function getProjectAttachments(projectId: number): Promise<Attachment[]> {
  return api.get(`projects/${projectId}/attachments`).json<Attachment[]>();
}

export async function getTaskAttachments(taskId: number): Promise<Attachment[]> {
  return api.get(`tasks/${taskId}/attachments`).json<Attachment[]>();
}

export async function getMilestoneAttachments(milestoneId: number): Promise<Attachment[]> {
  return api.get(`milestones/${milestoneId}/attachments`).json<Attachment[]>();
}

export async function getFeatureAttachments(featureId: number): Promise<Attachment[]> {
  return api.get(`features/${featureId}/attachments`).json<Attachment[]>();
}

export async function getWikiPageAttachments(wikiPageId: number): Promise<Attachment[]> {
  return api.get(`wiki/${wikiPageId}/attachments`).json<Attachment[]>();
}

export async function uploadProjectAttachment(projectId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`projects/${projectId}/attachments`, { body: formData }).json<Attachment>();
}

export async function uploadTaskAttachment(taskId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`tasks/${taskId}/attachments`, { body: formData }).json<Attachment>();
}

export async function uploadMilestoneAttachment(milestoneId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`milestones/${milestoneId}/attachments`, { body: formData }).json<Attachment>();
}

export async function uploadFeatureAttachment(featureId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`features/${featureId}/attachments`, { body: formData }).json<Attachment>();
}

export async function uploadWikiPageAttachment(wikiPageId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`wiki/${wikiPageId}/attachments`, { body: formData }).json<Attachment>();
}

function ownerBasePath(owner: AttachmentOwner): string {
  if (owner.type === "wikiPage") {
    return `wiki/${owner.id}`;
  }
  return `${owner.type === "milestone" ? "milestones" : `${owner.type}s`}/${owner.id}`;
}

function ownerAttachmentPath(owner: AttachmentOwner, attachmentId: number): string {
  return `${ownerBasePath(owner)}/attachments/${attachmentId}`;
}

export async function deleteOwnerAttachment(
  owner: AttachmentOwner,
  attachment: Pick<Attachment, "id" | "version">
): Promise<void> {
  await api.delete(`${ownerAttachmentPath(owner, attachment.id)}?expectedVersion=${attachment.version}`);
}

export async function openAttachment(id: number): Promise<void> {
  await api.post(`attachments/${id}/open`);
}

export async function getAttachmentPreview(id: number): Promise<AttachmentPreviewInfo> {
  return api.get(`attachments/${id}/preview`).json<AttachmentPreviewInfo>();
}

function ownerPayload(owner: AttachmentOwner) {
  return { ownerType: owner.type, ownerId: owner.id };
}

export async function bulkDeleteAttachments(
  owner: AttachmentOwner,
  attachments: AttachmentVersionInput[]
): Promise<void> {
  await api.post("attachments/bulk-delete", {
    json: { ...ownerPayload(owner), attachments }
  });
}

export async function getParentAttachmentFolders(owner: AttachmentOwner): Promise<ParentAttachmentFolder[]> {
  return api.get(`${ownerBasePath(owner)}/attachment-folders`).json<ParentAttachmentFolder[]>();
}

export async function createParentAttachmentFolder(owner: AttachmentOwner, input: ParentAttachmentFolderInput): Promise<ParentAttachmentFolder> {
  return api.post(`${ownerBasePath(owner)}/attachment-folders`, { json: input }).json<ParentAttachmentFolder>();
}

export async function updateParentAttachmentFolder(owner: AttachmentOwner, folderId: number, input: ParentAttachmentFolderUpdate): Promise<ParentAttachmentFolder> {
  return api.patch(`${ownerBasePath(owner)}/attachment-folders/${folderId}`, { json: input }).json<ParentAttachmentFolder>();
}

export async function deleteParentAttachmentFolder(owner: AttachmentOwner, folderId: number, expectedVersion: number): Promise<void> {
  await api.delete(`${ownerBasePath(owner)}/attachment-folders/${folderId}?expectedVersion=${expectedVersion}`);
}

export async function moveParentAttachment(owner: AttachmentOwner, attachmentId: number, input: ParentFileMoveInput): Promise<Attachment> {
  return api.patch(`${ownerBasePath(owner)}/attachments/${attachmentId}/folder`, { json: input }).json<Attachment>();
}

export async function getParentDocumentLinks(owner: AttachmentOwner): Promise<ParentDocumentLink[]> {
  return api.get(`${ownerBasePath(owner)}/document-links`).json<ParentDocumentLink[]>();
}

export async function createParentDocumentLink(owner: AttachmentOwner, input: ParentDocumentLinkInput): Promise<ParentDocumentLink> {
  return api.post(`${ownerBasePath(owner)}/document-links`, { json: input }).json<ParentDocumentLink>();
}

export async function moveParentDocumentLink(owner: AttachmentOwner, linkId: number, input: ParentFileMoveInput): Promise<ParentDocumentLink> {
  return api.patch(`${ownerBasePath(owner)}/document-links/${linkId}/folder`, { json: input }).json<ParentDocumentLink>();
}

export async function deleteParentDocumentLink(owner: AttachmentOwner, linkId: number, expectedVersion: number): Promise<void> {
  await api.delete(`${ownerBasePath(owner)}/document-links/${linkId}?expectedVersion=${expectedVersion}`);
}

export async function downloadAttachmentArchive(
  owner: AttachmentOwner,
  attachmentIds: number[],
  localFiles: AttachmentLocalFileInput[]
): Promise<Blob> {
  return api
    .post("attachments/archive", {
      json: { ...ownerPayload(owner), attachmentIds, localFiles }
    })
    .blob();
}

export async function getAttachmentLocalFolders(
  owner: AttachmentOwner
): Promise<AttachmentLocalFolder[]> {
  return api
    .get("attachment-local-folders", {
      searchParams: { ownerType: owner.type, ownerId: String(owner.id) }
    })
    .json<AttachmentLocalFolder[]>();
}

export async function pickAttachmentLocalFolderPath(): Promise<string | null> {
  const response = await api.post("attachment-local-folders/pick");
  if (response.status === 204) {
    return null;
  }
  return (await response.json<{ path: string }>()).path;
}

export async function createAttachmentLocalFolder(
  owner: AttachmentOwner,
  rootPath: string,
  name?: string
): Promise<AttachmentLocalFolder> {
  return api
    .post("attachment-local-folders", {
      json: { ...ownerPayload(owner), rootPath, ...(name ? { name } : {}) }
    })
    .json<AttachmentLocalFolder>();
}

export async function deleteAttachmentLocalFolder(
  folderId: number,
  expectedVersion: number
): Promise<void> {
  await api.delete(
    `attachment-local-folders/${folderId}?expectedVersion=${expectedVersion}`
  );
}

export async function getAttachmentLocalEntries(
  folderId: number,
  relativePath: string,
  page: number,
  pageSize: number
): Promise<Paginated<AttachmentLocalEntry>> {
  return api
    .get(`attachment-local-folders/${folderId}/entries`, {
      searchParams: {
        relativePath,
        page: String(page),
        pageSize: String(pageSize)
      }
    })
    .json<Paginated<AttachmentLocalEntry>>();
}

export async function openAttachmentLocalFile(
  folderId: number,
  relativePath: string
): Promise<void> {
  await api.post(`attachment-local-folders/${folderId}/open`, {
    json: { relativePath }
  });
}
