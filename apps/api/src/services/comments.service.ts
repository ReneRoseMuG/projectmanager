import type { Comment, CommentEntityType, CommentInput, CommentOwner, CommentUpdate, JournalObjectType, RecentComment } from "@taskmanager/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { DbClient, DbSession } from "../db/client.js";
import {
  backlogItemComments,
  backlogItems,
  comments,
  dayPlanComments,
  dayPlans,
  featureComments,
  features,
  milestoneComments,
  milestoneTasks,
  milestoneTickets,
  milestones,
  projectComments,
  projectTasks,
  projectTickets,
  projects,
  taskComments,
  tasks,
  ticketComments,
  tickets,
  users,
  useCaseComments,
  useCases,
  wikiPageComments,
  wikiPages
} from "../db/schema.js";
import { firstRow, mutationAffectedRows } from "../db/query-utils.js";
import { commentRepository, type CommentRecord } from "../repositories/comment.repository.js";
import { notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";
import {
  buildDeleteSummary,
  buildJournalChanges,
  buildLinkSummary,
  buildUnlinkSummary,
  buildUpdateSummary,
  type JournalFieldDefinition,
  makeJournalContext,
  makeJournalObject,
  objectTypeLabel,
  recordJournalEntry,
  type JournalActor,
  type JournalObjectRef
} from "./journal.service.js";

const commentSelect = {
  id: comments.id,
  body: comments.body,
  version: comments.version,
  createdBy: comments.createdBy,
  updatedBy: comments.updatedBy,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt
};

const commentJournalFields: Array<JournalFieldDefinition<CommentRecord>> = [
  { key: "body", label: "Kommentar" }
];

async function mapComment(database: DbClient, record: CommentRecord): Promise<Comment> {
  return {
    id: record.id,
    owners: await listCommentOwners(database, record.id),
    body: record.body,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version
  };
}

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = firstRow(await database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

async function ensureTaskExists(database: DbClient, taskId: number): Promise<void> {
  const task = firstRow(await database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)));
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

async function ensureMilestoneExists(database: DbClient, milestoneId: number): Promise<void> {
  const milestone = firstRow(await database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)));
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

async function ensureFeatureExists(database: DbClient, featureId: number): Promise<void> {
  const feature = firstRow(await database.select({ id: features.id }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

async function ensureUseCaseExists(database: DbClient, useCaseId: number): Promise<void> {
  const useCase = firstRow(await database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)));
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

async function ensureBacklogItemExists(database: DbClient, backlogItemId: number): Promise<void> {
  const item = firstRow(await database.select({ id: backlogItems.id }).from(backlogItems).where(eq(backlogItems.id, backlogItemId)));
  if (!item) {
    throw notFound(`Backlog item with id ${backlogItemId} not found`);
  }
}

async function ensureWikiPageExists(database: DbClient, wikiPageId: number): Promise<void> {
  const page = firstRow(await database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)));
  if (!page) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
  }
}

async function ensureTicketExists(database: DbClient, ticketId: number): Promise<void> {
  const ticket = firstRow(await database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)));
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
}

async function ensureDayPlanExists(database: DbClient, dayPlanId: number): Promise<void> {
  const dayPlan = firstRow(await database.select({ id: dayPlans.id }).from(dayPlans).where(eq(dayPlans.id, dayPlanId)));
  if (!dayPlan) {
    throw notFound(`Day plan with id ${dayPlanId} not found`);
  }
}

export async function ensureDayPlanCommentAccess(database: DbClient, dayPlanId: number, userId: number): Promise<void> {
  const dayPlan = firstRow(await database.select({ id: dayPlans.id }).from(dayPlans).where(and(eq(dayPlans.id, dayPlanId), eq(dayPlans.userId, userId))));
  if (!dayPlan) {
    throw notFound("Day plan not found");
  }
}

