import type { CommentEntityType, DashboardContext, DashboardWidgetId, DashboardWidgetParams, JournalObjectType, TagDomain } from "@taskmanager/shared-types";

export type NoteOwnerType = "project" | "milestone" | "task" | "ticket" | "dayPlan" | "wikiPage";
export type QueryOwnerType = "project" | "milestone" | "task" | "feature" | "ticket" | "wikiPage";
export type MoveOwnerType = "project" | "milestone" | "task" | "ticket";
export type TaskOwnerType = "project" | "milestone" | "feature" | "useCase" | "wikiPage";
export type TicketOwnerType = "project" | "milestone" | "task" | "feature" | "useCase" | "wikiPage";

export const queryKeys = {
  auth: {
    root: ["auth"] as const,
    me: () => [...queryKeys.auth.root, "me"] as const
  },
  dashboards: {
    root: ["dashboards"] as const,
    list: (context: DashboardContext) => [...queryKeys.dashboards.root, "list", context] as const,
    detail: (dashboardId: number) => [...queryKeys.dashboards.root, "detail", dashboardId] as const,
    widgetData: (widgetId: DashboardWidgetId, ownerKey: string, params: DashboardWidgetParams = {}) =>
      [...queryKeys.dashboards.root, "widgetData", widgetId, ownerKey, params] as const
  },
  adminUsers: {
    root: ["adminUsers"] as const,
    list: () => [...queryKeys.adminUsers.root, "list"] as const,
    detail: (userId: number) => [...queryKeys.adminUsers.root, "detail", userId] as const
  },
  users: {
    root: ["users"] as const,
    list: () => [...queryKeys.users.root, "list"] as const
  },
  adminRoles: {
    root: ["adminRoles"] as const,
    list: () => [...queryKeys.adminRoles.root, "list"] as const,
    detail: (roleId: number) => [...queryKeys.adminRoles.root, "detail", roleId] as const,
    permissionCatalog: () => [...queryKeys.adminRoles.root, "permissionCatalog"] as const
  },
  projects: {
    root: ["projects"] as const,
    list: (filter: object = {}, pagination: object = {}) => [...queryKeys.projects.root, "list", filter, pagination] as const,
    detail: (projectId: number) => [...queryKeys.projects.root, "detail", projectId] as const,
    contextTree: (ownerType: MoveOwnerType, ownerId: number) => [...queryKeys.projects.root, "contextTree", ownerType, ownerId] as const,
    tasks: (projectId: number) => [...queryKeys.projects.detail(projectId), "tasks"] as const,
    tickets: (projectId: number) => [...queryKeys.projects.detail(projectId), "tickets"] as const,
    backlog: (projectId: number, filter: object = {}, pagination: object = {}) => [...queryKeys.projects.detail(projectId), "backlog", filter, pagination] as const,
    features: (projectId: number) => [...queryKeys.projects.detail(projectId), "features"] as const,
    diary: (projectId: number) => [...queryKeys.projects.detail(projectId), "diary"] as const
  },
  diary: {
    root: ["diary"] as const,
    all: () => [...queryKeys.diary.root, "all"] as const
  },
  milestones: {
    root: ["milestones"] as const,
    list: (filter: object = {}, pagination: object = {}) => [...queryKeys.milestones.root, "list", filter, pagination] as const,
    byProject: (projectId: number) => [...queryKeys.projects.detail(projectId), "milestones"] as const,
    detail: (milestoneId: number) => [...queryKeys.milestones.root, "detail", milestoneId] as const,
    tasks: (milestoneId: number) => [...queryKeys.milestones.detail(milestoneId), "tasks"] as const,
    tickets: (milestoneId: number) => [...queryKeys.milestones.detail(milestoneId), "tickets"] as const,
    features: (milestoneId: number) => [...queryKeys.milestones.detail(milestoneId), "features"] as const
  },
  tasks: {
    root: ["tasks"] as const,
    list: (filter: object = {}, pagination: object = {}) => [...queryKeys.tasks.root, "list", filter, pagination] as const,
    detail: (taskId: number) => [...queryKeys.tasks.root, "detail", taskId] as const,
    linkCandidates: (ownerType: TaskOwnerType, ownerId: number) => [...queryKeys.tasks.root, "linkCandidates", ownerType, ownerId] as const,
    tickets: (taskId: number) => [...queryKeys.tasks.detail(taskId), "tickets"] as const,
    features: (taskId: number) => [...queryKeys.tasks.detail(taskId), "features"] as const,
    useCases: (taskId: number) => [...queryKeys.tasks.detail(taskId), "useCases"] as const
  },
  features: {
    root: ["features"] as const,
    list: (filter: object = {}, pagination: object = {}) => [...queryKeys.features.root, "list", filter, pagination] as const,
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
    list: (filter: object = {}, pagination: object = {}) => [...queryKeys.notes.root, "list", filter, pagination] as const,
    detail: (noteId: number) => [...queryKeys.notes.root, "detail", noteId] as const,
    owner: (ownerType: NoteOwnerType, ownerId: number) => [...queryKeys.notes.root, ownerType, ownerId] as const
  },
  attachments: {
    root: ["attachments"] as const,
    owner: (ownerType: QueryOwnerType, ownerId: number) => [...queryKeys.attachments.root, ownerType, ownerId] as const,
    preview: (attachmentId: number) => [...queryKeys.attachments.root, "preview", attachmentId] as const
  },
  tags: {
    root: ["tags"] as const,
    list: (domain?: TagDomain) => domain ? ([...queryKeys.tags.root, "list", domain] as const) : ([...queryKeys.tags.root, "list"] as const)
  },
  catalogs: {
    root: ["catalogs"] as const,
    list: () => [...queryKeys.catalogs.root, "list"] as const
  },
  settings: {
    root: ["settings"] as const,
    resolved: () => [...queryKeys.settings.root, "resolved"] as const
  },
  pushNotifications: {
    root: ["pushNotifications"] as const,
    vapidKey: () => [...queryKeys.pushNotifications.root, "vapidKey"] as const,
    status: () => [...queryKeys.pushNotifications.root, "status"] as const
  },
  wiki: {
    root: ["wiki"] as const,
    tree: () => [...queryKeys.wiki.root, "tree"] as const,
    detail: (pageId: number) => [...queryKeys.wiki.root, "detail", pageId] as const,
    relations: (pageId: number) => [...queryKeys.wiki.detail(pageId), "relations"] as const,
    tasks: (pageId: number) => [...queryKeys.wiki.detail(pageId), "tasks"] as const,
    tickets: (pageId: number) => [...queryKeys.wiki.detail(pageId), "tickets"] as const
  },
  documents: {
    root: ["documents"] as const,
    library: (filter: object = {}, pagination: object = {}) => [...queryKeys.documents.root, "library", filter, pagination] as const,
    detail: (id: number) => [...queryKeys.documents.root, "detail", id] as const,
    categories: () => [...queryKeys.documents.root, "categories"] as const,
    folders: () => [...queryKeys.documents.root, "folders"] as const
  },
  events: {
    root: ["events"] as const,
    list: (rangeKey: string) => [...queryKeys.events.root, "list", rangeKey] as const
  },
  dayPlans: {
    root: ["dayPlans"] as const,
    detail: (date: string) => [...queryKeys.dayPlans.root, "detail", date] as const,
    tasks: () => [...queryKeys.dayPlans.root, "tasks"] as const,
    events: () => [...queryKeys.dayPlans.root, "events"] as const
  },
  journal: {
    root: ["journal"] as const,
    list: (filters: object = {}) => [...queryKeys.journal.root, "list", filters] as const,
    object: (objectType: JournalObjectType, objectId: number, filters: object = {}) => [...queryKeys.journal.root, "object", objectType, objectId, filters] as const
  },
  calendarTasks: {
    root: ["calendarTasks"] as const,
    list: () => [...queryKeys.calendarTasks.root, "list"] as const
  },
  tickets: {
    root: ["tickets"] as const,
    list: (filter: object = {}, pagination: object = {}) => [...queryKeys.tickets.root, "list", filter, pagination] as const,
    detail: (ticketId: number) => [...queryKeys.tickets.root, "detail", ticketId] as const,
    byOwner: (ownerType: TicketOwnerType, ownerId: number) => [...queryKeys.tickets.root, ownerType, ownerId] as const,
    linkCandidates: (ownerType: TicketOwnerType, ownerId: number) => [...queryKeys.tickets.root, "linkCandidates", ownerType, ownerId] as const,
    byProject: (projectId: number) => queryKeys.projects.tickets(projectId),
    relations: (ticketId: number) => [...queryKeys.tickets.detail(ticketId), "relations"] as const,
    relationCandidates: (ticketId: number) => [...queryKeys.tickets.detail(ticketId), "relationCandidates"] as const,
    subTickets: (ticketId: number) => [...queryKeys.tickets.detail(ticketId), "subTickets"] as const
  },
  globalSearch: {
    root: ["globalSearch"] as const,
    data: () => [...queryKeys.globalSearch.root, "data"] as const
  }
};
