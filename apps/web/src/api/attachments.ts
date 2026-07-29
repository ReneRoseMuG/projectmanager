import type {
  Attachment,
  AttachmentLibrarySelection,
  AttachmentLocalEntry,
  AttachmentLocalFileInput,
  AttachmentLocalFolder,
  AttachmentOwner,
  AttachmentPreviewInfo,
  AttachmentVersionInput,
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

export async function uploadProjectAttachment(projectId: number, file: File, librarySelection: AttachmentLibrarySelection): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`projects/${projectId}/attachments?libraryVisibility=${librarySelection}`, { body: formData }).json<Attachment>();
}

export async function uploadTaskAttachment(taskId: number, file: File, librarySelection: AttachmentLibrarySelection): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`tasks/${taskId}/attachments?libraryVisibility=${librarySelection}`, { body: formData }).json<Attachment>();
}

export async function uploadMilestoneAttachment(milestoneId: number, file: File, librarySelection: AttachmentLibrarySelection): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`milestones/${milestoneId}/attachments?libraryVisibility=${librarySelection}`, { body: formData }).json<Attachment>();
}

export async function uploadFeatureAttachment(featureId: number, file: File, librarySelection: AttachmentLibrarySelection): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`features/${featureId}/attachments?libraryVisibility=${librarySelection}`, { body: formData }).json<Attachment>();
}

export async function uploadWikiPageAttachment(wikiPageId: number, file: File, librarySelection: AttachmentLibrarySelection): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`wiki/${wikiPageId}/attachments?libraryVisibility=${librarySelection}`, { body: formData }).json<Attachment>();
}

function ownerAttachmentPath(owner: AttachmentOwner, attachmentId: number): string {
  if (owner.type === "wikiPage") {
    return `wiki/${owner.id}/attachments/${attachmentId}`;
  }
  return `${owner.type === "milestone" ? "milestones" : `${owner.type}s`}/${owner.id}/attachments/${attachmentId}`;
}

export async function unlinkOwnerAttachment(
  owner: AttachmentOwner,
  attachment: Pick<Attachment, "id" | "version">,
  orphanAction?: "add-to-library"
): Promise<void> {
  const searchParams = new URLSearchParams({ expectedVersion: String(attachment.version) });
  if (orphanAction) {
    searchParams.set("orphanAction", orphanAction);
  }
  await api.delete(`${ownerAttachmentPath(owner, attachment.id)}?${searchParams.toString()}`);
}

export async function deleteAttachmentPermanently(attachment: Pick<Attachment, "id" | "version">): Promise<void> {
  await api.delete(`attachments/${attachment.id}?expectedVersion=${attachment.version}`);
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

export async function bulkUnlinkAttachments(
  owner: AttachmentOwner,
  attachments: AttachmentVersionInput[]
): Promise<void> {
  await api.post("attachments/bulk-unlink", {
    json: { ...ownerPayload(owner), attachments }
  });
}

export async function bulkDeleteAttachments(
  owner: AttachmentOwner,
  attachments: AttachmentVersionInput[]
): Promise<void> {
  await api.post("attachments/bulk-delete", {
    json: { ...ownerPayload(owner), attachments }
  });
}

export async function bulkSetAttachmentFolder(
  owner: AttachmentOwner,
  attachments: AttachmentVersionInput[],
  folderId: number | null
): Promise<void> {
  await api.post("attachments/bulk-folder", {
    json: { ...ownerPayload(owner), attachments, folderId }
  });
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
