import type { TaskOwner, TicketOwner } from "@taskmanager/shared-types";
import { eq, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import {
  featureTasks,
  featureTickets,
  milestoneFeatures,
  milestoneTasks,
  milestoneTickets,
  milestones,
  projectFeatures,
  projectTasks,
  projectTickets,
  taskTickets,
  tasks,
  ticketRelations,
  tickets,
  useCases,
  useCaseTasks,
  useCaseTickets
} from "../db/schema.js";
import { badRequest } from "../utils/errors.js";

export type ProjectContext = Set<number>;

function addProjectId(context: ProjectContext, projectId: number | null | undefined): void {
  if (typeof projectId === "number" && Number.isFinite(projectId)) {
    context.add(projectId);
  }
}

function mergeProjectContext(target: ProjectContext, source: ProjectContext): void {
  for (const projectId of source) {
    target.add(projectId);
  }
}

function collectFeatureProjectIds(database: DbClient, featureId: number, context: ProjectContext): void {
  const directProjectRows = database.select({ projectId: projectFeatures.projectId }).from(projectFeatures).where(eq(projectFeatures.featureId, featureId)).all();
  for (const row of directProjectRows) {
    addProjectId(context, row.projectId);
  }

  const milestoneProjectRows = database
    .select({ projectId: milestones.projectId })
    .from(milestoneFeatures)
    .innerJoin(milestones, eq(milestoneFeatures.milestoneId, milestones.id))
    .where(eq(milestoneFeatures.featureId, featureId))
    .all();
  for (const row of milestoneProjectRows) {
    addProjectId(context, row.projectId);
  }
}

function collectUseCaseProjectIds(database: DbClient, useCaseId: number, context: ProjectContext): void {
  const useCase = database.select({ featureId: useCases.featureId }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (useCase) {
    collectFeatureProjectIds(database, useCase.featureId, context);
  }
}

export function taskOwnerProjectContext(database: DbClient, owner: TaskOwner): ProjectContext {
  const context = new Set<number>();

  if (owner.type === "project") {
    addProjectId(context, owner.id);
    return context;
  }

  if (owner.type === "milestone") {
    const milestone = database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)).get();
    addProjectId(context, milestone?.projectId);
    return context;
  }

  if (owner.type === "feature") {
    collectFeatureProjectIds(database, owner.id, context);
    return context;
  }

  collectUseCaseProjectIds(database, owner.id, context);
  return context;
}

export function taskProjectContext(database: DbClient, taskId: number, visitedTasks = new Set<number>()): ProjectContext {
  const context = new Set<number>();
  if (visitedTasks.has(taskId)) {
    return context;
  }
  visitedTasks.add(taskId);

  const task = database.select({ parentId: tasks.parentId }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return context;
  }

  if (task.parentId !== null) {
    mergeProjectContext(context, taskProjectContext(database, task.parentId, visitedTasks));
  }

  const projectRows = database.select({ projectId: projectTasks.ownerId }).from(projectTasks).where(eq(projectTasks.taskId, taskId)).all();
  for (const row of projectRows) {
    addProjectId(context, row.projectId);
  }

  const milestoneRows = database
    .select({ projectId: milestones.projectId })
    .from(milestoneTasks)
    .innerJoin(milestones, eq(milestoneTasks.ownerId, milestones.id))
    .where(eq(milestoneTasks.taskId, taskId))
    .all();
  for (const row of milestoneRows) {
    addProjectId(context, row.projectId);
  }

  const featureRows = database.select({ featureId: featureTasks.ownerId }).from(featureTasks).where(eq(featureTasks.taskId, taskId)).all();
  for (const row of featureRows) {
    collectFeatureProjectIds(database, row.featureId, context);
  }

  const useCaseRows = database.select({ useCaseId: useCaseTasks.ownerId }).from(useCaseTasks).where(eq(useCaseTasks.taskId, taskId)).all();
  for (const row of useCaseRows) {
    collectUseCaseProjectIds(database, row.useCaseId, context);
  }

  return context;
}

