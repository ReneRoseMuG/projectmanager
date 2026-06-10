import type {
  CatalogEntry,
  Comment,
  JournalListResponse,
  Milestone,
  Project,
  Task,
  TaskDetail,
  Ticket,
  TicketDetail,
  TicketRelationEntry
} from "@taskmanager/shared-types";
import type { ProjectManagerApiClient } from "./api-client.js";
import { objectReference, parseReferenceInput } from "./reference-context.js";

export type WorkDossierParentType = "project" | "milestone";

export const DEFAULT_CLOSED_WITHIN_DAYS = 3;

/**
 * Status keys treated as actively in progress while an item is still open.
 * Everything else open is treated as waiting/backlog. The raw status stays on
 * each item so the narrating model is never bound by this bucketing.
 */
const ACTIVE_STATUS_KEYS = new Set(["in_progress", "in_review", "doing"]);

export type WorkDossierBucket = "done" | "inProgress" | "waiting";

export interface WorkDossierComment {
  id: number;
  source: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkDossierRelation {
  from: string;
  to: string;
  relationType: string;
  direction: "outgoing" | "incoming";
  targetTitle: string;
}

export interface WorkDossierItem {
  kind: "task" | "ticket";
  reference: string;
  id: number;
  title: string;
  status: string;
  closed: boolean;
  bucket: WorkDossierBucket;
  priority: string;
  ticketType: string | null;
  responsibleUser: string | null;
  dueDate: string | null;
  updatedAt: string;
  resolvedAt: string | null;
  subItemCount: number;
  commentCount: number;
  comments: WorkDossierComment[];
  relations: WorkDossierRelation[];
}

export interface WorkDossierActivityEntry {
  id: number;
  operation: string;
  objectType: string;
  objectId: number;
  objectLabel: string;
  summary: string;
  actorName: string;
  createdAt: string;
}

export interface WorkDossier {
  generatedAt: string;
  parent: { reference: string; type: WorkDossierParentType; id: number; name: string; status: string };
  window: { closedWithinDays: number; since: string };
  summary: {
    openTaskCount: number;
    openTicketCount: number;
    recentlyClosedTaskCount: number;
    recentlyClosedTicketCount: number;
    doneCount: number;
    inProgressCount: number;
    waitingCount: number;
    commentCount: number;
    relationCount: number;
    activityCount: number;
  };
  sections: {
    done: WorkDossierItem[];
    inProgress: WorkDossierItem[];
    waiting: WorkDossierItem[];
  };
  comments: WorkDossierComment[];
  relations: WorkDossierRelation[];
  activity: WorkDossierActivityEntry[];
  warnings: string[];
}

export interface BuildWorkDossierOptions {
  closedWithinDays?: number;
  now?: Date;
}

function ownerPath(type: WorkDossierParentType, id: number): string {
  return type === "project" ? `projects/${id}` : `milestones/${id}`;
}

/**
 * Start of the calendar-day window: midnight local time of the day that is
 * (days - 1) days before today, so the window spans `days` calendar days
 * inclusive of today.
 */
function windowStart(days: number, now: Date): Date {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  return since;
}

function isWithinWindow(timestamp: string, since: Date): boolean {
  const value = new Date(timestamp);
  return !Number.isNaN(value.getTime()) && value.getTime() >= since.getTime();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readList<T>(client: ProjectManagerApiClient, path: string, warnings: string[]): Promise<T[]> {
  try {
    return await client.get<T[]>(path);
  } catch (error) {
    warnings.push(`${path}: ${errorMessage(error)}`);
    return [];
  }
}

function closedStatusKeys(catalogs: CatalogEntry[]): Set<string> {
  return new Set(catalogs.filter((entry) => entry.kind === "workStatus" && entry.isClosed).map((entry) => entry.key));
}

function mapComments(source: string, comments: Comment[]): WorkDossierComment[] {
  return comments.map((comment) => ({
    id: comment.id,
    source,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  }));
}

function mapRelations(from: string, relations: TicketRelationEntry[]): WorkDossierRelation[] {
  return relations.map((relation) => ({
    from,
    to: objectReference("ticket", relation.ticket.id),
    relationType: relation.relationType,
    direction: relation.direction,
    targetTitle: relation.ticket.title
  }));
}

function byCreatedAt(left: WorkDossierComment, right: WorkDossierComment): number {
  return left.createdAt.localeCompare(right.createdAt);
}

interface ClassifiedItem {
  bucket: WorkDossierBucket;
  closed: boolean;
}

function classify(status: string, closedKeys: Set<string>, updatedAt: string, since: Date): ClassifiedItem | null {
  const closed = closedKeys.has(status);
  if (closed) {
    if (!isWithinWindow(updatedAt, since)) {
      return null;
    }
    return { bucket: "done", closed: true };
  }
  return { bucket: ACTIVE_STATUS_KEYS.has(status) ? "inProgress" : "waiting", closed: false };
}

async function buildTaskItem(
  client: ProjectManagerApiClient,
  task: Task,
  classified: ClassifiedItem,
  comments: WorkDossierComment[],
  warnings: string[]
): Promise<WorkDossierItem> {
  const reference = objectReference("task", task.id);
  let itemComments: WorkDossierComment[] = [];
  if (task.commentCount > 0) {
    try {
      const detail = await client.get<TaskDetail>(`tasks/${task.id}`);
      itemComments = mapComments(reference, detail.comments);
    } catch (error) {
      warnings.push(`tasks/${task.id}: ${errorMessage(error)}`);
    }
  }
  comments.push(...itemComments);
  return {
    kind: "task",
    reference,
    id: task.id,
    title: task.title,
    status: task.status,
    closed: classified.closed,
    bucket: classified.bucket,
    priority: task.priority,
    ticketType: null,
    responsibleUser: task.responsibleUser?.fullName ?? null,
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
    resolvedAt: null,
    subItemCount: task.subtaskCount,
    commentCount: task.commentCount,
    comments: itemComments,
    relations: []
  };
}

async function buildTicketItem(
  client: ProjectManagerApiClient,
  ticket: Ticket,
  classified: ClassifiedItem,
  comments: WorkDossierComment[],
  relations: WorkDossierRelation[],
  warnings: string[]
): Promise<WorkDossierItem> {
  const reference = objectReference("ticket", ticket.id);
  let itemComments: WorkDossierComment[] = [];
  let itemRelations: WorkDossierRelation[] = [];
  try {
    const detail = await client.get<TicketDetail>(`tickets/${ticket.id}`);
    itemComments = mapComments(reference, detail.comments);
    itemRelations = mapRelations(reference, detail.relations);
  } catch (error) {
    warnings.push(`tickets/${ticket.id}: ${errorMessage(error)}`);
  }
  comments.push(...itemComments);
  relations.push(...itemRelations);
  return {
    kind: "ticket",
    reference,
    id: ticket.id,
    title: ticket.title,
    status: ticket.status,
    closed: classified.closed,
    bucket: classified.bucket,
    priority: ticket.priority,
    ticketType: ticket.type,
    responsibleUser: ticket.responsibleUser?.fullName ?? null,
    dueDate: ticket.dueDate,
    updatedAt: ticket.updatedAt,
    resolvedAt: ticket.resolvedAt,
    subItemCount: ticket.subTicketCount,
    commentCount: ticket.commentCount,
    comments: itemComments,
    relations: itemRelations
  };
}

async function loadActivity(
  client: ProjectManagerApiClient,
  since: Date,
  scopeKeys: Set<string>,
  warnings: string[]
): Promise<WorkDossierActivityEntry[]> {
  const params = new URLSearchParams();
  params.set("from", since.toISOString());
  params.set("limit", "100");
  let response: JournalListResponse;
  try {
    response = await client.get<JournalListResponse>(`journal?${params.toString()}`);
  } catch (error) {
    warnings.push(`journal: ${errorMessage(error)}`);
    return [];
  }
  return response.entries
    .filter((entry) => {
      if (scopeKeys.has(`${entry.objectType}:${entry.objectId}`)) {
        return true;
      }
      return entry.contexts.some((context) => scopeKeys.has(`${context.objectType}:${context.objectId}`));
    })
    .map((entry) => ({
      id: entry.id,
      operation: entry.operation,
      objectType: entry.objectType,
      objectId: entry.objectId,
      objectLabel: entry.objectLabel,
      summary: entry.summary,
      actorName: entry.actorName,
      createdAt: entry.createdAt
    }));
}

export async function buildWorkDossier(
  client: ProjectManagerApiClient,
  reference: string,
  options: BuildWorkDossierOptions = {}
): Promise<WorkDossier> {
  const parsed = parseReferenceInput(reference);
  if (parsed.type !== "project" && parsed.type !== "milestone") {
    throw new Error(`Arbeitsbericht erwartet ein Projekt (PROJ-N) oder einen Meilenstein (MS-N), nicht "${reference}"`);
  }
  const parentType: WorkDossierParentType = parsed.type;
  const days = options.closedWithinDays ?? DEFAULT_CLOSED_WITHIN_DAYS;
  const now = options.now ?? new Date();
  const since = windowStart(days, now);
  const warnings: string[] = [];
  const base = ownerPath(parentType, parsed.id);

  const parent = await client.get<Project | Milestone>(base);
  const [catalogs, tasks, tickets, parentComments] = await Promise.all([
    readList<CatalogEntry>(client, "catalogs", warnings),
    readList<Task>(client, `${base}/tasks`, warnings),
    readList<Ticket>(client, `${base}/tickets`, warnings),
    readList<Comment>(client, `${base}/comments`, warnings)
  ]);

  const closedKeys = closedStatusKeys(catalogs);
  const comments: WorkDossierComment[] = mapComments(parsed.reference, parentComments);
  const relations: WorkDossierRelation[] = [];
  const scopeKeys = new Set<string>([`${parentType}:${parsed.id}`]);

  let openTaskCount = 0;
  let openTicketCount = 0;
  let recentlyClosedTaskCount = 0;
  let recentlyClosedTicketCount = 0;
  const items: WorkDossierItem[] = [];

  for (const task of tasks) {
    const classified = classify(task.status, closedKeys, task.updatedAt, since);
    if (!classified) {
      continue;
    }
    if (classified.closed) {
      recentlyClosedTaskCount += 1;
    } else {
      openTaskCount += 1;
    }
    scopeKeys.add(`task:${task.id}`);
    items.push(await buildTaskItem(client, task, classified, comments, warnings));
  }

  for (const ticket of tickets) {
    const classified = classify(ticket.status, closedKeys, ticket.updatedAt, since);
    if (!classified) {
      continue;
    }
    if (classified.closed) {
      recentlyClosedTicketCount += 1;
    } else {
      openTicketCount += 1;
    }
    scopeKeys.add(`ticket:${ticket.id}`);
    items.push(await buildTicketItem(client, ticket, classified, comments, relations, warnings));
  }

  comments.sort(byCreatedAt);
  const activity = await loadActivity(client, since, scopeKeys, warnings);

  const done = items.filter((item) => item.bucket === "done");
  const inProgress = items.filter((item) => item.bucket === "inProgress");
  const waiting = items.filter((item) => item.bucket === "waiting");

  return {
    generatedAt: now.toISOString(),
    parent: { reference: parsed.reference, type: parentType, id: parsed.id, name: parent.name, status: parent.status },
    window: { closedWithinDays: days, since: since.toISOString() },
    summary: {
      openTaskCount,
      openTicketCount,
      recentlyClosedTaskCount,
      recentlyClosedTicketCount,
      doneCount: done.length,
      inProgressCount: inProgress.length,
      waitingCount: waiting.length,
      commentCount: comments.length,
      relationCount: relations.length,
      activityCount: activity.length
    },
    sections: { done, inProgress, waiting },
    comments,
    relations,
    activity,
    warnings
  };
}
