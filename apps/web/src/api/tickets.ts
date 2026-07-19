import type {
  Attachment,
  AttachmentLibrarySelection,
  Note,
  NoteInput,
  Paginated,
  Tag,
  Ticket,
  TicketDetail,
  TicketInput,
  TicketMoveInput,
  TicketOwner,
  TicketPositionInput,
  TicketRelationEntry,
  TicketRelationInput,
  TicketUpdate
} from "@taskmanager/shared-types";
import { api } from "./client";

export type { TicketOwner };

// Serverseitige Filter/Suche der Ticket-Hauptliste (Status, Typ, Suchtext). Bildet ab,
// was die Hauptseite bisher clientseitig filtert/sucht.
export interface TicketListFilter {
  status?: string;
  type?: string;
  q?: string;
}

// Optionale Seiten-Pagination. Ist `page` gesetzt, liefert das Backend Paginated<Ticket>;
// ohne `page` weiterhin das nackte Array (Rückwärtskompatibilität für MCP/interne Aufrufer).
export interface TicketListPagination {
  page?: number;
  pageSize?: number;
}

function buildTicketsQuery(filter: TicketListFilter, pagination?: TicketListPagination): Record<string, string | number> {
  const searchParams: Record<string, string | number> = {};
  if (filter.status) {
    searchParams.status = filter.status;
  }
  if (filter.type) {
    searchParams.type = filter.type;
  }
  if (filter.q) {
    searchParams.q = filter.q;
  }
  if (pagination?.page !== undefined) {
    searchParams.page = pagination.page;
  }
  if (pagination?.pageSize !== undefined) {
    searchParams.pageSize = pagination.pageSize;
  }
  return searchParams;
}

function ownerPath(owner: TicketOwner): string {
  if (owner.type === "project") {
    return `projects/${owner.id}`;
  }
  if (owner.type === "milestone") {
    return `milestones/${owner.id}`;
  }
  if (owner.type === "task") {
    return `tasks/${owner.id}`;
  }
  if (owner.type === "feature") {
    return `features/${owner.id}`;
  }
  if (owner.type === "wikiPage") {
    return `wiki/${owner.id}`;
  }
  return `use-cases/${owner.id}`;
}

export async function getTickets(): Promise<Ticket[]> {
  return api.get("tickets").json<Ticket[]>();
}

// Paginierter Abruf der Ticket-Hauptliste: liefert Paginated<Ticket> (data + total + page
// + pageSize). Filter/Suche werden serverseitig angewandt.
export async function getTicketsPage(filter: TicketListFilter, pagination: TicketListPagination): Promise<Paginated<Ticket>> {
  const page = pagination.page ?? 1;
  return api.get("tickets", { searchParams: buildTicketsQuery(filter, { ...pagination, page }) }).json<Paginated<Ticket>>();
}

export async function getTicketLinkCandidates(owner: TicketOwner | null, contextOwner?: TicketOwner | null): Promise<Ticket[]> {
  const searchParams: Record<string, string | number> = {};
  if (owner) {
    searchParams.ownerType = owner.type;
    searchParams.ownerId = owner.id;
  }
  if (contextOwner) {
    searchParams.contextOwnerType = contextOwner.type;
    searchParams.contextOwnerId = contextOwner.id;
  }
  return api.get("tickets/link-candidates", { searchParams }).json<Ticket[]>();
}

export async function getOwnerTickets(owner: TicketOwner): Promise<Ticket[]> {
  return api.get(`${ownerPath(owner)}/tickets`).json<Ticket[]>();
}

export async function getProjectTickets(projectId: number): Promise<Ticket[]> {
  return getOwnerTickets({ type: "project", id: projectId });
}

export async function getTicket(id: number): Promise<TicketDetail> {
  return api.get(`tickets/${id}`).json<TicketDetail>();
}

export async function createTicket(input: TicketInput): Promise<Ticket> {
  return api.post("tickets", { json: input }).json<Ticket>();
}

export async function createOwnerTicket(owner: TicketOwner, input: TicketInput): Promise<Ticket> {
  if (owner.type === "wikiPage") {
    throw new Error("Wiki pages can only link existing tickets");
  }
  return api.post(`${ownerPath(owner)}/tickets`, { json: input }).json<Ticket>();
}

export async function linkOwnerTicket(owner: TicketOwner, ticketId: number): Promise<Ticket> {
  if (owner.type === "wikiPage") {
    return api.post(`${ownerPath(owner)}/tickets`, { json: { ticketId } }).json<Ticket>();
  }
  return api.post(`${ownerPath(owner)}/tickets/${ticketId}`).json<Ticket>();
}

export async function unlinkOwnerTicket(owner: TicketOwner, ticketId: number): Promise<void> {
  await api.delete(`${ownerPath(owner)}/tickets/${ticketId}`);
}

export async function updateTicket(id: number, input: TicketUpdate): Promise<Ticket> {
  return api.patch(`tickets/${id}`, { json: input }).json<Ticket>();
}

export async function moveTicketLocation(id: number, input: TicketMoveInput): Promise<Ticket> {
  return api.patch(`tickets/${id}/location`, { json: input }).json<Ticket>();
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

export async function getTicketRelationCandidates(id: number): Promise<Ticket[]> {
  return api.get(`tickets/${id}/relation-candidates`).json<Ticket[]>();
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

export async function uploadTicketAttachment(ticketId: number, file: File, librarySelection: AttachmentLibrarySelection): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`tickets/${ticketId}/attachments?libraryVisibility=${librarySelection}`, { body: formData }).json<Attachment>();
}
