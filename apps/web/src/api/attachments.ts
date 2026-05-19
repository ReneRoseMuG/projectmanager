import type { Attachment, AttachmentPreviewInfo } from "@taskmanager/shared-types";
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

export async function deleteAttachment(id: number): Promise<void> {
  await api.delete(`attachments/${id}`).json();
}

export async function getAttachmentPreview(id: number): Promise<AttachmentPreviewInfo> {
  return api.get(`attachments/${id}/preview`).json<AttachmentPreviewInfo>();
}
