export const WORK_STATUSES = ["active", "on_hold", "completed", "archived", "todo", "open", "in_progress", "in_review", "done", "resolved", "closed", "rejected"] as const;
export const PROJECT_STATUSES = WORK_STATUSES;
export const TASK_STATUSES = WORK_STATUSES;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const FEATURE_RELATION_TYPES = ["related", "depends_on", "consumed_by"] as const;
export const BACKLOG_STATUSES = WORK_STATUSES;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TICKET_STATUSES = WORK_STATUSES;
export const TICKET_RESOLUTIONS = ["fixed", "wont_fix", "duplicate", "cant_reproduce", "by_design"] as const;
export const TICKET_RELATION_TYPES = ["blocks", "related", "duplicate"] as const;
export const COMMENT_ENTITY_TYPES = ["task", "feature", "project", "milestone", "useCase", "backlogItem", "wikiPage", "dayPlan", "ticket"] as const;
export const CATALOG_KINDS = ["workStatus", "featureStatus", "priority", "ticketType"] as const;
export const STATUS_CATALOG_KINDS = ["workStatus", "featureStatus"] as const;

export type WorkStatus = string;
export type ProjectStatus = WorkStatus;
export type TaskStatus = WorkStatus;
export type FeatureStatus = string;
export type FeatureRelationType = (typeof FEATURE_RELATION_TYPES)[number];
export type BacklogStatus = WorkStatus;
export type Priority = string;
export type TicketType = string;
export type TicketStatus = WorkStatus;
export type TicketResolution = (typeof TICKET_RESOLUTIONS)[number];
export type TicketRelationType = (typeof TICKET_RELATION_TYPES)[number];
export type CommentEntityType = (typeof COMMENT_ENTITY_TYPES)[number];
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export type StatusCatalogKind = (typeof STATUS_CATALOG_KINDS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export const SETTING_SCOPE_TYPES = ["GLOBAL", "ROLE", "USER"] as const;
export const SETTING_VALUE_TYPES = ["boolean", "number", "color", "enum", "string", "json"] as const;
export const TOAST_POSITIONS = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;

export type SettingScopeType = (typeof SETTING_SCOPE_TYPES)[number];
export type SettingValueType = (typeof SETTING_VALUE_TYPES)[number];
export type ToastPosition = (typeof TOAST_POSITIONS)[number];

export interface SettingConstraints {
  options?: readonly string[];
  optionLabels?: Readonly<Record<string, string>>;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "hex";
}

export interface SettingDefinition<Value extends JsonValue = JsonValue> {
  key: string;
  label: string;
  description: string;
  valueType: SettingValueType;
  defaultValue: Value;
  allowedScopes: readonly SettingScopeType[];
  constraints?: SettingConstraints;
  validate: (value: unknown) => value is Value;
}

export type WikiTreeState = {
  [key: string]: JsonValue;
  sidebarCollapsed: boolean;
  collapsedPageIds: number[];
};

function isWikiTreeState(value: unknown): value is WikiTreeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<WikiTreeState>;
  return (
    typeof candidate.sidebarCollapsed === "boolean" &&
    Array.isArray(candidate.collapsedPageIds) &&
    candidate.collapsedPageIds.every((id) => Number.isInteger(id) && id > 0) &&
    new Set(candidate.collapsedPageIds).size === candidate.collapsedPageIds.length
  );
}

