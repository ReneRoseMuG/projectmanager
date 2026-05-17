import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { CommentEntityType } from "@taskmanager/shared-types";
import type { NoteOwnerType, QueryOwnerType } from "./queryKeys";
import { queryKeys } from "./queryKeys";

async function invalidateMany(queryClient: QueryClient, keys: QueryKey[]): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export async function invalidateProjects(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.projects.root, queryKeys.globalSearch.root]);
}

export async function invalidateProjectScope(queryClient: QueryClient, projectId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.projects.root,
    queryKeys.tasks.root,
    queryKeys.calendarTasks.root,
    queryKeys.globalSearch.root,
    ...(projectId !== undefined ? [queryKeys.projects.detail(projectId)] : [])
  ]);
}

export async function invalidateTaskScope(queryClient: QueryClient, projectId?: number, taskId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.projects.root,
    queryKeys.tasks.root,
    queryKeys.calendarTasks.root,
    queryKeys.globalSearch.root,
    ...(projectId !== undefined ? [queryKeys.projects.tasks(projectId), queryKeys.projects.detail(projectId)] : []),
    ...(taskId !== undefined ? [queryKeys.tasks.detail(taskId)] : [])
  ]);
}

export async function invalidateFeatureScope(queryClient: QueryClient, featureId?: number): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.features.root,
    queryKeys.projects.root,
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
  await invalidateMany(queryClient, [queryKeys.tags.root, queryKeys.projects.root, queryKeys.tasks.root, queryKeys.globalSearch.root]);
}

export async function invalidateWiki(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.wiki.root, queryKeys.globalSearch.root]);
}

export async function invalidateEvents(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [queryKeys.events.root]);
}

export async function invalidateSeedData(queryClient: QueryClient): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.seedRuns.root,
    queryKeys.projects.root,
    queryKeys.tasks.root,
    queryKeys.features.root,
    queryKeys.useCases.root,
    queryKeys.notes.root,
    queryKeys.attachments.root,
    queryKeys.comments.root,
    queryKeys.tags.root,
    queryKeys.wiki.root,
    queryKeys.calendarTasks.root,
    queryKeys.globalSearch.root
  ]);
}
