export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const FEATURE_RELATION_TYPES = ["related", "depends_on", "consumed_by"] as const;
export const BACKLOG_STATUSES = ["open", "in_progress", "done", "rejected"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const COMMENT_ENTITY_TYPES = ["task", "feature", "project", "useCase", "backlogItem", "wikiPage"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export type FeatureRelationType = (typeof FEATURE_RELATION_TYPES)[number];
export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type CommentEntityType = (typeof COMMENT_ENTITY_TYPES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface ApiErrorPayload {
  error: "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "INTERNAL_ERROR";
  message: string;
  statusCode: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  startDate: string | null;
  dueDate: string | null;
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

export type ProjectUpdate = Partial<ProjectInput>;

export interface Task {
  id: number;
  projectId: number;
  parentId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee: string | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  subtaskCount: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  assignee?: string | null;
  dueDate?: string | null;
}

export type TaskUpdate = Partial<TaskInput>;

export interface TaskPositionInput {
  status: TaskStatus;
  position: number;
}

export interface Comment {
  id: number;
  taskId: number | null;
  entityType: CommentEntityType;
  entityId: number;
  body: string;
  createdAt: string;
}

export interface CommentInput {
  body: string;
}

export interface Note {
  id: number;
  title: string;
  contentJson: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title?: string;
  contentJson?: JsonObject;
}

export interface Attachment {
  id: number;
  projectId: number | null;
  taskId: number | null;
  featureId: number | null;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  createdAt: string;
}

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
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color: string | null;
  projectId: number | null;
  taskId: number | null;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEvent = Event;

export interface EventInput {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  color?: string | null;
  projectId?: number | null;
  taskId?: number | null;
}

export type EventUpdate = Partial<EventInput>;

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

export type FeatureUpdate = Partial<FeatureInput>;

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

export type UseCaseUpdate = Partial<UseCaseInput>;

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

export type WikiPageUpdate = Partial<WikiPageInput>;

export interface BacklogItem {
  id: number;
  projectId: number;
  featureId: number | null;
  useCaseId: number | null;
  title: string;
  description: string | null;
  status: BacklogStatus;
  priority: Priority;
  importKey: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BacklogItemInput {
  title: string;
  description?: string | null;
  featureId?: number | null;
  useCaseId?: number | null;
  status?: BacklogStatus;
  priority?: Priority;
  importKey?: string | null;
  sortOrder?: number;
}

export type BacklogItemUpdate = Partial<BacklogItemInput>;

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

export type SeedRunScenario = "visual";

export interface SeedRunTableCount {
  tableName: string;
  count: number;
}

export interface SeedRunSummary {
  totalRecords: number;
  tableCounts: SeedRunTableCount[];
}

export interface SeedRun {
  id: string;
  label: string;
  scenario: SeedRunScenario;
  createdAt: string;
  summary: SeedRunSummary;
}

export interface SeedRunCreateRequest {
  label?: string | null;
}

export interface SeedRunDeletePreview {
  seedRun: SeedRun;
  canDelete: boolean;
  blockingIssues: string[];
  tableCounts: SeedRunTableCount[];
}

export interface SeedRunDeleteRequest {
  confirmationId: string;
}

export interface SeedRunDeleteResult {
  seedRunId: string;
  deletedAt: string;
  deletedTables: SeedRunTableCount[];
  deletedFiles: number;
}