export const settingsRegistry = {
  "taskBoard.viewMode": {
    key: "taskBoard.viewMode",
    label: "Aufgaben-Board Ansicht",
    description: "Steuert die Standarddarstellung für Aufgabenlisten.",
    valueType: "enum",
    defaultValue: "list",
    allowedScopes: ["GLOBAL", "USER"],
    constraints: { options: ["list", "kanban"] },
    validate: (value): value is "list" | "kanban" => value === "list" || value === "kanban"
  },
  "ticketBoard.viewMode": {
    key: "ticketBoard.viewMode",
    label: "Ticket-Board Ansicht",
    description: "Steuert die Standarddarstellung für Ticketlisten.",
    valueType: "enum",
    defaultValue: "kanban",
    allowedScopes: ["GLOBAL", "USER"],
    constraints: { options: ["list", "kanban"] },
    validate: (value): value is "list" | "kanban" => value === "list" || value === "kanban"
  },
  "ui.toastPosition": {
    key: "ui.toastPosition",
    label: "Toast-Position",
    description: "Steuert die globale Einblendposition von Toast-Benachrichtigungen.",
    valueType: "enum",
    defaultValue: "top-right",
    allowedScopes: ["GLOBAL"],
    constraints: {
      options: TOAST_POSITIONS,
      optionLabels: {
        "top-right": "Oben rechts",
        "top-left": "Oben links",
        "bottom-right": "Unten rechts",
        "bottom-left": "Unten links"
      }
    },
    validate: (value): value is ToastPosition => typeof value === "string" && (TOAST_POSITIONS as readonly string[]).includes(value)
  },
  "wiki.treeState": {
    key: "wiki.treeState",
    label: "Wiki-Seitenbaum",
    description: "Speichert den benutzerbezogenen Anzeigezustand des Wiki-Seitenbaums.",
    valueType: "json",
    defaultValue: { sidebarCollapsed: false, collapsedPageIds: [] } as WikiTreeState,
    allowedScopes: ["USER"],
    validate: isWikiTreeState
  }
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof settingsRegistry;
export type SettingValueByKey = {
  [Key in SettingKey]: (typeof settingsRegistry)[Key]["defaultValue"];
};

export interface SettingScopeValue {
  value: JsonValue;
  version: number;
  updatedAt: string;
  updatedBy: number | null;
}

export interface ResolvedSetting {
  key: SettingKey;
  label: string;
  description: string;
  valueType: SettingValueType;
  constraints: SettingConstraints | null;
  allowedScopes: readonly SettingScopeType[];
  defaultValue: JsonValue;
  values: Partial<Record<SettingScopeType, SettingScopeValue>>;
  resolvedValue: JsonValue;
  resolvedScope: SettingScopeType | "DEFAULT";
  resolvedVersion: number | null;
}

export interface SettingsResolvedResponse {
  settings: ResolvedSetting[];
}

export interface SetSettingValueRequest {
  key: SettingKey;
  scopeType: SettingScopeType;
  scopeId?: string;
  value: JsonValue;
  expectedVersion: number;
}

export interface DeleteSettingValueRequest {
  key: SettingKey;
  scopeType: SettingScopeType;
  scopeId?: string;
  expectedVersion: number;
}

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(settingsRegistry, value);
}

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return isSettingKey(key) ? settingsRegistry[key] : undefined;
}

export const settingDefinitions = Object.values(settingsRegistry) as SettingDefinition[];

export const DASHBOARD_CONTEXTS = ["global", "project", "milestone", "task", "home", "calendar", "dayPlan", "dayPlanCalendar"] as const;
export const DASHBOARD_OWNER_TYPES = ["project", "milestone", "task", "dayPlan"] as const;
export const DASHBOARD_WIDGET_IDS = [
  "taskStatusReport",
  "ticketStatusReport",
  "taskJournal",
  "ticketJournal",
  "globalJournal",
  "commentJournal",
  "noteList",
  "attachmentJournal",
  "milestoneProgress",
  "overdueTasks",
  "calendar",
  "upcomingEvents",
  "taskBoard",
  "taskList",
  "ticketBoard",
  "ticketList",
  "milestoneBoard",
  "milestoneList",
  "milestoneListView",
  "projectBoard",
  "projectList",
  "projectDiary",
  "diaryOverview"
] as const;

export type DashboardContext = (typeof DASHBOARD_CONTEXTS)[number];
export type DashboardOwnerType = (typeof DASHBOARD_OWNER_TYPES)[number];
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
export type DashboardDefaultScope = "GLOBAL" | "USER";

export interface DashboardOwner {
  type: DashboardOwnerType;
  id: number;
}

