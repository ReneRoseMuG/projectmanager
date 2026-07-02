import type { MoveOwner, ProjectContextTreeNode } from "@taskmanager/shared-types";
import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import {
  milestoneNotes,
  milestoneTasks,
  milestoneTickets,
  milestones,
  notes,
  projectNotes,
  projects,
  projectTasks,
  projectTickets,
  taskNotes,
  taskTickets,
  tasks,
  ticketNotes,
  tickets
} from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { taskProjectContext, ticketProjectContext } from "./project-context.service.js";

function byLabelAndType(a: ProjectContextTreeNode, b: ProjectContextTreeNode): number {
  const typeOrder: Record<ProjectContextTreeNode["type"], number> = {
    project: 0,
    milestone: 1,
    task: 2,
    ticket: 3,
    note: 4
  };
  return typeOrder[a.type] - typeOrder[b.type] || a.label.localeCompare(b.label, "de-DE") || a.id - b.id;
}

function sorted(nodes: ProjectContextTreeNode[]): ProjectContextTreeNode[] {
  return nodes.sort(byLabelAndType);
}

function noteNode(row: { id: number; label: string }): ProjectContextTreeNode {
  return { type: "note", id: row.id, label: row.label, children: [] };
}

async function noteNodesForProject(database: DbClient, projectId: number): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: notes.id, label: notes.title })
    .from(projectNotes)
    .innerJoin(notes, eq(projectNotes.noteId, notes.id))
    .where(eq(projectNotes.projectId, projectId));
  return sorted(rows.map(noteNode));
}

async function noteNodesForMilestone(database: DbClient, milestoneId: number): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: notes.id, label: notes.title })
    .from(milestoneNotes)
    .innerJoin(notes, eq(milestoneNotes.noteId, notes.id))
    .where(eq(milestoneNotes.milestoneId, milestoneId));
  return sorted(rows.map(noteNode));
}

async function noteNodesForTask(database: DbClient, taskId: number): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: notes.id, label: notes.title })
    .from(taskNotes)
    .innerJoin(notes, eq(taskNotes.noteId, notes.id))
    .where(eq(taskNotes.taskId, taskId));
  return sorted(rows.map(noteNode));
}

async function noteNodesForTicket(database: DbClient, ticketId: number): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: notes.id, label: notes.title })
    .from(ticketNotes)
    .innerJoin(notes, eq(ticketNotes.noteId, notes.id))
    .where(eq(ticketNotes.ticketId, ticketId));
  return sorted(rows.map(noteNode));
}

async function ticketNode(database: DbClient, ticket: Pick<typeof tickets.$inferSelect, "id" | "title">, visitedTickets: Set<number>): Promise<ProjectContextTreeNode> {
  if (visitedTickets.has(ticket.id)) {
    return { type: "ticket", id: ticket.id, label: ticket.title, children: [] };
  }
  visitedTickets.add(ticket.id);

  const childTickets = await database.select({ id: tickets.id, title: tickets.title }).from(tickets).where(eq(tickets.parentId, ticket.id));
  const children = [
    ...(await Promise.all(childTickets.map((child) => ticketNode(database, child, visitedTickets)))),
    ...(await noteNodesForTicket(database, ticket.id))
  ];
  return { type: "ticket", id: ticket.id, label: ticket.title, children: sorted(children) };
}

async function taskNode(
  database: DbClient,
  task: Pick<typeof tasks.$inferSelect, "id" | "title">,
  visitedTasks: Set<number>,
  visitedTickets: Set<number>
): Promise<ProjectContextTreeNode> {
  if (visitedTasks.has(task.id)) {
    return { type: "task", id: task.id, label: task.title, children: [] };
  }
  visitedTasks.add(task.id);

  const [childTasks, linkedTickets] = await Promise.all([
    database.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.parentId, task.id)),
    database
      .select({ id: tickets.id, title: tickets.title, parentId: tickets.parentId })
      .from(taskTickets)
      .innerJoin(tickets, eq(taskTickets.ticketId, tickets.id))
      .where(eq(taskTickets.ownerId, task.id))
  ]);
  const children = [
    ...(await Promise.all(childTasks.map((child) => taskNode(database, child, visitedTasks, visitedTickets)))),
    ...(await Promise.all(linkedTickets.filter((ticket) => ticket.parentId === null).map((ticket) => ticketNode(database, ticket, visitedTickets)))),
    ...(await noteNodesForTask(database, task.id))
  ];
  return { type: "task", id: task.id, label: task.title, children: sorted(children) };
}

