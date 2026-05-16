import type { Attachment } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getProjectAttachments(projectId: number): Promise<Attachment[]> {
  return api.get(`projects/${projectId}/attachments`).json<Attachment[]>();
}

export async function getTaskAttachments(taskId: number): Promise<Attachment[]> {
  return api.get(`tasks/${taskId}/attachments`).json<Attachment[]>();
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

export async function deleteAttachment(id: number): Promise<void> {
  await api.delete(`attachments/${id}`).json();
}