export interface DashboardWidgetParams {
  limit?: number;
  sort?: "createdAt" | "updatedAt";
}

export interface DashboardWidgetLayout {
  widgetId: DashboardWidgetId;
  col: 0 | 1;
  row: number;
  colSpan: 1 | 2;
  params?: DashboardWidgetParams;
}

export interface Dashboard {
  id: number;
  name: string;
  context: DashboardContext;
  isSystem: boolean;
  templateKey: string | null;
  ownerId: number | null;
  widgets: DashboardWidgetLayout[];
  version: number;
  createdAt: string;
  updatedAt: string;
  isGlobalDefault: boolean;
  isUserDefault: boolean;
}

export interface DashboardInput {
  name: string;
  context: DashboardContext;
  isSystem?: boolean;
  widgets: DashboardWidgetLayout[];
}

export type DashboardUpdate = WithExpectedVersion<DashboardInput>;

export interface DashboardListResponse {
  dashboards: Dashboard[];
  globalDefaultDashboardId: number | null;
  globalDefaultVersion: number;
  userDefaultDashboardId: number | null;
  userDefaultVersion: number;
}

export interface SetDashboardDefaultRequest {
  scopeType: DashboardDefaultScope;
  expectedVersion: number;
}

export interface TaskStats {
  statusCounts: Record<string, number>;
  total: number;
}

export interface TicketStats {
  statusCounts: Record<string, number>;
  total: number;
}

export interface RecentComment {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  entityType: JournalObjectType;
  entityId: number;
  entityLabel: string;
}

export interface RecentAttachment {
  id: number;
  filename: string;
  storageFilename: string;
  mimetype: string;
  fileSize: number;
  url: string;
  createdAt: string;
  authorName: string;
  entityType: JournalObjectType;
  entityId: number;
  entityLabel: string;
}

export const DASHBOARD_ALLOWED_WIDGETS = {
  global: ["taskStatusReport", "ticketStatusReport", "globalJournal", "taskJournal", "ticketJournal", "commentJournal", "attachmentJournal", "overdueTasks", "calendar", "upcomingEvents", "taskBoard", "taskList", "ticketBoard", "ticketList", "milestoneBoard", "milestoneList", "milestoneListView", "projectBoard", "projectList"],
  project: ["taskStatusReport", "ticketStatusReport", "milestoneProgress", "taskJournal", "ticketJournal", "commentJournal", "attachmentJournal", "globalJournal", "overdueTasks", "calendar", "upcomingEvents", "taskBoard", "taskList", "ticketBoard", "ticketList", "milestoneBoard", "milestoneList", "milestoneListView", "projectDiary"],
  milestone: ["taskStatusReport", "ticketStatusReport", "taskJournal", "ticketJournal", "commentJournal", "attachmentJournal", "taskBoard", "taskList", "ticketBoard", "ticketList"],
  task: ["taskStatusReport", "taskJournal", "commentJournal", "attachmentJournal"],
  home: ["taskStatusReport", "ticketStatusReport", "globalJournal", "taskJournal", "ticketJournal", "commentJournal", "attachmentJournal", "overdueTasks", "calendar", "upcomingEvents", "taskBoard", "taskList", "ticketBoard", "ticketList", "milestoneBoard", "milestoneList", "milestoneListView", "projectBoard", "projectList", "diaryOverview"],
  calendar: ["calendar", "upcomingEvents", "overdueTasks", "taskStatusReport", "ticketStatusReport", "taskJournal", "ticketJournal", "commentJournal", "attachmentJournal", "taskBoard", "taskList", "ticketBoard", "ticketList", "milestoneBoard", "milestoneList", "milestoneListView", "projectBoard", "projectList"],
  dayPlan: ["taskList", "taskBoard", "calendar", "upcomingEvents", "overdueTasks", "commentJournal", "noteList", "globalJournal"],
  dayPlanCalendar: ["calendar", "upcomingEvents"]
} as const satisfies Record<DashboardContext, readonly DashboardWidgetId[]>;

