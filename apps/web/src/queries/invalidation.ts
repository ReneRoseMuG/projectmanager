import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { CommentEntityType } from "@taskmanager/shared-types";
import type { NoteOwnerType, QueryOwnerType, TicketOwnerType } from "./queryKeys";
import { queryKeys } from "./queryKeys";

async function invalidateMany(queryClient: QueryClient, keys: QueryKey[]): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export async function invalidateProjects(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.projects.root, queryKeys.globalSearch.root]);
}

export async function invalidateAuth(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.auth.root]);
}

export async function invalidateAdminUsers(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.adminUsers.root, queryKeys.auth.root]);
}

export async function invalidateAdminRoles(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.adminRoles.root, queryKeys.adminUsers.root, queryKeys.auth.root]);
}

export async function invalidateMilestones(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.milestones.root, queryKeys.projects.root, queryKeys.globalSearch.root]);
}

export async function invalidateProjectScope(queryClient: QueryClient, projectId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.projects.root,
    queryKeys.milestones.root,
    queryKeys.tasks.root,
    queryKeys.tickets.root,
    queryKeys.calendarTasks.root,
    queryKeys.events.root,
    queryKeys.globalSearch.root,
    ...(projectId !== undefined ? [queryKeys.projects.detail(projectId)] : [])
  ]);
}

export async function invalidateMilestoneScope(queryClient: QueryClient, milestoneId?: number, projectId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.milestones.root,
    queryKeys.projects.root,
    queryKeys.tasks.root,
    queryKeys.tickets.root,
    queryKeys.features.root,
    queryKeys.calendarTasks.root,
    queryKeys.events.root,
    queryKeys.globalSearch.root,
    ...(milestoneId !== undefined ? [queryKeys.milestones.detail(milestoneId)] : []),
    ...(projectId !== undefined ? [queryKeys.projects.detail(projectId), queryKeys.milestones.byProject(projectId)] : [])
  ]);
}

export async function invalidateTaskScope(queryClient: QueryClient, taskId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.projects.root,
    queryKeys.milestones.root,
    queryKeys.tasks.root,
    queryKeys.calendarTasks.root,
    queryKeys.events.root,
    queryKeys.globalSearch.root,
    ...(taskId !== undefined ? [queryKeys.tasks.detail(taskId)] : [])
  ]);
}

export async function invalidateFeatureScope(queryClient: QueryClient, featureId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.features.root,
    queryKeys.projects.root,
    queryKeys.milestones.root,
    queryKeys.tasks.root,
    queryKeys.globalSearch.root,
    ...(featureId !== undefined ? [queryKeys.features.detail(featureId)] : [])
  ]);
}

export async function invalidateUseCaseScope(queryClient: QueryClient, featureId?: number, useCaseId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.useCases.root,
    queryKeys.features.root,
    queryKeys.tasks.root,
    queryKeys.globalSearch.root,
    ...(featureId !== undefined ? [queryKeys.features.useCases(featureId), queryKeys.features.detail(featureId)] : []),
    ...(useCaseId !== undefined ? [queryKeys.useCases.detail(useCaseId)] : [])
  ]);
}

export async function invalidateBacklogScope(queryClient: QueryClient, projectId: number): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.projects.backlog(projectId), queryKeys.projects.detail(projectId), queryKeys.globalSearch.root]);
}

export interface TicketOwnerScope {
  type: TicketOwnerType;
  id: number;
}

function ticketOwnerKeys(owner: TicketOwnerScope): QueryKey[] {
  if (owner.type === "project") {
    return [queryKeys.projects.detail(owner.id), queryKeys.projects.tickets(owner.id), queryKeys.tickets.byOwner(owner.type, owner.id)];
  }
  if (owner.type === "milestone") {
    return [queryKeys.milestones.detail(owner.id), queryKeys.milestones.tickets(owner.id), queryKeys.tickets.byOwner(owner.type, owner.id)];
  }
  if (owner.type === "task") {
    return [queryKeys.tasks.detail(owner.id), queryKeys.tasks.tickets(owner.id), queryKeys.tickets.byOwner(owner.type, owner.id)];
  }
  if (owner.type === "feature") {
    return [queryKeys.features.detail(owner.id), queryKeys.features.tickets(owner.id), queryKeys.tickets.byOwner(owner.type, owner.id)];
  }
  return [queryKeys.useCases.detail(owner.id), queryKeys.useCases.tickets(owner.id), queryKeys.tickets.byOwner(owner.type, owner.id)];
}

export async function invalidateTicketScope(queryClient: QueryClient, owner?: TicketOwnerScope, ticketId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.tickets.root,
    queryKeys.projects.root,
    queryKeys.milestones.root,
    queryKeys.tasks.root,
    queryKeys.features.root,
    queryKeys.useCases.root,
    queryKeys.globalSearch.root,
    ...(owner !== undefined ? ticketOwnerKeys(owner) : []),
    ...(ticketId !== undefined ? [queryKeys.tickets.detail(ticketId), queryKeys.tickets.relations(ticketId), queryKeys.tickets.subTickets(ticketId)] : [])
  ]);
}

export async function invalidateComments(queryClient: QueryClient, entityType: CommentEntityType, entityId: number): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.comments.entity(entityType, entityId), queryKeys.globalSearch.root]);
}

export async function invalidateNotes(queryClient: QueryClient, ownerType: NoteOwnerType, ownerId: number): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.notes.owner(ownerType, ownerId), queryKeys.globalSearch.root]);
}

export async function invalidateAttachments(queryClient: QueryClient, ownerType: QueryOwnerType, ownerId: number): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.attachments.owner(ownerType, ownerId), queryKeys.globalSearch.root]);
}

export async function invalidateTags(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.tags.root, queryKeys.projects.root, queryKeys.milestones.root, queryKeys.tasks.root, queryKeys.tickets.root, queryKeys.globalSearch.root]);
}

export async function invalidateCatalogs(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.catalogs.root,
    queryKeys.projects.root,
    queryKeys.milestones.root,
    queryKeys.tasks.root,
    queryKeys.features.root,
    queryKeys.useCases.root,
    queryKeys.tickets.root,
    queryKeys.globalSearch.root
  ]);
}

export async function invalidateWiki(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.wiki.root, queryKeys.globalSearch.root]);
}

export async function invalidateEvents(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.events.root]);
}

export async function invalidateWikiImportData(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.projects.root,
    queryKeys.milestones.root,
    queryKeys.tasks.root,
    queryKeys.features.root,
    queryKeys.useCases.root,
    queryKeys.notes.root,
    queryKeys.attachments.root,
    queryKeys.comments.root,
    queryKeys.tags.root,
    queryKeys.catalogs.root,
    queryKeys.wiki.root,
    queryKeys.calendarTasks.root,
    queryKeys.tickets.root,
    queryKeys.auth.root,
    queryKeys.adminUsers.root,
    queryKeys.adminRoles.root,
    queryKeys.globalSearch.root
  ]);
}

export async function invalidateAiAgentScopes(queryClient: QueryClient): Promise<void> {
  await invalidateWikiImportData(queryClient);
}
