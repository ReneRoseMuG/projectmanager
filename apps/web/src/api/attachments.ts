import type { Attachment, AttachmentLibrarySelection, AttachmentOwner, AttachmentPreviewInfo } from "@taskmanager/shared-types";
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