export const DEFAULT_DASHBOARD_LAYOUTS = {
  global: [
    { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 },
    { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 },
    { widgetId: "globalJournal", col: 0, row: 1, colSpan: 2, params: { limit: 20 } },
    { widgetId: "taskJournal", col: 0, row: 2, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "ticketJournal", col: 1, row: 2, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "commentJournal", col: 0, row: 3, colSpan: 1, params: { limit: 10 } },
    { widgetId: "attachmentJournal", col: 1, row: 3, colSpan: 1, params: { limit: 10 } }
  ],
  project: [
    { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 },
    { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 },
    { widgetId: "milestoneProgress", col: 0, row: 1, colSpan: 2, params: { limit: 10 } },
    { widgetId: "taskJournal", col: 0, row: 2, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "ticketJournal", col: 1, row: 2, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "commentJournal", col: 0, row: 3, colSpan: 1, params: { limit: 10 } },
    { widgetId: "attachmentJournal", col: 1, row: 3, colSpan: 1, params: { limit: 10 } },
    { widgetId: "globalJournal", col: 0, row: 4, colSpan: 2, params: { limit: 20 } }
  ],
  milestone: [
    { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 },
    { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 },
    { widgetId: "taskJournal", col: 0, row: 1, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "ticketJournal", col: 1, row: 1, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "commentJournal", col: 0, row: 2, colSpan: 1, params: { limit: 10 } },
    { widgetId: "attachmentJournal", col: 1, row: 2, colSpan: 1, params: { limit: 10 } }
  ],
  task: [
    { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 2 },
    { widgetId: "taskJournal", col: 0, row: 1, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "commentJournal", col: 1, row: 1, colSpan: 1, params: { limit: 10 } },
    { widgetId: "attachmentJournal", col: 0, row: 2, colSpan: 2, params: { limit: 10 } }
  ],
  home: [
    { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 },
    { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 },
    { widgetId: "calendar", col: 0, row: 1, colSpan: 1 },
    { widgetId: "upcomingEvents", col: 1, row: 1, colSpan: 1 }
  ],
  calendar: [
    { widgetId: "calendar", col: 0, row: 0, colSpan: 2 },
    { widgetId: "upcomingEvents", col: 0, row: 1, colSpan: 1 },
    { widgetId: "overdueTasks", col: 1, row: 1, colSpan: 1, params: { limit: 10 } }
  ],
  dayPlan: [
    { widgetId: "taskList", col: 0, row: 0, colSpan: 1, params: { limit: 10, sort: "updatedAt" } },
    { widgetId: "upcomingEvents", col: 1, row: 0, colSpan: 1 },
    { widgetId: "noteList", col: 0, row: 1, colSpan: 1, params: { limit: 10 } },
    { widgetId: "commentJournal", col: 1, row: 1, colSpan: 1, params: { limit: 10 } },
    { widgetId: "globalJournal", col: 0, row: 2, colSpan: 2, params: { limit: 15 } }
  ],
  dayPlanCalendar: [
    { widgetId: "calendar", col: 0, row: 0, colSpan: 2 },
    { widgetId: "upcomingEvents", col: 0, row: 1, colSpan: 1 }
  ]
} as const satisfies Record<DashboardContext, readonly DashboardWidgetLayout[]>;

export interface ApiErrorPayload {
  error: "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
  message: string;
  statusCode: number;
}

export const AUTH_RESOURCES = ["projects", "milestones", "tasks", "features", "useCases", "wiki", "diary", "backlog", "tickets", "comments", "notes", "attachments", "contentImages", "events", "dayPlans", "notifications", "catalogs", "tags", "journal", "dashboards", "settings", "realtime", "users", "roles"] as const;
export const AUTH_ACTIONS = ["read", "write", "delete", "admin"] as const;

export type AuthResource = (typeof AUTH_RESOURCES)[number] | "*";
export type AuthAction = (typeof AUTH_ACTIONS)[number] | "*";

export interface Permission {
  id: number;
  roleId: number;
  resource: AuthResource;
  action: AuthAction;
}

export interface PermissionInput {
  resource: AuthResource;
  action: AuthAction;
}

