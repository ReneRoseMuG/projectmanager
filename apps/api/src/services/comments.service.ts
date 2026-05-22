import type { Comment, CommentEntityType, CommentInput, CommentOwner, JournalObjectType, RecentComment } from "@taskmanager/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { DbClient, DbSession } from "../db/client.js";
import {
  backlogItemComments,
  backlogItems,
  comments,
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
import { commentRepository, type CommentRecord } from "../repositories/comment.repository.js";
import { notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";
import {
  buildDeleteSummary,
  buildLinkSummary,
  buildUnlinkSummary,
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

function mapComment(database: DbClient, record: CommentRecord): Comment {
  return {
    id: record.id,
    owners: listCommentOwners(database, record.id),
    body: record.body,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version
  };
}

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function ensureTaskExists(database: DbClient, taskId: number): void {
  const task = database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

function ensureMilestoneExists(database: DbClient, milestoneId: number): void {
  const milestone = database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function ensureUseCaseExists(database: DbClient, useCaseId: number): void {
  const useCase = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, useCaseId)).get();
  if (!useCase) {
    throw notFound(`Use case with id ${useCaseId} not found`);
  }
}

function ensureBacklogItemExists(database: DbClient, backlogItemId: number): void {
  const item = database.select({ id: backlogItems.id }).from(backlogItems).where(eq(backlogItems.id, backlogItemId)).get();
  if (!item) {
    throw notFound(`Backlog item with id ${backlogItemId} not found`);
  }
}

function ensureWikiPageExists(database: DbClient, wikiPageId: number): void {
  const page = database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)).get();
  if (!page) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
  }
}

function ensureTicketExists(database: DbClient, ticketId: number): void {
  const ticket = database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
}

function ensureOwnerExists(database: DbClient, owner: CommentOwner): void {
  if (owner.type === "project") {
    ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "task") {
    ensureTaskExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    ensureFeatureExists(database, owner.id);
    return;
  }
  if (owner.type === "useCase") {
    ensureUseCaseExists(database, owner.id);
    return;
  }
  if (owner.type === "backlogItem") {
    ensureBacklogItemExists(database, owner.id);
    return;
  }
  if (owner.type === "wikiPage") {
    ensureWikiPageExists(database, owner.id);
    return;
  }
  ensureTicketExists(database, owner.id);
}

