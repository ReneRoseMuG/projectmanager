import type {
  Attachment,
  Note,
  NoteInput,
  Tag,
  Ticket,
  TicketDetail,
  TicketInput,
  TicketPositionInput,
  TicketRelationEntry,
  TicketRelationInput,
  TicketUpdate
} from "@taskmanager/shared-types";
import { api } from "./client";

export async function getTickets(): Promise<Ticket[]> {
  return api.get("tickets").json<Ticket[]>();
}

export async function getProjectTickets(projectId: number): Promise<Ticket[]> {
  return api.get(`projects/${projectId}/tickets`).json<Ticket[]>();
}

export async function getTicket(id: number): Promise<TicketDetail> {
  return api.get(`tickets/${id}`).json<TicketDetail>();
}

export async function createTicket(projectId: number, input: TicketInput): Promise<Ticket> {
  return api.post(`projects/${projectId}/tickets`, { json: input }).json<Ticket>();
}

export async function updateTicket(id: number, input: TicketUpdate): Promise<Ticket> {
  return api.patch(`tickets/${id}`, { json: input }).json<Ticket>();
}

export async function updateTicketPosition(id: number, input: TicketPositionInput): Promise<Ticket> {
  return api.patch(`tickets/${id}/position`, { json: input }).json<Ticket>();
}

export async function deleteTicket(id: number): Promise<void> {
  await api.delete(`tickets/${id}`);
}

export async function getSubTickets(parentId: number): Promise<Ticket[]> {
  return api.get(`tickets/${parentId}/sub-tickets`).json<Ticket[]>();
}

export async function createSubTicket(parentId: number, input: TicketInput): Promise<Ticket> {
  return api.post(`tickets/${parentId}/sub-tickets`, { json: input }).json<Ticket>();
}

export async function getTicketRelations(id: number): Promise<TicketRelationEntry[]> {
  return api.get(`tickets/${id}/relations`).json<TicketRelationEntry[]>();
}

export async function addTicketRelation(id: number, input: TicketRelationInput): Promise<void> {
  await api.post(`tickets/${id}/relations`, { json: input });
}

export async function removeTicketRelation(id: number, input: TicketRelationInput): Promise<void> {
  await api.delete(`tickets/${id}/relations`, { json: input });
}

export async function setTicketTags(id: number, tagIds: number[]): Promise<Tag[]> {
  return api.put(`tickets/${id}/tags`, { json: { tagIds } }).json<Tag[]>();
}

export async function getTicketNotes(ticketId: number): Promise<Note[]> {
  return api.get(`tickets/${ticketId}/notes`).json<Note[]>();
}

export async function createTicketNote(ticketId: number, input: NoteInput): Promise<Note> {
  return api.post(`tickets/${ticketId}/notes`, { json: input }).json<Note>();
}

export async function getTicketAttachments(ticketId: number): Promise<Attachment[]> {
  return api.get(`tickets/${ticketId}/attachments`).json<Attachment[]>();
}

export async function uploadTicketAttachment(ticketId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`tickets/${ticketId}/attachments`, { body: formData }).json<Attachment>();
}
