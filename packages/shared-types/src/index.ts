export const WORK_STATUSES = ["active", "on_hold", "completed", "archived", "todo", "open", "in_progress", "in_review", "done", "resolved", "closed", "rejected"] as const;
export const PROJECT_STATUSES = WORK_STATUSES;
export const TASK_STATUSES = WORK_STATUSES;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const FEATURE_RELATION_TYPES = ["related", "depends_on", "consumed_by"] as const;
export const BACKLOG_STATUSES = WORK_STATUSES;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TICKET_TYPES = ["bug", "improvement", "question", "task"] as const;
export const TICKET_STATUSES = WORK_STATUSES;
export const TICKET_RESOLUTIONS = ["fixed", "wont_fix", "duplicate", "cant_reproduce", "by_design"] as const;
export const TICKET_RELATION_TYPES = ["blocks", "related", "duplicate"] as const;
export const COMMENT_ENTITY_TYPES = ["task", "feature", "project", "milestone", "useCase", "backlogItem", "wikiPage", "ticket"] as const;
export const CATALOG_KINDS = ["workStatus", "featureStatus", "priority"] as const;
export const STATUS_CATALOG_KINDS = ["workStatus", "featureStatus"] as const;

export type WorkStatus = string;
export type ProjectStatus = WorkStatus;
export type TaskStatus = WorkStatus;
export type FeatureStatus = string;
export type FeatureRelationType = (typeof FEATURE_RELATION_TYPES)[number];
export type BacklogStatus = WorkStatus;
export type Priority = string;
export type TicketType = (typeof TICKET_TYPES)[number];
export type TicketStatus = WorkStatus;
export type TicketResolution = (typeof TICKET_RESOLUTIONS)[number];
export type TicketRelationType = (typeof TICKET_RELATION_TYPES)[number];
export type CommentEntityType = (typeof COMMENT_ENTITY_TYPES)[number];
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export type StatusCatalogKind = (typeof STATUS_CATALOG_KINDS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface ApiErrorPayload {
  error: "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
  message: string;
  statusCode: number;
}

export const AUTH_RESOURCES = ["projects", "milestones", "tasks", "features", "useCases", "wiki", "backlog", "tickets", "comments", "notes", "attachments", "events", "catalogs", "tags", "dumps", "ai", "users", "roles"] as const;
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
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogEntryInput {
  key: string;
  label: string;
  sortOrder?: number;
  isClosed?: boolean;
}

export type CatalogEntryUpdate = WithExpectedVersion<Partial<Omit<CatalogEntryInput, "key">>>;

export interface AiModelInfo {
  name: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  digest: string | null;
}

export interface AiModelsResponse {
  provider: "ollama";
  baseUrl: string;
  defaultModel: string;
  available: boolean;
  models: AiModelInfo[];
  message?: string;
}

export const AI_TEXT_OPERATIONS = ["rewrite", "formatParagraph"] as const;
export type AiTextOperation = (typeof AI_TEXT_OPERATIONS)[number];

export interface AiTextAssistRequest {
  model?: string | null;
  html: string;
  operation: AiTextOperation;
  instruction?: string | null;
}

export interface AiTextAssistResponse {
  model: string;
  html: string;
}

export const AI_AGENT_ACTION_TYPES = [
  "createProject",
  "createMilestone",
  "createTask",
  "createSubtask",
  "createTicket",
  "createSubTicket",
  "createFeature",
  "createUseCase",
  "createWikiPage",
  "createBacklogItem",
  "createComment",
  "createNote",
  "createTag",
  "createEvent",
  "setProjectFeatures",
  "setMilestoneFeatures",
  "setFeatureRelations",
  "linkOwnerTask",
  "linkOwnerTicket",
  "addTicketRelation",
  "setProjectTags",
  "setMilestoneTags",
  "setTaskTags",
  "setTicketTags"
] as const;

export type AiAgentActionType = (typeof AI_AGENT_ACTION_TYPES)[number];

export interface AiAgentAction {
  type: AiAgentActionType;
  label: string;
  description: string;
  payload: JsonObject;
  requiresConfirmation: true;
}

export interface AiAgentPlanRequest {
  model?: string | null;
  prompt: string;
}

export interface AiAgentPlanResponse {
  status: "ready" | "blocked";
  model: string;
  message: string;
  actions: AiAgentAction[];
  blockers: string[];
}

export interface AiAgentExecuteRequest {
  actions: AiAgentAction[];
}

export interface AiAgentActionResult {
  type: AiAgentActionType;
  label: string;
  success: boolean;
  entityType: string | null;
  entityId: number | null;
  message: string;
}

export interface AiAgentExecuteResponse {
  message: string;
  results: AiAgentActionResult[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  version: number;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  tags: Tag[];
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export type ProjectUpdate = WithExpectedVersion<Partial<ProjectInput>>;

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  ticketCount: number;
  featureCount: number;
  tags: Tag[];
}

export interface MilestoneInput {
  projectId: number;
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export type MilestoneUpdate = WithExpectedVersion<Partial<MilestoneInput>>;

export interface Task {
  id: number;
  parentId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee: string | null;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  subtaskCount: number;
}

export interface TaskBoardItem extends Task {
  boardPosition: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  assignee?: string | null;
  dueDate?: string | null;
}

export type TaskUpdate = WithExpectedVersion<Partial<TaskInput>>;

export type TaskBoardPositionInput = WithExpectedVersion<{
  status: TaskStatus;
  position: number;
}>;

export interface Ticket {
  id: number;
  parentId: number | null;
  type: TicketType;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: Priority;
  resolution: TicketResolution | null;
  reporter: string | null;
  assignee: string | null;
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
  reporter?: string | null;
  assignee?: string | null;
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

export interface Note {
  id: number;
  title: string;
  contentJson: JsonObject;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title?: string;
  contentJson?: JsonObject;
}

export type NoteUpdate = WithExpectedVersion<NoteInput>;

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
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEvent = Event;

export type EventOwner = { type: "project" | "milestone" | "task"; id: number };

export interface EventInput {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  color?: string | null;
  owners?: EventOwner[];
}

export type EventUpdate = WithExpectedVersion<Partial<EventInput>>;

export interface Feature {
  id: number;
  title: string;
  slug: string;
  status: FeatureStatus;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  useCaseCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureInput {
  title: string;
  slug: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
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
  slug: string;
  status: FeatureStatus;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UseCaseInput {
  featureId?: number;
  title: string;
  slug: string;
  status?: FeatureStatus;
  description?: string | null;
  content?: string;
  sortOrder?: number;
}

export type UseCaseUpdate = WithExpectedVersion<Partial<UseCaseInput>>;

export type DraftTask =
  | { kind: "new"; draft: Pick<TaskInput, "title" | "status" | "priority"> }
  | { kind: "existing"; task: Task };

export type DraftTicket =
  | { kind: "new"; draft: Pick<TicketInput, "title" | "type" | "status" | "priority"> }
  | { kind: "existing"; ticket: Ticket };

export type DraftUseCase = { kind: "new"; draft: Pick<UseCaseInput, "title" | "slug" | "status"> } | { kind: "existing"; useCase: UseCase };

export type DraftSubtask = {
  title: string;
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
  projectId: number | null;
  title: string;
  slug: string;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  childCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WikiBreadcrumb {
  id: number;
  title: string;
  slug: string;
}

export interface WikiPageInput {
  title: string;
  slug: string;
  parentId?: number | null;
  projectId?: number | null;
  content?: string;
  sortOrder?: number;
}

export type WikiPageUpdate = WithExpectedVersion<Partial<WikiPageInput>>;

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
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BacklogItemInput {
  title: string;
  description?: string | null;
  featureId?: number | null;
  useCaseId?: number | null;
  status?: BacklogStatus;
  importKey?: string | null;
  sortOrder?: number;
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
  slug?: string;
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

export type DumpReadiness = "ready" | "warning" | "blocked";
export type DumpImportStatus = "success" | "warning" | "error";
export type DumpDriveConfigSource = "database" | "environment" | "missing";

export interface DumpDriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string | null;
  sizeBytes: number;
}

export interface DumpTableSummary {
  key: string;
  rowCount: number;
  sha256: string;
}

export interface DumpFileRootSummary {
  key: "uploads" | "content";
  fileCount: number;
  totalBytes: number;
  sha256: string;
}

export interface DumpDriveSaveResult {
  dumpId: string;
  filename: string;
  sizeBytes: number;
  driveFile: DumpDriveFile;
}

export interface DumpDrivePreviewResult {
  fileHash: string;
  dumpId: string;
  driveFile: DumpDriveFile;
  targetDatabasePath: string;
  transferReadiness: DumpReadiness;
  blockingIssues: string[];
  warnings: string[];
  confirmationPhrase: string;
  manifestPresent: boolean;
  schemaRevision: string | null;
  expectedTables: DumpTableSummary[];
  expectedFileRoots: DumpFileRootSummary[];
}

export interface DumpDriveApplyRequest {
  fileId: string;
  fileHash: string;
  confirmationPhrase: string;
}

export interface DumpDriveApplyResult {
  dumpId: string;
  driveFile: DumpDriveFile;
  targetBackupPath: string;
  verificationPassed: boolean;
  importStatus: DumpImportStatus;
  tablesRestored: number;
  fileRootsRestored: DumpFileRootSummary[];
  warnings: string[];
  blockingIssues: string[];
}

export interface DumpDriveConfig {
  folderId: string | null;
  folderUrl: string | null;
  source: DumpDriveConfigSource;
  oauthConfigured: boolean;
  ready: boolean;
  updatedAt: string | null;
}

export interface DumpDriveConfigUpdateRequest {
  folderInput: string;
}