export function ticketOwnerProjectContext(database: DbClient, owner: TicketOwner): ProjectContext {
  const context = new Set<number>();

  if (owner.type === "project") {
    addProjectId(context, owner.id);
    return context;
  }

  if (owner.type === "milestone") {
    const milestone = database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)).get();
    addProjectId(context, milestone?.projectId);
    return context;
  }

  if (owner.type === "task") {
    return taskProjectContext(database, owner.id);
  }

  if (owner.type === "feature") {
    collectFeatureProjectIds(database, owner.id, context);
    return context;
  }

  collectUseCaseProjectIds(database, owner.id, context);
  return context;
}

export function ticketProjectContext(database: DbClient, ticketId: number, visitedTickets = new Set<number>()): ProjectContext {
  const context = new Set<number>();
  if (visitedTickets.has(ticketId)) {
    return context;
  }
  visitedTickets.add(ticketId);

  const ticket = database.select({ parentId: tickets.parentId }).from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) {
    return context;
  }

  if (ticket.parentId !== null) {
    mergeProjectContext(context, ticketProjectContext(database, ticket.parentId, visitedTickets));
  }

  const projectRows = database.select({ projectId: projectTickets.ownerId }).from(projectTickets).where(eq(projectTickets.ticketId, ticketId)).all();
  for (const row of projectRows) {
    addProjectId(context, row.projectId);
  }

  const milestoneRows = database
    .select({ projectId: milestones.projectId })
    .from(milestoneTickets)
    .innerJoin(milestones, eq(milestoneTickets.ownerId, milestones.id))
    .where(eq(milestoneTickets.ticketId, ticketId))
    .all();
  for (const row of milestoneRows) {
    addProjectId(context, row.projectId);
  }

  const taskRows = database.select({ taskId: taskTickets.ownerId }).from(taskTickets).where(eq(taskTickets.ticketId, ticketId)).all();
  for (const row of taskRows) {
    mergeProjectContext(context, taskProjectContext(database, row.taskId));
  }

  const featureRows = database.select({ featureId: featureTickets.ownerId }).from(featureTickets).where(eq(featureTickets.ticketId, ticketId)).all();
  for (const row of featureRows) {
    collectFeatureProjectIds(database, row.featureId, context);
  }

  const useCaseRows = database.select({ useCaseId: useCaseTickets.ownerId }).from(useCaseTickets).where(eq(useCaseTickets.ticketId, ticketId)).all();
  for (const row of useCaseRows) {
    collectUseCaseProjectIds(database, row.useCaseId, context);
  }

  const relationRows = database
    .select({ sourceTicketId: ticketRelations.sourceTicketId, targetTicketId: ticketRelations.targetTicketId })
    .from(ticketRelations)
    .where(or(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, ticketId)))
    .all();
  for (const row of relationRows) {
    const relatedTicketId = row.sourceTicketId === ticketId ? row.targetTicketId : row.sourceTicketId;
    mergeProjectContext(context, ticketProjectContext(database, relatedTicketId, visitedTickets));
  }

  return context;
}

export function projectContextsAreCompatible(ownerContext: ProjectContext, targetContext: ProjectContext): boolean {
  if (ownerContext.size === 0) {
    return targetContext.size === 0;
  }

  if (targetContext.size === 0) {
    return true;
  }

  for (const projectId of ownerContext) {
    if (targetContext.has(projectId)) {
      return true;
    }
  }
  return false;
}

export function assertCompatibleProjectContexts(ownerContext: ProjectContext, targetContext: ProjectContext): void {
  if (!projectContextsAreCompatible(ownerContext, targetContext)) {
    throw badRequest("Projektfremde Aufgaben- und Ticket-Verknüpfungen sind nicht erlaubt");
  }
}