async function ensureOwnerExists(database: DbClient, owner: CommentOwner): Promise<void> {
  if (owner.type === "project") {
    await ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "task") {
    await ensureTaskExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    await ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    await ensureFeatureExists(database, owner.id);
    return;
  }
  if (owner.type === "useCase") {
    await ensureUseCaseExists(database, owner.id);
    return;
  }
  if (owner.type === "backlogItem") {
    await ensureBacklogItemExists(database, owner.id);
    return;
  }
  if (owner.type === "wikiPage") {
    await ensureWikiPageExists(database, owner.id);
    return;
  }
  if (owner.type === "dayPlan") {
    await ensureDayPlanExists(database, owner.id);
    return;
  }
  await ensureTicketExists(database, owner.id);
}

async function getOwnerJournalObject(database: DbClient, owner: CommentOwner): Promise<JournalObjectRef> {
  if (owner.type === "project") {
    const project = firstRow(await database.select({ name: projects.name }).from(projects).where(eq(projects.id, owner.id)));
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "task") {
    const task = firstRow(await database.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)));
    return makeJournalObject("task", owner.id, task?.title ?? `Aufgabe ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)));
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "feature") {
    const feature = firstRow(await database.select({ title: features.title }).from(features).where(eq(features.id, owner.id)));
    return makeJournalObject("feature", owner.id, feature?.title ?? `Feature ${owner.id}`);
  }
  if (owner.type === "useCase") {
    const useCase = firstRow(await database.select({ title: useCases.title }).from(useCases).where(eq(useCases.id, owner.id)));
    return makeJournalObject("useCase", owner.id, useCase?.title ?? `Use Case ${owner.id}`);
  }
  if (owner.type === "backlogItem") {
    const item = firstRow(await database.select({ title: backlogItems.title }).from(backlogItems).where(eq(backlogItems.id, owner.id)));
    return makeJournalObject("backlogItem", owner.id, item?.title ?? `Backlog-Eintrag ${owner.id}`);
  }
  if (owner.type === "wikiPage") {
    const page = firstRow(await database.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, owner.id)));
    return makeJournalObject("wikiPage", owner.id, page?.title ?? `Wiki-Seite ${owner.id}`);
  }
  if (owner.type === "dayPlan") {
    const dayPlan = firstRow(await database.select({ date: dayPlans.date }).from(dayPlans).where(eq(dayPlans.id, owner.id)));
    return makeJournalObject("dayPlan", owner.id, dayPlan?.date ? `Persönliche Planung ${dayPlan.date}` : `Persönliche Planung ${owner.id}`);
  }
  const ticket = firstRow(await database.select({ title: tickets.title }).from(tickets).where(eq(tickets.id, owner.id)));
  return makeJournalObject("ticket", owner.id, ticket?.title ?? `Ticket ${owner.id}`);
}

function commentJournalObject(comment: Pick<CommentRecord, "id" | "body">): JournalObjectRef {
  return makeJournalObject("comment", comment.id, comment.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || `Kommentar ${comment.id}`);
}

async function listCommentOwners(database: DbClient, commentId: number): Promise<CommentOwner[]> {
  const [projectRows, taskRows, milestoneRows, featureRows, useCaseRows, backlogRows, wikiRows, dayPlanRows, ticketRows] = await Promise.all([
    database.select({ id: projectComments.projectId }).from(projectComments).where(eq(projectComments.commentId, commentId)),
    database.select({ id: taskComments.taskId }).from(taskComments).where(eq(taskComments.commentId, commentId)),
    database.select({ id: milestoneComments.milestoneId }).from(milestoneComments).where(eq(milestoneComments.commentId, commentId)),
    database.select({ id: featureComments.featureId }).from(featureComments).where(eq(featureComments.commentId, commentId)),
    database.select({ id: useCaseComments.useCaseId }).from(useCaseComments).where(eq(useCaseComments.commentId, commentId)),
    database.select({ id: backlogItemComments.backlogItemId }).from(backlogItemComments).where(eq(backlogItemComments.commentId, commentId)),
    database.select({ id: wikiPageComments.wikiPageId }).from(wikiPageComments).where(eq(wikiPageComments.commentId, commentId)),
    database.select({ id: dayPlanComments.dayPlanId }).from(dayPlanComments).where(eq(dayPlanComments.commentId, commentId)),
    database.select({ id: ticketComments.ticketId }).from(ticketComments).where(eq(ticketComments.commentId, commentId))
  ]);

  return [
    ...projectRows.map((row) => ({ type: "project" as const, id: row.id })),
    ...taskRows.map((row) => ({ type: "task" as const, id: row.id })),
    ...milestoneRows.map((row) => ({ type: "milestone" as const, id: row.id })),
    ...featureRows.map((row) => ({ type: "feature" as const, id: row.id })),
    ...useCaseRows.map((row) => ({ type: "useCase" as const, id: row.id })),
    ...backlogRows.map((row) => ({ type: "backlogItem" as const, id: row.id })),
    ...wikiRows.map((row) => ({ type: "wikiPage" as const, id: row.id })),
    ...dayPlanRows.map((row) => ({ type: "dayPlan" as const, id: row.id })),
    ...ticketRows.map((row) => ({ type: "ticket" as const, id: row.id }))
  ];
}

async function insertCommentLink(database: DbSession, owner: CommentOwner, commentId: number): Promise<void> {
  if (owner.type === "project") {
    await database.insert(projectComments).ignore().values({ projectId: owner.id, commentId });
    return;
  }
  if (owner.type === "task") {
    await database.insert(taskComments).ignore().values({ taskId: owner.id, commentId });
    return;
  }
  if (owner.type === "milestone") {
    await database.insert(milestoneComments).ignore().values({ milestoneId: owner.id, commentId });
    return;
  }
  if (owner.type === "feature") {
    await database.insert(featureComments).ignore().values({ featureId: owner.id, commentId });
    return;
  }
  if (owner.type === "useCase") {
    await database.insert(useCaseComments).ignore().values({ useCaseId: owner.id, commentId });
    return;
  }
  if (owner.type === "backlogItem") {
    await database.insert(backlogItemComments).ignore().values({ backlogItemId: owner.id, commentId });
    return;
  }
  if (owner.type === "wikiPage") {
    await database.insert(wikiPageComments).ignore().values({ wikiPageId: owner.id, commentId });
    return;
  }
  if (owner.type === "dayPlan") {
    await database.insert(dayPlanComments).ignore().values({ dayPlanId: owner.id, commentId });
    return;
  }
  await database.insert(ticketComments).ignore().values({ ticketId: owner.id, commentId });
}

async function deleteCommentLink(database: DbClient, owner: CommentOwner, commentId: number): Promise<number> {
  if (owner.type === "project") {
    return mutationAffectedRows(await database.delete(projectComments).where(and(eq(projectComments.projectId, owner.id), eq(projectComments.commentId, commentId))));
  }
  if (owner.type === "task") {
    return mutationAffectedRows(await database.delete(taskComments).where(and(eq(taskComments.taskId, owner.id), eq(taskComments.commentId, commentId))));
  }
  if (owner.type === "milestone") {
    return mutationAffectedRows(await database.delete(milestoneComments).where(and(eq(milestoneComments.milestoneId, owner.id), eq(milestoneComments.commentId, commentId))));
  }
  if (owner.type === "feature") {
    return mutationAffectedRows(await database.delete(featureComments).where(and(eq(featureComments.featureId, owner.id), eq(featureComments.commentId, commentId))));
  }
  if (owner.type === "useCase") {
    return mutationAffectedRows(await database.delete(useCaseComments).where(and(eq(useCaseComments.useCaseId, owner.id), eq(useCaseComments.commentId, commentId))));
  }
  if (owner.type === "backlogItem") {
    return mutationAffectedRows(await database.delete(backlogItemComments).where(and(eq(backlogItemComments.backlogItemId, owner.id), eq(backlogItemComments.commentId, commentId))));
  }
  if (owner.type === "wikiPage") {
    return mutationAffectedRows(await database.delete(wikiPageComments).where(and(eq(wikiPageComments.wikiPageId, owner.id), eq(wikiPageComments.commentId, commentId))));
  }
  if (owner.type === "dayPlan") {
    return mutationAffectedRows(await database.delete(dayPlanComments).where(and(eq(dayPlanComments.dayPlanId, owner.id), eq(dayPlanComments.commentId, commentId))));
  }
  return mutationAffectedRows(await database.delete(ticketComments).where(and(eq(ticketComments.ticketId, owner.id), eq(ticketComments.commentId, commentId))));
}

async function selectOwnerComments(database: DbClient, owner: CommentOwner): Promise<CommentRecord[]> {
  if (owner.type === "project") {
    return database
      .select(commentSelect)
      .from(projectComments)
      .innerJoin(comments, eq(projectComments.commentId, comments.id))
      .where(eq(projectComments.projectId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  if (owner.type === "task") {
    return database
      .select(commentSelect)
      .from(taskComments)
      .innerJoin(comments, eq(taskComments.commentId, comments.id))
      .where(eq(taskComments.taskId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  if (owner.type === "milestone") {
    return database
      .select(commentSelect)
      .from(milestoneComments)
      .innerJoin(comments, eq(milestoneComments.commentId, comments.id))
      .where(eq(milestoneComments.milestoneId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  if (owner.type === "feature") {
    return database
      .select(commentSelect)
      .from(featureComments)
      .innerJoin(comments, eq(featureComments.commentId, comments.id))
      .where(eq(featureComments.featureId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  if (owner.type === "useCase") {
    return database
      .select(commentSelect)
      .from(useCaseComments)
      .innerJoin(comments, eq(useCaseComments.commentId, comments.id))
      .where(eq(useCaseComments.useCaseId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  if (owner.type === "backlogItem") {
    return database
      .select(commentSelect)
      .from(backlogItemComments)
      .innerJoin(comments, eq(backlogItemComments.commentId, comments.id))
      .where(eq(backlogItemComments.backlogItemId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  if (owner.type === "wikiPage") {
    return database
      .select(commentSelect)
      .from(wikiPageComments)
      .innerJoin(comments, eq(wikiPageComments.commentId, comments.id))
      .where(eq(wikiPageComments.wikiPageId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  if (owner.type === "dayPlan") {
    return database
      .select(commentSelect)
      .from(dayPlanComments)
      .innerJoin(comments, eq(dayPlanComments.commentId, comments.id))
      .where(eq(dayPlanComments.dayPlanId, owner.id))
      .orderBy(comments.createdAt, comments.id);
  }
  return database
    .select(commentSelect)
    .from(ticketComments)
    .innerJoin(comments, eq(ticketComments.commentId, comments.id))
    .where(eq(ticketComments.ticketId, owner.id))
    .orderBy(comments.createdAt, comments.id);
}

type RecentCommentOwner = { type: "project" | "milestone" | "task" | "dayPlan"; id: number };

interface RecentCommentRow {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorFullName: string | null;
  authorEmail: string | null;
  entityType: JournalObjectType;
  entityId: number;
  entityLabel: string;
}

function authorName(row: Pick<RecentCommentRow, "authorFullName" | "authorEmail">): string {
  const name = row.authorFullName?.trim();
  return name || row.authorEmail || "System";
}

async function collectTaskDescendantIds(database: DbClient, rootIds: number[]): Promise<number[]> {
  const result = new Set(rootIds);
  let frontier = [...new Set(rootIds)];
  while (frontier.length > 0) {
    const rows = await database.select({ id: tasks.id }).from(tasks).where(inArray(tasks.parentId, frontier));
    frontier = rows.map((row) => row.id).filter((id) => !result.has(id));
    for (const id of frontier) {
      result.add(id);
    }
  }
  return [...result];
}

async function projectMilestoneIds(database: DbClient, projectId: number): Promise<number[]> {
  return (await database.select({ id: milestones.id }).from(milestones).where(eq(milestones.projectId, projectId))).map((row) => row.id);
}

async function taskIdsForOwner(database: DbClient, owner: RecentCommentOwner): Promise<number[]> {
  if (owner.type === "task") {
    return [owner.id];
  }
  const directRows = owner.type === "project"
    ? await database.select({ id: projectTasks.taskId }).from(projectTasks).where(eq(projectTasks.ownerId, owner.id))
    : await database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(eq(milestoneTasks.ownerId, owner.id));
  const direct = directRows.map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = await projectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : (await database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(inArray(milestoneTasks.ownerId, milestoneIds))).map((row) => row.id);
    return collectTaskDescendantIds(database, [...direct, ...milestoneLinked]);
  }
  return collectTaskDescendantIds(database, direct);
}

async function ticketIdsForOwner(database: DbClient, owner: RecentCommentOwner): Promise<number[]> {
  if (owner.type === "task") {
    return [];
  }
  const directRows = owner.type === "project"
    ? await database.select({ id: projectTickets.ticketId }).from(projectTickets).where(eq(projectTickets.ownerId, owner.id))
    : await database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(eq(milestoneTickets.ownerId, owner.id));
  const direct = directRows.map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = await projectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : (await database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(inArray(milestoneTickets.ownerId, milestoneIds))).map((row) => row.id);
    return [...new Set([...direct, ...milestoneLinked])];
  }
  return [...new Set(direct)];
}

async function recentProjectCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: projects.id,
      entityLabel: projects.name
    })
    .from(projectComments)
    .innerJoin(comments, eq(projectComments.commentId, comments.id))
    .innerJoin(projects, eq(projectComments.projectId, projects.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(projectComments.projectId, ids) : and(inArray(projectComments.projectId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "project" as const }));
}

async function recentMilestoneCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: milestones.id,
      entityLabel: milestones.name
    })
    .from(milestoneComments)
    .innerJoin(comments, eq(milestoneComments.commentId, comments.id))
    .innerJoin(milestones, eq(milestoneComments.milestoneId, milestones.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(milestoneComments.milestoneId, ids) : and(inArray(milestoneComments.milestoneId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "milestone" as const }));
}

async function recentFeatureCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: features.id,
      entityLabel: features.title
    })
    .from(featureComments)
    .innerJoin(comments, eq(featureComments.commentId, comments.id))
    .innerJoin(features, eq(featureComments.featureId, features.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(featureComments.featureId, ids) : and(inArray(featureComments.featureId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "feature" as const }));
}

async function recentUseCaseCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: useCases.id,
      entityLabel: useCases.title
    })
    .from(useCaseComments)
    .innerJoin(comments, eq(useCaseComments.commentId, comments.id))
    .innerJoin(useCases, eq(useCaseComments.useCaseId, useCases.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(useCaseComments.useCaseId, ids) : and(inArray(useCaseComments.useCaseId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "useCase" as const }));
}

async function recentBacklogItemCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: backlogItems.id,
      entityLabel: backlogItems.title
    })
    .from(backlogItemComments)
    .innerJoin(comments, eq(backlogItemComments.commentId, comments.id))
    .innerJoin(backlogItems, eq(backlogItemComments.backlogItemId, backlogItems.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(backlogItemComments.backlogItemId, ids) : and(inArray(backlogItemComments.backlogItemId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "backlogItem" as const }));
}

async function recentWikiPageCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: wikiPages.id,
      entityLabel: wikiPages.title
    })
    .from(wikiPageComments)
    .innerJoin(comments, eq(wikiPageComments.commentId, comments.id))
    .innerJoin(wikiPages, eq(wikiPageComments.wikiPageId, wikiPages.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(wikiPageComments.wikiPageId, ids) : and(inArray(wikiPageComments.wikiPageId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "wikiPage" as const }));
}

async function recentDayPlanCommentRows(database: DbClient, ids: number[], mineUserId?: number, ownerUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const conditions = [inArray(dayPlanComments.dayPlanId, ids)];
  if (mineUserId !== undefined) {
    conditions.push(eq(comments.createdBy, mineUserId));
  }
  if (ownerUserId !== undefined) {
    conditions.push(eq(dayPlans.userId, ownerUserId));
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: dayPlans.id,
      entityLabel: dayPlans.date
    })
    .from(dayPlanComments)
    .innerJoin(comments, eq(dayPlanComments.commentId, comments.id))
    .innerJoin(dayPlans, eq(dayPlanComments.dayPlanId, dayPlans.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "dayPlan" as const, entityLabel: `Persönliche Planung ${row.entityLabel}` }));
}

async function recentTaskCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: tasks.id,
      entityLabel: tasks.title
    })
    .from(taskComments)
    .innerJoin(comments, eq(taskComments.commentId, comments.id))
    .innerJoin(tasks, eq(taskComments.taskId, tasks.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(taskComments.taskId, ids) : and(inArray(taskComments.taskId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "task" as const }));
}

async function recentTicketCommentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentCommentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return (await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: tickets.id,
      entityLabel: tickets.title
    })
    .from(ticketComments)
    .innerJoin(comments, eq(ticketComments.commentId, comments.id))
    .innerJoin(tickets, eq(ticketComments.ticketId, tickets.id))
    .leftJoin(users, eq(comments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(ticketComments.ticketId, ids) : and(inArray(ticketComments.ticketId, ids), eq(comments.createdBy, mineUserId)))
    .orderBy(desc(comments.updatedAt), desc(comments.id)))
    .map((row) => ({ ...row, entityType: "ticket" as const }));
}

async function recentCommentRowsForOwner(database: DbClient, owner: RecentCommentOwner): Promise<RecentCommentRow[]> {
  if (owner.type === "project") {
    const milestoneIds = await projectMilestoneIds(database, owner.id);
    const [projectRows, milestoneRows, taskRows, ticketRows] = await Promise.all([
      recentProjectCommentRows(database, [owner.id]),
      recentMilestoneCommentRows(database, milestoneIds),
      taskIdsForOwner(database, owner).then((ids) => recentTaskCommentRows(database, ids)),
      ticketIdsForOwner(database, owner).then((ids) => recentTicketCommentRows(database, ids))
    ]);
    return [...projectRows, ...milestoneRows, ...taskRows, ...ticketRows];
  }
  if (owner.type === "milestone") {
    const [milestoneRows, taskRows, ticketRows] = await Promise.all([
      recentMilestoneCommentRows(database, [owner.id]),
      taskIdsForOwner(database, owner).then((ids) => recentTaskCommentRows(database, ids)),
      ticketIdsForOwner(database, owner).then((ids) => recentTicketCommentRows(database, ids))
    ]);
    return [...milestoneRows, ...taskRows, ...ticketRows];
  }
  if (owner.type === "dayPlan") {
    return recentDayPlanCommentRows(database, [owner.id]);
  }
  return recentTaskCommentRows(database, [owner.id]);
}

async function recentOwnCommentRows(database: DbClient, userId: number): Promise<RecentCommentRow[]> {
  const [allProjectIds, allMilestoneIds, allFeatureIds, allUseCaseIds, allBacklogIds, allWikiIds, allDayPlanIds, allTaskIds, allTicketIds] = await Promise.all([
    database.select({ id: projects.id }).from(projects).then((rows) => rows.map((r) => r.id)),
    database.select({ id: milestones.id }).from(milestones).then((rows) => rows.map((r) => r.id)),
    database.select({ id: features.id }).from(features).then((rows) => rows.map((r) => r.id)),
    database.select({ id: useCases.id }).from(useCases).then((rows) => rows.map((r) => r.id)),
    database.select({ id: backlogItems.id }).from(backlogItems).then((rows) => rows.map((r) => r.id)),
    database.select({ id: wikiPages.id }).from(wikiPages).then((rows) => rows.map((r) => r.id)),
    database.select({ id: dayPlans.id }).from(dayPlans).where(eq(dayPlans.userId, userId)).then((rows) => rows.map((r) => r.id)),
    database.select({ id: tasks.id }).from(tasks).then((rows) => rows.map((r) => r.id)),
    database.select({ id: tickets.id }).from(tickets).then((rows) => rows.map((r) => r.id))
  ]);

  const results = await Promise.all([
    recentProjectCommentRows(database, allProjectIds, userId),
    recentMilestoneCommentRows(database, allMilestoneIds, userId),
    recentFeatureCommentRows(database, allFeatureIds, userId),
    recentUseCaseCommentRows(database, allUseCaseIds, userId),
    recentBacklogItemCommentRows(database, allBacklogIds, userId),
    recentWikiPageCommentRows(database, allWikiIds, userId),
    recentDayPlanCommentRows(database, allDayPlanIds, userId, userId),
    recentTaskCommentRows(database, allTaskIds, userId),
    recentTicketCommentRows(database, allTicketIds, userId)
  ]);

  return results.flat();
}

async function recentAllCommentRows(database: DbClient, userId: number): Promise<RecentCommentRow[]> {
  const [allProjectIds, allMilestoneIds, allFeatureIds, allUseCaseIds, allBacklogIds, allWikiIds, allDayPlanIds, allTaskIds, allTicketIds] = await Promise.all([
    database.select({ id: projects.id }).from(projects).then((rows) => rows.map((r) => r.id)),
    database.select({ id: milestones.id }).from(milestones).then((rows) => rows.map((r) => r.id)),
    database.select({ id: features.id }).from(features).then((rows) => rows.map((r) => r.id)),
    database.select({ id: useCases.id }).from(useCases).then((rows) => rows.map((r) => r.id)),
    database.select({ id: backlogItems.id }).from(backlogItems).then((rows) => rows.map((r) => r.id)),
    database.select({ id: wikiPages.id }).from(wikiPages).then((rows) => rows.map((r) => r.id)),
    database.select({ id: dayPlans.id }).from(dayPlans).where(eq(dayPlans.userId, userId)).then((rows) => rows.map((r) => r.id)),
    database.select({ id: tasks.id }).from(tasks).then((rows) => rows.map((r) => r.id)),
    database.select({ id: tickets.id }).from(tickets).then((rows) => rows.map((r) => r.id))
  ]);

  const results = await Promise.all([
    recentProjectCommentRows(database, allProjectIds),
    recentMilestoneCommentRows(database, allMilestoneIds),
    recentFeatureCommentRows(database, allFeatureIds),
    recentUseCaseCommentRows(database, allUseCaseIds),
    recentBacklogItemCommentRows(database, allBacklogIds),
    recentWikiPageCommentRows(database, allWikiIds),
    recentDayPlanCommentRows(database, allDayPlanIds, undefined, userId),
    recentTaskCommentRows(database, allTaskIds),
    recentTicketCommentRows(database, allTicketIds)
  ]);

  return results.flat();
}

export async function listRecentComments(database: DbClient, options: { owner?: RecentCommentOwner; currentUserId: number; limit?: number; mine?: boolean }): Promise<RecentComment[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const rows = options.owner ? await recentCommentRowsForOwner(database, options.owner) : options.mine === true ? await recentOwnCommentRows(database, options.currentUserId) : await recentAllCommentRows(database, options.currentUserId);
  return rows
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() || right.id - left.id)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorName: authorName(row),
      entityType: row.entityType,
      entityId: row.entityId,
      entityLabel: row.entityLabel
    }));
}

export async function listEntityComments(database: DbClient, entityType: CommentEntityType, entityId: number): Promise<Comment[]> {
  const owner = { type: entityType, id: entityId };
  await ensureOwnerExists(database, owner);
  const records = await selectOwnerComments(database, owner);
  return Promise.all(records.map((comment) => mapComment(database, comment)));
}

export async function createEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, input: CommentInput, actor?: JournalActor | null): Promise<Comment> {
  const owner = { type: entityType, id: entityId };
  await ensureOwnerExists(database, owner);
  const body = requireNonEmpty(input.body, "body");
  const created = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const comment = await commentRepository.create(tx, {
      body
    });
    await insertCommentLink(tx, owner, comment.id);
    const commentObject = commentJournalObject(comment);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "create",
      object: commentObject,
      summary: `${objectTypeLabel(commentObject.type)} wurde zu ${objectTypeLabel(ownerObject.type)} "${ownerObject.label}" hinzugefügt.`,
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return comment;
  });

  return mapComment(database, created);
}

export async function linkEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, commentId: number, actor?: JournalActor | null): Promise<Comment> {
  const owner = { type: entityType, id: entityId };
  await ensureOwnerExists(database, owner);
  const comment = await commentRepository.findById(database, commentId);
  if (!comment) {
    throw notFound(`Comment with id ${commentId} not found`);
  }
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    await insertCommentLink(tx, owner, commentId);
    const commentObject = commentJournalObject(comment);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "link",
      object: commentObject,
      summary: buildLinkSummary(ownerObject, commentObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
  return mapComment(database, comment);
}

export async function updateComment(database: DbClient, id: number, input: CommentUpdate, actor?: JournalActor | null): Promise<Comment> {
  const body = requireNonEmpty(input.body, "body");
  const updated = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const current = await commentRepository.findById(tx, id);
    if (!current) {
      throw notFound(`Comment with id ${id} not found`);
    }
    const comment = await commentRepository.update(tx, id, input.expectedVersion, { body }, actor?.actorUserId ?? undefined);
    if (!comment) {
      throw notFound(`Comment with id ${id} not found`);
    }
    const commentObject = commentJournalObject(comment);
    const changes = buildJournalChanges(current, comment, commentJournalFields);
    const owners = await listCommentOwners(txDb, id);
    await recordJournalEntry(txDb, {
      operation: "update",
      object: commentObject,
      summary: buildUpdateSummary(commentObject, changes),
      actor,
      changes,
      contexts: await Promise.all(owners.map(async (owner) => makeJournalContext(await getOwnerJournalObject(txDb, owner), "owner")))
    });
    return comment;
  });

  return mapComment(database, updated);
}

export async function deleteEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, id: number, actor?: JournalActor | null): Promise<void> {
  const owner = { type: entityType, id: entityId };
  await ensureOwnerExists(database, owner);
  const comment = await commentRepository.findById(database, id);
  if (!comment) {
    throw notFound(`Comment with id ${id} not found`);
  }
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = await deleteCommentLink(txDb, owner, id);
    if (changes === 0) {
      throw notFound(`Comment with id ${id} not found`);
    }
    const commentObject = commentJournalObject(comment);
    const ownerObject = await getOwnerJournalObject(txDb, owner);
    await recordJournalEntry(txDb, {
      operation: "unlink",
      object: commentObject,
      summary: buildUnlinkSummary(ownerObject, commentObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export async function listComments(database: DbClient, taskId: number): Promise<Comment[]> {
  return listEntityComments(database, "task", taskId);
}

export async function createComment(database: DbClient, taskId: number, input: CommentInput, actor?: JournalActor | null): Promise<Comment> {
  return createEntityComment(database, "task", taskId, input, actor);
}

export async function deleteComment(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const comment = await commentRepository.findById(database, id);
  if (!comment) {
    throw notFound(`Comment with id ${id} not found`);
  }
  const owners = await listCommentOwners(database, id);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const commentObject = commentJournalObject(comment);
    await recordJournalEntry(txDb, {
      operation: "delete",
      object: commentObject,
      summary: buildDeleteSummary(commentObject),
      actor,
      contexts: await Promise.all(owners.map(async (owner) => makeJournalContext(await getOwnerJournalObject(txDb, owner), "owner")))
    });
    if (await commentRepository.delete(tx, id) === 0) {
      throw notFound(`Comment with id ${id} not found`);
    }
  });
}