function getOwnerJournalObject(database: DbClient, owner: CommentOwner): JournalObjectRef {
  if (owner.type === "project") {
    const project = database.select({ name: projects.name }).from(projects).where(eq(projects.id, owner.id)).get();
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "task") {
    const task = database.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)).get();
    return makeJournalObject("task", owner.id, task?.title ?? `Aufgabe ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = database.select({ name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)).get();
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "feature") {
    const feature = database.select({ title: features.title }).from(features).where(eq(features.id, owner.id)).get();
    return makeJournalObject("feature", owner.id, feature?.title ?? `Feature ${owner.id}`);
  }
  if (owner.type === "useCase") {
    const useCase = database.select({ title: useCases.title }).from(useCases).where(eq(useCases.id, owner.id)).get();
    return makeJournalObject("useCase", owner.id, useCase?.title ?? `Use Case ${owner.id}`);
  }
  if (owner.type === "backlogItem") {
    const item = database.select({ title: backlogItems.title }).from(backlogItems).where(eq(backlogItems.id, owner.id)).get();
    return makeJournalObject("backlogItem", owner.id, item?.title ?? `Backlog-Eintrag ${owner.id}`);
  }
  if (owner.type === "wikiPage") {
    const page = database.select({ title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, owner.id)).get();
    return makeJournalObject("wikiPage", owner.id, page?.title ?? `Wiki-Seite ${owner.id}`);
  }
  const ticket = database.select({ title: tickets.title }).from(tickets).where(eq(tickets.id, owner.id)).get();
  return makeJournalObject("ticket", owner.id, ticket?.title ?? `Ticket ${owner.id}`);
}

function commentJournalObject(comment: Pick<CommentRecord, "id" | "body">): JournalObjectRef {
  return makeJournalObject("comment", comment.id, comment.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || `Kommentar ${comment.id}`);
}

function listCommentOwners(database: DbClient, commentId: number): CommentOwner[] {
  return [
    ...database.select({ id: projectComments.projectId }).from(projectComments).where(eq(projectComments.commentId, commentId)).all().map((row) => ({ type: "project" as const, id: row.id })),
    ...database.select({ id: taskComments.taskId }).from(taskComments).where(eq(taskComments.commentId, commentId)).all().map((row) => ({ type: "task" as const, id: row.id })),
    ...database.select({ id: milestoneComments.milestoneId }).from(milestoneComments).where(eq(milestoneComments.commentId, commentId)).all().map((row) => ({ type: "milestone" as const, id: row.id })),
    ...database.select({ id: featureComments.featureId }).from(featureComments).where(eq(featureComments.commentId, commentId)).all().map((row) => ({ type: "feature" as const, id: row.id })),
    ...database.select({ id: useCaseComments.useCaseId }).from(useCaseComments).where(eq(useCaseComments.commentId, commentId)).all().map((row) => ({ type: "useCase" as const, id: row.id })),
    ...database
      .select({ id: backlogItemComments.backlogItemId })
      .from(backlogItemComments)
      .where(eq(backlogItemComments.commentId, commentId))
      .all()
      .map((row) => ({ type: "backlogItem" as const, id: row.id })),
    ...database
      .select({ id: wikiPageComments.wikiPageId })
      .from(wikiPageComments)
      .where(eq(wikiPageComments.commentId, commentId))
      .all()
      .map((row) => ({ type: "wikiPage" as const, id: row.id })),
    ...database.select({ id: ticketComments.ticketId }).from(ticketComments).where(eq(ticketComments.commentId, commentId)).all().map((row) => ({ type: "ticket" as const, id: row.id }))
  ];
}

function insertCommentLink(database: DbSession, owner: CommentOwner, commentId: number): void {
  if (owner.type === "project") {
    database.insert(projectComments).values({ projectId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "task") {
    database.insert(taskComments).values({ taskId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "milestone") {
    database.insert(milestoneComments).values({ milestoneId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "feature") {
    database.insert(featureComments).values({ featureId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "useCase") {
    database.insert(useCaseComments).values({ useCaseId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "backlogItem") {
    database.insert(backlogItemComments).values({ backlogItemId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "wikiPage") {
    database.insert(wikiPageComments).values({ wikiPageId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  database.insert(ticketComments).values({ ticketId: owner.id, commentId }).onConflictDoNothing().run();
}

function deleteCommentLink(database: DbClient, owner: CommentOwner, commentId: number): number {
  if (owner.type === "project") {
    return database.delete(projectComments).where(and(eq(projectComments.projectId, owner.id), eq(projectComments.commentId, commentId))).run().changes;
  }
  if (owner.type === "task") {
    return database.delete(taskComments).where(and(eq(taskComments.taskId, owner.id), eq(taskComments.commentId, commentId))).run().changes;
  }
  if (owner.type === "milestone") {
    return database.delete(milestoneComments).where(and(eq(milestoneComments.milestoneId, owner.id), eq(milestoneComments.commentId, commentId))).run().changes;
  }
  if (owner.type === "feature") {
    return database.delete(featureComments).where(and(eq(featureComments.featureId, owner.id), eq(featureComments.commentId, commentId))).run().changes;
  }
  if (owner.type === "useCase") {
    return database.delete(useCaseComments).where(and(eq(useCaseComments.useCaseId, owner.id), eq(useCaseComments.commentId, commentId))).run().changes;
  }
  if (owner.type === "backlogItem") {
    return database.delete(backlogItemComments).where(and(eq(backlogItemComments.backlogItemId, owner.id), eq(backlogItemComments.commentId, commentId))).run().changes;
  }
  if (owner.type === "wikiPage") {
    return database.delete(wikiPageComments).where(and(eq(wikiPageComments.wikiPageId, owner.id), eq(wikiPageComments.commentId, commentId))).run().changes;
  }
  return database.delete(ticketComments).where(and(eq(ticketComments.ticketId, owner.id), eq(ticketComments.commentId, commentId))).run().changes;
}

function selectOwnerComments(database: DbClient, owner: CommentOwner): CommentRecord[] {
  if (owner.type === "project") {
    return database
      .select(commentSelect)
      .from(projectComments)
      .innerJoin(comments, eq(projectComments.commentId, comments.id))
      .where(eq(projectComments.projectId, owner.id))
      .orderBy(comments.createdAt, comments.id)
      .all();
  }
  if (owner.type === "task") {
    return database
      .select(commentSelect)
      .from(taskComments)
      .innerJoin(comments, eq(taskComments.commentId, comments.id))
      .where(eq(taskComments.taskId, owner.id))
      .orderBy(comments.createdAt, comments.id)
      .all();
  }
  if (owner.type === "milestone") {
    return database
      .select(commentSelect)
      .from(milestoneComments)
      .innerJoin(comments, eq(milestoneComments.commentId, comments.id))
      .where(eq(milestoneComments.milestoneId, owner.id))
      .orderBy(comments.createdAt, comments.id)
      .all();
  }
  if (owner.type === "feature") {
    return database
      .select(commentSelect)
      .from(featureComments)
      .innerJoin(comments, eq(featureComments.commentId, comments.id))
      .where(eq(featureComments.featureId, owner.id))
      .orderBy(comments.createdAt, comments.id)
      .all();
  }
  if (owner.type === "useCase") {
    return database
      .select(commentSelect)
      .from(useCaseComments)
      .innerJoin(comments, eq(useCaseComments.commentId, comments.id))
      .where(eq(useCaseComments.useCaseId, owner.id))
      .orderBy(comments.createdAt, comments.id)
      .all();
  }
  if (owner.type === "backlogItem") {
    return database
      .select(commentSelect)
      .from(backlogItemComments)
      .innerJoin(comments, eq(backlogItemComments.commentId, comments.id))
      .where(eq(backlogItemComments.backlogItemId, owner.id))
      .orderBy(comments.createdAt, comments.id)
      .all();
  }
  if (owner.type === "wikiPage") {
    return database
      .select(commentSelect)
      .from(wikiPageComments)
      .innerJoin(comments, eq(wikiPageComments.commentId, comments.id))
      .where(eq(wikiPageComments.wikiPageId, owner.id))
      .orderBy(comments.createdAt, comments.id)
      .all();
  }
  return database
    .select(commentSelect)
    .from(ticketComments)
    .innerJoin(comments, eq(ticketComments.commentId, comments.id))
    .where(eq(ticketComments.ticketId, owner.id))
    .orderBy(comments.createdAt, comments.id)
    .all();
}

type RecentCommentOwner = { type: "project" | "milestone" | "task"; id: number };

interface RecentCommentRow {
  id: number;
  body: string;
  createdAt: string;
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

function collectTaskDescendantIds(database: DbClient, rootIds: number[]): number[] {
  const result = new Set(rootIds);
  let frontier = [...new Set(rootIds)];
  while (frontier.length > 0) {
    const rows = database.select({ id: tasks.id }).from(tasks).where(inArray(tasks.parentId, frontier)).all();
    frontier = rows.map((row) => row.id).filter((id) => !result.has(id));
    for (const id of frontier) {
      result.add(id);
    }
  }
  return [...result];
}

function projectMilestoneIds(database: DbClient, projectId: number): number[] {
  return database.select({ id: milestones.id }).from(milestones).where(eq(milestones.projectId, projectId)).all().map((row) => row.id);
}

function taskIdsForOwner(database: DbClient, owner: RecentCommentOwner): number[] {
  if (owner.type === "task") {
    return [owner.id];
  }
  const direct =
    owner.type === "project"
      ? database.select({ id: projectTasks.taskId }).from(projectTasks).where(eq(projectTasks.ownerId, owner.id)).all().map((row) => row.id)
      : database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(eq(milestoneTasks.ownerId, owner.id)).all().map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = projectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(inArray(milestoneTasks.ownerId, milestoneIds)).all().map((row) => row.id);
    return collectTaskDescendantIds(database, [...direct, ...milestoneLinked]);
  }
  return collectTaskDescendantIds(database, direct);
}

function ticketIdsForOwner(database: DbClient, owner: RecentCommentOwner): number[] {
  if (owner.type === "task") {
    return [];
  }
  const direct =
    owner.type === "project"
      ? database.select({ id: projectTickets.ticketId }).from(projectTickets).where(eq(projectTickets.ownerId, owner.id)).all().map((row) => row.id)
      : database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(eq(milestoneTickets.ownerId, owner.id)).all().map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = projectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(inArray(milestoneTickets.ownerId, milestoneIds)).all().map((row) => row.id);
    return [...new Set([...direct, ...milestoneLinked])];
  }
  return [...new Set(direct)];
}

function recentProjectCommentRows(database: DbClient, ids: number[], mineUserId?: number): RecentCommentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
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
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .all()
    .map((row) => ({ ...row, entityType: "project" as const }));
}

function recentMilestoneCommentRows(database: DbClient, ids: number[], mineUserId?: number): RecentCommentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
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
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .all()
    .map((row) => ({ ...row, entityType: "milestone" as const }));
}

function recentTaskCommentRows(database: DbClient, ids: number[], mineUserId?: number): RecentCommentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
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
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .all()
    .map((row) => ({ ...row, entityType: "task" as const }));
}

function recentTicketCommentRows(database: DbClient, ids: number[], mineUserId?: number): RecentCommentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
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
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .all()
    .map((row) => ({ ...row, entityType: "ticket" as const }));
}

function recentCommentRowsForOwner(database: DbClient, owner: RecentCommentOwner): RecentCommentRow[] {
  if (owner.type === "project") {
    const milestoneIds = projectMilestoneIds(database, owner.id);
    return [
      ...recentProjectCommentRows(database, [owner.id]),
      ...recentMilestoneCommentRows(database, milestoneIds),
      ...recentTaskCommentRows(database, taskIdsForOwner(database, owner)),
      ...recentTicketCommentRows(database, ticketIdsForOwner(database, owner))
    ];
  }
  if (owner.type === "milestone") {
    return [
      ...recentMilestoneCommentRows(database, [owner.id]),
      ...recentTaskCommentRows(database, taskIdsForOwner(database, owner)),
      ...recentTicketCommentRows(database, ticketIdsForOwner(database, owner))
    ];
  }
  return recentTaskCommentRows(database, [owner.id]);
}

function recentOwnCommentRows(database: DbClient, userId: number): RecentCommentRow[] {
  return [
    ...recentProjectCommentRows(database, database.select({ id: projects.id }).from(projects).all().map((row) => row.id), userId),
    ...recentMilestoneCommentRows(database, database.select({ id: milestones.id }).from(milestones).all().map((row) => row.id), userId),
    ...recentTaskCommentRows(database, database.select({ id: tasks.id }).from(tasks).all().map((row) => row.id), userId),
    ...recentTicketCommentRows(database, database.select({ id: tickets.id }).from(tickets).all().map((row) => row.id), userId)
  ];
}

export function listRecentComments(database: DbClient, options: { owner?: RecentCommentOwner; currentUserId: number; limit?: number }): RecentComment[] {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const rows = options.owner ? recentCommentRowsForOwner(database, options.owner) : recentOwnCommentRows(database, options.currentUserId);
  return rows
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() || right.id - left.id)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      authorName: authorName(row),
      entityType: row.entityType,
      entityId: row.entityId,
      entityLabel: row.entityLabel
    }));
}

export function listEntityComments(database: DbClient, entityType: CommentEntityType, entityId: number): Comment[] {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  return selectOwnerComments(database, owner).map((comment) => mapComment(database, comment));
}

export function createEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, input: CommentInput, actor?: JournalActor | null): Comment {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  const body = requireNonEmpty(input.body, "body");
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const comment = commentRepository.create(tx, {
      body
    });
    insertCommentLink(tx, owner, comment.id);
    const commentObject = commentJournalObject(comment);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
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

export function linkEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, commentId: number, actor?: JournalActor | null): Comment {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  const comment = commentRepository.findById(database, commentId);
  if (!comment) {
    throw notFound(`Comment with id ${commentId} not found`);
  }
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    insertCommentLink(tx, owner, commentId);
    const commentObject = commentJournalObject(comment);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "link",
      object: commentObject,
      summary: buildLinkSummary(ownerObject, commentObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
  return mapComment(database, comment);
}

export function deleteEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, id: number, actor?: JournalActor | null): void {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  const comment = commentRepository.findById(database, id);
  if (!comment) {
    throw notFound(`Comment with id ${id} not found`);
  }
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = deleteCommentLink(txDb, owner, id);
    if (changes === 0) {
      throw notFound(`Comment with id ${id} not found`);
    }
    const commentObject = commentJournalObject(comment);
    const ownerObject = getOwnerJournalObject(txDb, owner);
    recordJournalEntry(txDb, {
      operation: "unlink",
      object: commentObject,
      summary: buildUnlinkSummary(ownerObject, commentObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export function listComments(database: DbClient, taskId: number): Comment[] {
  return listEntityComments(database, "task", taskId);
}

export function createComment(database: DbClient, taskId: number, input: CommentInput, actor?: JournalActor | null): Comment {
  return createEntityComment(database, "task", taskId, input, actor);
}

export function deleteComment(database: DbClient, id: number, actor?: JournalActor | null): void {
  const comment = commentRepository.findById(database, id);
  if (!comment) {
    throw notFound(`Comment with id ${id} not found`);
  }
  const owners = listCommentOwners(database, id);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const commentObject = commentJournalObject(comment);
    recordJournalEntry(txDb, {
      operation: "delete",
      object: commentObject,
      summary: buildDeleteSummary(commentObject),
      actor,
      contexts: owners.map((owner) => makeJournalContext(getOwnerJournalObject(txDb, owner), "owner"))
    });
    if (commentRepository.delete(tx, id) === 0) {
      throw notFound(`Comment with id ${id} not found`);
    }
  });
}
