import type { DraftTask, DraftTicket, TaskBoardItem, Ticket } from "@taskmanager/shared-types";

const DRAFT_DATE = "1970-01-01T00:00:00.000Z";

export function draftTaskItem(item: DraftTask, index: number): TaskBoardItem {
  if (item.kind === "existing") {
    return {
      ...item.task,
      boardPosition: "boardPosition" in item.task && typeof item.task.boardPosition === "number" ? item.task.boardPosition : (index + 1) * 1024
    };
  }

  return {
    id: -(index + 1),
    parentId: null,
    title: item.draft.title,
    description: null,
    status: item.draft.status ?? "active",
    priority: item.draft.priority ?? "medium",
    responsibleUserId: null,
    responsibleUser: null,
    dueDate: null,
    version: 1,
    createdAt: DRAFT_DATE,
    updatedAt: DRAFT_DATE,
    tags: [],
    subtaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    boardPosition: (index + 1) * 1024
  };
}

export function draftTicketItem(item: DraftTicket, index: number): Ticket {
  if (item.kind === "existing") {
    return item.ticket;
  }

  return {
    id: -(index + 1),
    parentId: null,
    type: item.draft.type ?? "bug",
    title: item.draft.title,
    description: null,
    status: item.draft.status ?? "open",
    priority: item.draft.priority ?? "medium",
    resolution: null,
    reporterUserId: null,
    reporterUser: null,
    responsibleUserId: null,
    responsibleUser: null,
    environment: null,
    affectedVersion: null,
    dueDate: null,
    resolvedAt: null,
    position: (index + 1) * 1024,
    version: 1,
    createdAt: DRAFT_DATE,
    updatedAt: DRAFT_DATE,
    tags: [],
    subTicketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0
  };
}