export interface Role {
  id: number;
  key: string;
  label: string;
  isSystem: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}

export interface RoleInput {
  key: string;
  label: string;
  permissions: PermissionInput[];
}

export type RoleUpdate = WithExpectedVersion<Partial<RoleInput>>;

export interface PermissionCatalog {
  resources: readonly (typeof AUTH_RESOURCES)[number][];
  actions: readonly (typeof AUTH_ACTIONS)[number][];
}

export const REALTIME_INVALIDATION_SCOPES = [
  "all",
  "projects",
  "milestones",
  "tasks",
  "tickets",
  "features",
  "useCases",
  "backlog",
  "wiki",
  "comments",
  "notes",
  "attachments",
  "tags",
  "catalogs",
  "events",
  "dayPlans",
  "dashboards",
  "settings",
  "adminUsers",
  "adminRoles"
] as const;

export type RealtimeInvalidationScope = (typeof REALTIME_INVALIDATION_SCOPES)[number];

export interface RealtimeInvalidationEvent {
  type: "invalidate";
  scope: RealtimeInvalidationScope;
  sourceTabId: string | null;
  occurredAt: string;
}

export type RealtimeEvent = RealtimeInvalidationEvent;

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  address: string | null;
  phone: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserOption {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
}

export type UserSummary = UserOption;

export interface AdminUserInput {
  firstName: string;
  lastName: string;
  address?: string | null;
  phone?: string | null;
  email: string;
  roleId: number;
  password?: string;
  isActive?: boolean;
}

export type AdminUserUpdate = WithExpectedVersion<Partial<Omit<AdminUserInput, "password">> & {
  password?: string;
}>;

