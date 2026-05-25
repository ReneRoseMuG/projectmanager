import type {
  Dashboard,
  DashboardContext,
  DashboardDefaultScope,
  DashboardInput,
  DashboardListResponse,
  DashboardOwner,
  DashboardUpdate,
  DashboardWidgetId,
  DashboardWidgetParams,
  JournalListResponse,
  Milestone,
  Project,
  RecentAttachment,
  RecentComment,
  Task,
  TaskStats,
  Ticket,
  TicketStats,
} from "@taskmanager/shared-types";
import { api } from "./client";
import { getJournalEntries, getObjectJournalEntries } from "./journal";
import { getMilestones, getProjectMilestones } from "./milestones";
import { getProjects } from "./projects";

export type DashboardWidgetData =
  | TaskStats
  | TicketStats
  | Task[]
  | Ticket[]
  | Milestone[]
  | Project[]
  | RecentComment[]
  | RecentAttachment[]
  | JournalListResponse;

function ownerSearchParams(owner?: DashboardOwner): Record<string, string | number> {
  if (!owner) {
    return {};
  }
  return {
    ownerType: owner.type,
    ownerId: owner.id,
  };
}

function widgetSearchParams(owner?: DashboardOwner, params: DashboardWidgetParams = {}): Record<string, string | number> {
  return {
    ...ownerSearchParams(owner),
    ...(params.limit !== undefined ? { limit: params.limit } : {}),
    ...(params.sort !== undefined ? { sort: params.sort } : {}),
  };
}

function ticketOwnerSearchParams(owner?: DashboardOwner): Record<string, string | number> {
  if (!owner || owner.type === "task") {
    return {};
  }
  return ownerSearchParams(owner);
}

export async function listDashboards(context: DashboardContext): Promise<DashboardListResponse> {
  return api.get("dashboards", { searchParams: { context } }).json<DashboardListResponse>();
}

export async function getDashboard(id: number): Promise<Dashboard> {
  return api.get(`dashboards/${id}`).json<Dashboard>();
}

export async function createDashboard(input: DashboardInput): Promise<Dashboard> {
  return api.post("dashboards", { json: input }).json<Dashboard>();
}

export async function updateDashboard(id: number, input: DashboardUpdate): Promise<Dashboard> {
  return api.put(`dashboards/${id}`, { json: input }).json<Dashboard>();
}

export async function deleteDashboard(id: number): Promise<void> {
  await api.delete(`dashboards/${id}`).json();
}

export async function setDashboardDefault(id: number, scopeType: DashboardDefaultScope, expectedVersion: number): Promise<DashboardListResponse> {
  return api.post(`dashboards/${id}/default`, { json: { scopeType, expectedVersion } }).json<DashboardListResponse>();
}

export async function getDashboardTaskStats(owner?: DashboardOwner): Promise<TaskStats> {
  return api.get("tasks/stats", { searchParams: ownerSearchParams(owner) }).json<TaskStats>();
}

export async function getDashboardRecentTasks(owner?: DashboardOwner, params: DashboardWidgetParams = {}): Promise<Task[]> {
  return api.get("tasks/recent", { searchParams: widgetSearchParams(owner, params) }).json<Task[]>();
}

export async function getDashboardOverdueTasks(owner?: DashboardOwner, limit?: number): Promise<Task[]> {
  const searchParams = {
    ...(owner && owner.type !== "task" ? ownerSearchParams(owner) : {}),
    ...(limit !== undefined ? { limit } : {}),
  };
  return api.get("tasks/overdue", { searchParams }).json<Task[]>();
}

export async function getDashboardTicketStats(owner?: DashboardOwner): Promise<TicketStats> {
  return api.get("tickets/stats", { searchParams: ticketOwnerSearchParams(owner) }).json<TicketStats>();
}

export async function getDashboardRecentTickets(owner?: DashboardOwner, params: DashboardWidgetParams = {}): Promise<Ticket[]> {
  return api.get("tickets/recent", { searchParams: widgetSearchParams(owner?.type === "task" ? undefined : owner, params) }).json<Ticket[]>();
}

export async function getDashboardMilestones(owner?: DashboardOwner, limit = 10): Promise<Milestone[]> {
  if (!owner || owner.type !== "project") {
    return [];
  }
  const milestones = await api.get(`projects/${owner.id}/milestones`).json<Milestone[]>();
  return milestones.slice(0, limit);
}

export async function getDashboardMilestoneList(owner?: DashboardOwner, params: DashboardWidgetParams = {}): Promise<Milestone[]> {
  const limit = params.limit ?? 10;
  if (owner?.type === "project") {
    return (await getProjectMilestones(owner.id)).slice(0, limit);
  }
  if (owner) {
    return [];
  }
  return (await getMilestones()).slice(0, limit);
}

export async function getDashboardProjects(limit = 10): Promise<Project[]> {
  const projects = await getProjects();
  return projects.slice(0, limit);
}

export async function getDashboardRecentComments(owner?: DashboardOwner, limit = 10): Promise<RecentComment[]> {
  return api.get("comments/recent", { searchParams: widgetSearchParams(owner, { limit }) }).json<RecentComment[]>();
}

export async function getDashboardRecentAttachments(owner?: DashboardOwner, limit = 10): Promise<RecentAttachment[]> {
  return api.get("attachments/recent", { searchParams: widgetSearchParams(owner, { limit }) }).json<RecentAttachment[]>();
}

export async function getDashboardJournal(owner?: DashboardOwner, limit = 20): Promise<JournalListResponse> {
  if (!owner) {
    return getJournalEntries({ limit });
  }
  return getObjectJournalEntries(owner.type, owner.id, { limit });
}

export async function getDashboardWidgetData(widgetId: DashboardWidgetId, owner?: DashboardOwner, params: DashboardWidgetParams = {}): Promise<DashboardWidgetData> {
  if (widgetId === "taskStatusReport") {
    return getDashboardTaskStats(owner);
  }
  if (widgetId === "ticketStatusReport") {
    return getDashboardTicketStats(owner);
  }
  if (widgetId === "taskJournal") {
    return getDashboardRecentTasks(owner, params);
  }
  if (widgetId === "ticketJournal") {
    return getDashboardRecentTickets(owner, params);
  }
  if (widgetId === "globalJournal") {
    return getDashboardJournal(owner, params.limit ?? 20);
  }
  if (widgetId === "commentJournal") {
    return getDashboardRecentComments(owner, params.limit ?? 10);
  }
  if (widgetId === "attachmentJournal") {
    return getDashboardRecentAttachments(owner, params.limit ?? 10);
  }
  if (widgetId === "milestoneProgress") {
    return getDashboardMilestones(owner, params.limit ?? 10);
  }
  if (widgetId === "taskBoard" || widgetId === "taskList") {
    return getDashboardRecentTasks(owner, params);
  }
  if (widgetId === "ticketBoard" || widgetId === "ticketList") {
    return getDashboardRecentTickets(owner, params);
  }
  if (widgetId === "milestoneBoard" || widgetId === "milestoneList") {
    return getDashboardMilestones(owner, params.limit ?? 10);
  }
  if (widgetId === "milestoneListView") {
    return getDashboardMilestoneList(owner, params);
  }
  if (widgetId === "projectBoard" || widgetId === "projectList") {
    return getDashboardProjects(params.limit ?? 10);
  }
  return getDashboardOverdueTasks(owner, params.limit);
}
