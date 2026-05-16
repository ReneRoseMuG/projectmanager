export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const BACKLOG_STATUSES = ["open", "in_progress", "done", "rejected"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

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
  taskId: number;
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
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  createdAt: string;
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
  sortOrder?: number;
}

export type BacklogItemUpdate = Partial<BacklogItemInput>;

export interface TaskDetail extends Task {
  subtasks: Task[];
  comments: Comment[];
  notes: Note[];
  attachments: Attachment[];
}