export interface CurrentUser {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: Role;
  permissions: Permission[];
  requiresPasswordSetup: boolean;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface SetPasswordRequest {
  password: string;
}

export interface VersionedUpdate {
  expectedVersion: number;
}

export type WithExpectedVersion<T> = T & VersionedUpdate;

export interface CatalogEntry {
  id: number;
  kind: CatalogKind;
  key: string;
  label: string;
  sortOrder: number;
  isClosed: boolean;
  color: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogEntryInput {
  key: string;
  label: string;
  sortOrder?: number;
  isClosed?: boolean;
  color?: string;
}

export type CatalogEntryUpdate = WithExpectedVersion<Partial<Omit<CatalogEntryInput, "key">>>;

export const JOURNAL_OBJECT_TYPES = [
  "project",
  "milestone",
  "task",
  "feature",
  "useCase",
  "wikiPage",
  "backlogItem",
  "ticket",
  "event",
  "dayPlan",
  "tag",
  "note",
  "attachment",
  "comment"
] as const;

export const JOURNAL_OPERATIONS = ["create", "update", "delete", "link", "unlink"] as const;
export const JOURNAL_CONTEXT_RELATIONS = ["self", "owner", "parent", "related"] as const;

export type JournalObjectType = (typeof JOURNAL_OBJECT_TYPES)[number];
export type JournalOperation = (typeof JOURNAL_OPERATIONS)[number];
export type JournalContextRelation = (typeof JOURNAL_CONTEXT_RELATIONS)[number];

export interface JournalChange {
  id: number;
  fieldKey: string;
  fieldLabel: string;
  oldValue: JsonValue;
  oldValueLabel: string | null;
  newValue: JsonValue;
  newValueLabel: string | null;
  summary: string;
}

export interface JournalContext {
  id: number;
  objectType: JournalObjectType;
  objectId: number;
  objectLabel: string;
  relation: JournalContextRelation;
}

export interface JournalEntry {
  id: number;
  operation: JournalOperation;
  objectType: JournalObjectType;
  objectId: number;
  objectLabel: string;
  summary: string;
  actorUserId: number | null;
  actorName: string;
  createdAt: string;
  changes: JournalChange[];
  contexts: JournalContext[];
}

export interface JournalListResponse {
  entries: JournalEntry[];
  nextCursor: number | null;
}

export interface TagUsageCounts {
  projects: number;
  milestones: number;
  tasks: number;
  tickets: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  version: number;
  usageCounts?: TagUsageCounts;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  wikiPageId: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  milestoneCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  ticketCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  tags: Tag[];
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  responsibleUserId?: number | null;
}

export type ProjectUpdate = WithExpectedVersion<Partial<ProjectInput> & { wikiPageId?: number | null }>;

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  ticketCount: number;
  featureCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  tags: Tag[];
  visibleParent?: VisibleParentContext | null;
}

export interface MilestoneInput {
  projectId: number;
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  responsibleUserId?: number | null;
}

export type MilestoneUpdate = WithExpectedVersion<Partial<MilestoneInput>>;

export type VisibleParentType = "project" | "milestone" | "task" | "ticket" | "feature" | "useCase" | "wikiPage" | "dayPlan";

export interface VisibleParentContext {
  type: VisibleParentType;
  id: number;
  label: string;
  origin: "direct" | "inherited";
}

export interface Task {
  id: number;
  parentId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  subtaskCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  visibleParent?: VisibleParentContext | null;
  parentContexts?: VisibleParentContext[];
}

export interface TaskBoardItem extends Task {
  boardPosition: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  responsibleUserId?: number | null;
  dueDate?: string | null;
}

export type TaskUpdate = WithExpectedVersion<Partial<TaskInput>>;

export type TaskBoardPositionInput = WithExpectedVersion<{
  status: TaskStatus;
  position: number;
}>;

export type TaskOwner = { type: "project" | "milestone" | "feature" | "useCase" | "wikiPage"; id: number };

export interface Ticket {
  id: number;
  parentId: number | null;
  type: TicketType;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: Priority;
  resolution: TicketResolution | null;
  reporterUserId: number | null;
  reporterUser: UserSummary | null;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  environment: string | null;
  affectedVersion: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  subTicketCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  visibleParent?: VisibleParentContext | null;
  parentContexts?: VisibleParentContext[];
}

export interface TicketRelationEntry {
  id: number;
  relationType: TicketRelationType;
  ticket: Ticket;
  direction: "outgoing" | "incoming";
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
  notes: Note[];
  attachments: Attachment[];
  relations: TicketRelationEntry[];
  subTickets: Ticket[];
}

export interface TicketInput {
  title: string;
  type?: TicketType;
  description?: string | null;
  status?: TicketStatus;
  priority?: Priority;
  reporterUserId?: number | null;
  responsibleUserId?: number | null;
  environment?: string | null;
  affectedVersion?: string | null;
  dueDate?: string | null;
}

export type TicketUpdate = WithExpectedVersion<Partial<TicketInput> & {
  resolution?: TicketResolution | null;
  resolvedAt?: string | null;
}>;

export type TicketPositionInput = WithExpectedVersion<{
  status: TicketStatus;
  position: number;
}>;

export interface TicketRelationInput {
  targetTicketId: number;
  relationType: TicketRelationType;
}

export type TicketOwner = { type: "project" | "milestone" | "task" | "feature" | "useCase" | "wikiPage"; id: number };

export interface Comment {
  id: number;
  owners: CommentOwner[];
  body: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type CommentOwner = {
  type: CommentEntityType;
  id: number;
};

export interface CommentInput {
  body: string;
}

export type CommentUpdate = WithExpectedVersion<CommentInput>;

export interface Note {
  id: number;
  title: string;
  contentJson: JsonObject;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentContexts?: VisibleParentContext[];
}

export interface NoteInput {
  title?: string;
  contentJson?: JsonObject;
}

export type NoteUpdate = WithExpectedVersion<NoteInput>;

export type ProjectContextTreeNodeType = "project" | "milestone" | "task" | "ticket" | "note";

export interface ProjectContextTreeNode {
  type: ProjectContextTreeNodeType;
  id: number;
  label: string;
  children: ProjectContextTreeNode[];
}

export type MovableOwnerType = "project" | "milestone" | "task" | "ticket";
export type TaskMoveTargetType = "project" | "milestone" | "task";
export type TicketMoveTargetType = "project" | "milestone" | "task" | "ticket";
export type NoteMoveTargetType = "project" | "milestone" | "task" | "ticket";

export type MoveOwner<TType extends string = MovableOwnerType> = {
  type: TType;
  id: number;
};

export type TaskMoveInput = WithExpectedVersion<{
  source: MoveOwner<MovableOwnerType>;
  target: MoveOwner<TaskMoveTargetType>;
}>;

export type TicketMoveInput = WithExpectedVersion<{
  source: MoveOwner<MovableOwnerType>;
  target: MoveOwner<TicketMoveTargetType>;
}>;

export interface NoteMoveInput {
  source: MoveOwner<MovableOwnerType>;
  target: MoveOwner<NoteMoveTargetType>;
}

export interface Attachment {
  id: number;
  owners: AttachmentOwner[];
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type AttachmentOwner =
  | { type: "project"; id: number }
  | { type: "milestone"; id: number }
  | { type: "task"; id: number }
  | { type: "feature"; id: number }
  | { type: "wikiPage"; id: number }
  | { type: "ticket"; id: number };

export type AttachmentPreviewKind = "image" | "pdf" | "text" | "csv" | "audio" | "video" | "generatedPdf" | "unsupported";
export type AttachmentPreviewStatus = "available" | "unsupported" | "failed";

export interface AttachmentTextPreview {
  content: string;
  encoding: "utf-8";
  truncated: boolean;
  bytesRead: number;
}

export interface AttachmentPreviewInfo {
  id: number;
  kind: AttachmentPreviewKind;
  status: AttachmentPreviewStatus;
  label: string;
  previewUrl: string | null;
  text: AttachmentTextPreview | null;
  message: string | null;
  generatedAt: string | null;
}

export interface Event {
  id: number;
  owners: EventOwner[];
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color: string | null;
  reminderMinutes: number;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEvent = Event;

export type EventOwner = { type: "project" | "milestone" | "task" | "dayPlan"; id: number };

export interface EventInput {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  color?: string | null;
  reminderMinutes?: number;
  responsibleUserId?: number | null;
  owners?: EventOwner[];
}

export type EventUpdate = WithExpectedVersion<Partial<EventInput>>;

export const DAY_PLAN_STATUSES = ["open", "completed"] as const;

export type DayPlanStatus = (typeof DAY_PLAN_STATUSES)[number];

export interface DayPlan {
  id: number;
  date: string;
  userId: number;
  status: DayPlanStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  tasks: TaskBoardItem[];
  events: CalendarEvent[];
}

export interface DayPlanPatchInput {
  status?: DayPlanStatus;
}

export type DayPlanUpdate = WithExpectedVersion<DayPlanPatchInput>;

export interface PushSubscriptionKeysInput {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: PushSubscriptionKeysInput;
}

export interface PushSubscriptionStatus {
  subscribed: boolean;
  endpoint: string | null;
}

export interface PushVapidKeyResponse {
  publicKey: string;
  enabled: boolean;
}

export interface Feature {
  id: number;
  title: string;
  status: FeatureStatus;
  description: string | null;
  content?: string;
  sortOrder: number;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  useCaseCount: number;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentContexts?: VisibleParentContext[];
}

export interface FeatureInput {
  title: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  responsibleUserId?: number | null;
}

export type FeatureUpdate = WithExpectedVersion<Partial<FeatureInput>>;

export interface FeatureRelation {
  sourceFeatureId: number;
  targetFeatureId: number;
  relationType: FeatureRelationType;
  description: string | null;
  targetFeature: Feature;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRelationInput {
  targetFeatureId: number;
  relationType?: FeatureRelationType;
  description?: string | null;
}

export interface UseCase {
  id: number;
  featureId: number;
  title: string;
  status: FeatureStatus;
  description: string | null;
  content?: string;
  sortOrder: number;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  attachmentCount: number;
  noteCount: number;
  commentCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentContexts?: VisibleParentContext[];
}

export interface UseCaseInput {
  featureId?: number;
  title: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
  responsibleUserId?: number | null;
}

export type UseCaseUpdate = WithExpectedVersion<Partial<UseCaseInput>>;

export type DraftTask =
  | { kind: "new"; draft: Pick<TaskInput, "title" | "description" | "status" | "priority"> }
  | { kind: "existing"; task: Task };

export type DraftTicket =
  | { kind: "new"; draft: Pick<TicketInput, "title" | "type" | "status" | "priority"> }
  | { kind: "existing"; ticket: Ticket };

export type DraftUseCase = { kind: "new"; draft: Pick<UseCaseInput, "title" | "status"> } | { kind: "existing"; useCase: UseCase };

export type DraftSubtask = {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
};

export type DraftComment = {
  text: string;
};

export type DraftNote = {
  title: string;
  contentJson: JsonObject;
};

export interface WikiPage {
  id: number;
  parentId: number | null;
  title: string;
  content?: string;
  sortOrder: number;
  childCount: number;
  attachmentCount: number;
  taskCount: number;
  ticketCount: number;
  relatedPages: WikiPageRelationSummary[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WikiPageRelationSummary {
  id: number;
  title: string;
  parentId: number | null;
}

export interface WikiBreadcrumb {
  id: number;
  title: string;
}

export interface WikiTreeNode extends WikiPage {
  children: WikiTreeNode[];
}

export interface WikiPageInput {
  title: string;
  parentId?: number | null;
  content?: string;
  sortOrder?: number;
}

export type WikiPageUpdate = WithExpectedVersion<Partial<WikiPageInput>>;

export interface WikiTreeMoveSibling {
  id: number;
  expectedVersion: number;
}

export interface WikiTreeMoveRequest {
  pageId: number;
  parentId: number | null;
  siblings: WikiTreeMoveSibling[];
}

export interface DiaryEntry {
  id: number;
  projectId: number;
  title: string;
  content?: string;
  coveredUntil?: string | null;
  sourceCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntryInput {
  title: string;
  content?: string;
  coveredUntil?: string | null;
  sourceCount?: number;
}

export type DiaryEntryUpdate = WithExpectedVersion<Partial<DiaryEntryInput>>;

export interface BacklogItem {
  id: number;
  projectId: number;
  featureId: number | null;
  useCaseId: number | null;
  title: string;
  description: string | null;
  status: BacklogStatus;
  importKey: string | null;
  sortOrder: number;
  responsibleUserId: number | null;
  responsibleUser: UserSummary | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  parentContexts?: VisibleParentContext[];
}

export interface BacklogItemInput {
  title: string;
  description?: string | null;
  featureId?: number | null;
  useCaseId?: number | null;
  status?: BacklogStatus;
  importKey?: string | null;
  sortOrder?: number;
  responsibleUserId?: number | null;
}

export type BacklogItemUpdate = WithExpectedVersion<Partial<BacklogItemInput>>;

export interface TaskDetail extends Task {
  subtasks: Task[];
  comments: Comment[];
  notes: Note[];
  attachments: Attachment[];
}

export interface WikiImportPreviewRequest {
  sourcePath: string;
}

export type WikiImportRunRequest = WikiImportPreviewRequest;

export type WikiImportItemType = "feature" | "useCase" | "task" | "backlogItem" | "featureRelation" | "projectFeature" | "taskFeature" | "taskUseCase";

export type WikiImportAction = "created" | "updated" | "skipped" | "warning" | "error";

export interface WikiImportSummary {
  created: number;
  updated: number;
  skipped: number;
  warnings: number;
  errors: number;
}

export interface WikiImportItemResult {
  type: WikiImportItemType;
  action: WikiImportAction;
  title: string;
  importKey?: string;
  sourcePath?: string;
  message?: string;
}

export interface WikiImportReport {
  projectId: number;
  sourcePath: string;
  mode: "preview" | "run";
  summary: WikiImportSummary;
  items: WikiImportItemResult[];
}

export interface ContentImageUploadResponse {
  url: string;
}

