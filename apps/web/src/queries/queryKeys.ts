import type { CommentEntityType } from "@taskmanager/shared-types";

export type NoteOwnerType = "project" | "milestone" | "task" | "ticket";
export type QueryOwnerType = "project" | "milestone" | "task" | "feature" | "ticket";
export type TicketOwnerType = "project" | "milestone" | "task" | "feature" | "useCase";

export const queryKeys = {
  projects: {
    root: ["projects"] as const,
    list: () => [...queryKeys.projects.root, "list"] as const,
    detail: (projectId: number) => [...queryKeys.projects.root, "detail", projectId] as const,
    tasks: (projectId: number) => [...queryKeys.projects.detail(projectId), "tasks"] as const,
    tickets: (projectId: number) => [...queryKeys.projects.detail(projectId), "tickets"] as const,
    backlog: (projectId: number) => [...queryKeys.projects.detail(projectId), "backlog"] as const,
    features: (projectId: number) => [...queryKeys.projects.detail(projectId), "features"] as const
  },
  milestones: {
    root: ["milestones"] as const,
    list: () => [...queryKeys.milestones.root, "list"] as const,
    byProject: (projectId: number) => [...queryKeys.projects.detail(projectId), "milestones"] as const,
    detail: (milestoneId: number) => [...queryKeys.milestones.root, "detail", milestoneId] as const,
    tasks: (milestoneId: number) => [...queryKeys.milestones.detail(milestoneId), "tasks"] as const,
    tickets: (milestoneId: number) => [...queryKeys.milestones.detail(milestoneId), "tickets"] as const,
    features: (milestoneId: number) => [...queryKeys.milestones.detail(milestoneId), "features"] as const
  },
  tasks: {
    root: ["tasks"] as const,
    list: () => [...queryKeys.tasks.root, "list"] as const,
    detail: (taskId: number) => [...queryKeys.tasks.root, "detail", taskId] as const,
    tickets: (taskId: number) => [...queryKeys.tasks.detail(taskId), "tickets"] as const,
    features: (taskId: number) => [...queryKeys.tasks.detail(taskId), "features"] as const,
    useCases: (taskId: number) => [...queryKeys.tasks.detail(taskId), "useCases"] as const
  },
  features: {
    root: ["features"] as const,
    list: () => [...queryKeys.features.root, "list"] as const,
    detail: (featureId: number) => [...queryKeys.features.root, "detail", featureId] as const,
    useCases: (featureId: number) => [...queryKeys.features.detail(featureId), "useCases"] as const,
    projects: (featureId: number) => [...queryKeys.features.detail(featureId), "projects"] as const,
    tasks: (featureId: number) => [...queryKeys.features.detail(featureId), "tasks"] as const,
    tickets: (featureId: number) => [...queryKeys.features.detail(featureId), "tickets"] as const
  },
  useCases: {
    root: ["useCases"] as const,
    detail: (useCaseId: number) => [...queryKeys.useCases.root, "detail", useCaseId] as const,
    tasks: (useCaseId: number) => [...queryKeys.useCases.detail(useCaseId), "tasks"] as const,
    tickets: (useCaseId: number) => [...queryKeys.useCases.detail(useCaseId), "tickets"] as const
  },
  comments: {
    root: ["comments"] as const,
    entity: (entityType: CommentEntityType, entityId: number) => [...queryKeys.comments.root, entityType, entityId] as const
  },
  notes: {
    root: ["notes"] as const,
    owner: (ownerType: NoteOwnerType, ownerId: number) => [...queryKeys.notes.root, ownerType, ownerId] as const
  },
  attachments: {
    root: ["attachments"] as const,
    owner: (ownerType: QueryOwnerType, ownerId: number) => [...queryKeys.attachments.root, ownerType, ownerId] as const,
    preview: (attachmentId: number) => [...queryKeys.attachments.root, "preview", attachmentId] as const
  },
  tags: {
    root: ["tags"] as const,
    list: () => [...queryKeys.tags.root, "list"] as const
  },
  wiki: {
    root: ["wiki"] as const,
    tree: () => [...queryKeys.wiki.root, "tree"] as const,
    detail: (pageId: number) => [...queryKeys.wiki.root, "detail", pageId] as const
  },
  events: {
    root: ["events"] as const,
    list: (rangeKey: string) => [...queryKeys.events.root, "list", rangeKey] as const
  },
  calendarTasks: {
    root: ["calendarTasks"] as const,
    list: () => [...queryKeys.calendarTasks.root, "list"] as const
  },
  dumps: {
    root: ["dumps"] as const,
    driveConfig: () => [...queryKeys.dumps.root, "driveConfig"] as const
  },
  tickets: {
    root: ["tickets"] as const,
    list: () => [...queryKeys.tickets.root, "list"] as const,
    detail: (ticketId: number) => [...queryKeys.tickets.root, "detail", ticketId] as const,
    byOwner: (ownerType: TicketOwnerType, ownerId: number) => [...queryKeys.tickets.root, ownerType, ownerId] as const,
    byProject: (projectId: number) => queryKeys.projects.tickets(projectId),
    relations: (ticketId: number) => [...queryKeys.tickets.detail(ticketId), "relations"] as const,
    subTickets: (ticketId: number) => [...queryKeys.tickets.detail(ticketId), "subTickets"] as const
  },
  globalSearch: {
    root: ["globalSearch"] as const,
    data: () => [...queryKeys.globalSearch.root, "data"] as const
  }
};
