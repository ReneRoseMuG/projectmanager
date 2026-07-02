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
  projects,
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
import { firstRow } from "../db/query-utils.js";
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

async function collectFeatureProjectIds(database: DbClient, featureId: number, context: ProjectContext): Promise<void> {
  const directProjectRows = await database.select({ projectId: projectFeatures.projectId }).from(projectFeatures).where(eq(projectFeatures.featureId, featureId));
  for (const row of directProjectRows) {
    addProjectId(context, row.projectId);
  }

  const milestoneProjectRows = await database
    .select({ projectId: milestones.projectId })
    .from(milestoneFeatures)
    .innerJoin(milestones, eq(milestoneFeatures.milestoneId, milestones.id))
    .where(eq(milestoneFeatures.featureId, featureId));
  for (const row of milestoneProjectRows) {
    addProjectId(context, row.projectId);
  }
}

async function collectUseCaseProjectIds(database: DbClient, useCaseId: number, context: ProjectContext): Promise<void> {
  const useCase = firstRow(await database.select({ featureId: useCases.featureId }).from(useCases).where(eq(useCases.id, useCaseId)));
  if (useCase) {
    await collectFeatureProjectIds(database, useCase.featureId, context);
  }
}

export async function taskOwnerProjectContext(database: DbClient, owner: TaskOwner): Promise<ProjectContext> {
  const context = new Set<number>();

  if (owner.type === "project") {
    addProjectId(context, owner.id);
    return context;
  }

  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)));
    addProjectId(context, milestone?.projectId);
    return context;
  }

  if (owner.type === "feature") {
    await collectFeatureProjectIds(database, owner.id, context);
    return context;
  }

  await collectUseCaseProjectIds(database, owner.id, context);
  return context;
}

export async function taskProjectContext(database: DbClient, taskId: number, visitedTasks = new Set<number>()): Promise<ProjectContext> {
  const context = new Set<number>();
  if (visitedTasks.has(taskId)) {
    return context;
  }
  visitedTasks.add(taskId);

  const task = firstRow(await database.select({ parentId: tasks.parentId }).from(tasks).where(eq(tasks.id, taskId)));
  if (!task) {
    return context;
  }

  const [parentContext, projectRows, milestoneRows, featureRows, useCaseRows] = await Promise.all([
    task.parentId !== null ? taskProjectContext(database, task.parentId, visitedTasks) : Promise.resolve(new Set<number>()),
    database.select({ projectId: projectTasks.ownerId }).from(projectTasks).where(eq(projectTasks.taskId, taskId)),
    database
      .select({ projectId: milestones.projectId })
      .from(milestoneTasks)
      .innerJoin(milestones, eq(milestoneTasks.ownerId, milestones.id))
      .where(eq(milestoneTasks.taskId, taskId)),
    database.select({ featureId: featureTasks.ownerId }).from(featureTasks).where(eq(featureTasks.taskId, taskId)),
    database.select({ useCaseId: useCaseTasks.ownerId }).from(useCaseTasks).where(eq(useCaseTasks.taskId, taskId))
  ]);

  mergeProjectContext(context, parentContext);
  for (const row of projectRows) {
    addProjectId(context, row.projectId);
  }
  for (const row of milestoneRows) {
    addProjectId(context, row.projectId);
  }
  await Promise.all([
    ...featureRows.map((row) => collectFeatureProjectIds(database, row.featureId, context)),
    ...useCaseRows.map((row) => collectUseCaseProjectIds(database, row.useCaseId, context))
  ]);

  return context;
}

export async function ticketOwnerProjectContext(database: DbClient, owner: TicketOwner): Promise<ProjectContext> {
  const context = new Set<number>();

  if (owner.type === "project") {
    addProjectId(context, owner.id);
    return context;
  }

  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)));
    addProjectId(context, milestone?.projectId);
    return context;
  }

  if (owner.type === "task") {
    return taskProjectContext(database, owner.id);
  }

  if (owner.type === "feature") {
    await collectFeatureProjectIds(database, owner.id, context);
    return context;
  }

  await collectUseCaseProjectIds(database, owner.id, context);
  return context;
}

export async function ticketProjectContext(database: DbClient, ticketId: number, visitedTickets = new Set<number>()): Promise<ProjectContext> {
  const context = new Set<number>();
  if (visitedTickets.has(ticketId)) {
    return context;
  }
  visitedTickets.add(ticketId);

  const ticket = firstRow(await database.select({ parentId: tickets.parentId }).from(tickets).where(eq(tickets.id, ticketId)));
  if (!ticket) {
    return context;
  }

  const [parentContext, projectRows, milestoneRows, taskRows, featureRows, useCaseRows, relationRows] = await Promise.all([
    ticket.parentId !== null ? ticketProjectContext(database, ticket.parentId, visitedTickets) : Promise.resolve(new Set<number>()),
    database.select({ projectId: projectTickets.ownerId }).from(projectTickets).where(eq(projectTickets.ticketId, ticketId)),
    database
      .select({ projectId: milestones.projectId })
      .from(milestoneTickets)
      .innerJoin(milestones, eq(milestoneTickets.ownerId, milestones.id))
      .where(eq(milestoneTickets.ticketId, ticketId)),
    database.select({ taskId: taskTickets.ownerId }).from(taskTickets).where(eq(taskTickets.ticketId, ticketId)),
    database.select({ featureId: featureTickets.ownerId }).from(featureTickets).where(eq(featureTickets.ticketId, ticketId)),
    database.select({ useCaseId: useCaseTickets.ownerId }).from(useCaseTickets).where(eq(useCaseTickets.ticketId, ticketId)),
    database
      .select({ sourceTicketId: ticketRelations.sourceTicketId, targetTicketId: ticketRelations.targetTicketId })
      .from(ticketRelations)
      .where(or(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, ticketId)))
  ]);

  mergeProjectContext(context, parentContext);
  for (const row of projectRows) {
    addProjectId(context, row.projectId);
  }
  for (const row of milestoneRows) {
    addProjectId(context, row.projectId);
  }
  await Promise.all([
    ...taskRows.map((row) => taskProjectContext(database, row.taskId).then((ctx) => mergeProjectContext(context, ctx))),
    ...featureRows.map((row) => collectFeatureProjectIds(database, row.featureId, context)),
    ...useCaseRows.map((row) => collectUseCaseProjectIds(database, row.useCaseId, context)),
    ...relationRows.map((row) => {
      const relatedTicketId = row.sourceTicketId === ticketId ? row.targetTicketId : row.sourceTicketId;
      return ticketProjectContext(database, relatedTicketId, visitedTickets).then((ctx) => mergeProjectContext(context, ctx));
    })
  ]);

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