async function rootTaskNodesForProject(database: DbClient, projectId: number, visitedTasks: Set<number>, visitedTickets: Set<number>): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: tasks.id, title: tasks.title, parentId: tasks.parentId })
    .from(projectTasks)
    .innerJoin(tasks, eq(projectTasks.taskId, tasks.id))
    .where(eq(projectTasks.ownerId, projectId));
  return sorted(await Promise.all(rows.filter((row) => row.parentId === null).map((task) => taskNode(database, task, visitedTasks, visitedTickets))));
}

async function rootTaskNodesForMilestone(database: DbClient, milestoneId: number, visitedTasks: Set<number>, visitedTickets: Set<number>): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: tasks.id, title: tasks.title, parentId: tasks.parentId })
    .from(milestoneTasks)
    .innerJoin(tasks, eq(milestoneTasks.taskId, tasks.id))
    .where(eq(milestoneTasks.ownerId, milestoneId));
  return sorted(await Promise.all(rows.filter((row) => row.parentId === null).map((task) => taskNode(database, task, visitedTasks, visitedTickets))));
}

async function rootTicketNodesForProject(database: DbClient, projectId: number, visitedTickets: Set<number>): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: tickets.id, title: tickets.title, parentId: tickets.parentId })
    .from(projectTickets)
    .innerJoin(tickets, eq(projectTickets.ticketId, tickets.id))
    .where(eq(projectTickets.ownerId, projectId));
  return sorted(await Promise.all(rows.filter((row) => row.parentId === null).map((ticket) => ticketNode(database, ticket, visitedTickets))));
}

async function rootTicketNodesForMilestone(database: DbClient, milestoneId: number, visitedTickets: Set<number>): Promise<ProjectContextTreeNode[]> {
  const rows = await database
    .select({ id: tickets.id, title: tickets.title, parentId: tickets.parentId })
    .from(milestoneTickets)
    .innerJoin(tickets, eq(milestoneTickets.ticketId, tickets.id))
    .where(eq(milestoneTickets.ownerId, milestoneId));
  return sorted(await Promise.all(rows.filter((row) => row.parentId === null).map((ticket) => ticketNode(database, ticket, visitedTickets))));
}

async function milestoneNode(
  database: DbClient,
  milestone: Pick<typeof milestones.$inferSelect, "id" | "name">,
  visitedTasks: Set<number>,
  visitedTickets: Set<number>
): Promise<ProjectContextTreeNode> {
  const children = [
    ...(await rootTaskNodesForMilestone(database, milestone.id, visitedTasks, visitedTickets)),
    ...(await rootTicketNodesForMilestone(database, milestone.id, visitedTickets)),
    ...(await noteNodesForMilestone(database, milestone.id))
  ];
  return { type: "milestone", id: milestone.id, label: milestone.name, children: sorted(children) };
}

export async function getProjectContextTree(database: DbClient, projectId: number): Promise<ProjectContextTreeNode> {
  const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }

  const visitedTasks = new Set<number>();
  const visitedTickets = new Set<number>();
  const milestoneRows = await database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.projectId, projectId));
  const children = [
    ...(await Promise.all(milestoneRows.map((milestone) => milestoneNode(database, milestone, visitedTasks, visitedTickets)))),
    ...(await rootTaskNodesForProject(database, projectId, visitedTasks, visitedTickets)),
    ...(await rootTicketNodesForProject(database, projectId, visitedTickets)),
    ...(await noteNodesForProject(database, projectId))
  ];

  return { type: "project", id: project.id, label: project.name, children: sorted(children) };
}

export async function resolveProjectIdForMoveOwner(database: DbClient, owner: MoveOwner): Promise<number> {
  if (owner.type === "project") {
    return owner.id;
  }
  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)));
    if (!milestone) {
      throw notFound(`Milestone with id ${owner.id} not found`);
    }
    return milestone.projectId;
  }

  const context = owner.type === "task" ? await taskProjectContext(database, owner.id) : await ticketProjectContext(database, owner.id);
  if (context.size === 0) {
    throw badRequest("Für diesen Kontext konnte kein Projektbaum bestimmt werden");
  }
  if (context.size > 1) {
    throw badRequest("Für diesen Kontext gibt es mehrere Projektbäume");
  }
  return [...context][0] as number;
}
