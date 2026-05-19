import type { Comment, CommentEntityType, CommentInput, CommentOwner } from "@taskmanager/shared-types";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import {
  backlogItemComments,
  backlogItems,
  comments,
  featureComments,
  features,
  projectComments,
  projects,
  taskComments,
  tasks,
  ticketComments,
  tickets,
  useCaseComments,
  useCases,
  wikiPageComments,
  wikiPages
} from "../db/schema.js";
import { commentRepository, type CommentRecord } from "../repositories/comment.repository.js";
import { notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";

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

function listCommentOwners(database: DbClient, commentId: number): CommentOwner[] {
  return [
    ...database.select({ id: projectComments.projectId }).from(projectComments).where(eq(projectComments.commentId, commentId)).all().map((row) => ({ type: "project" as const, id: row.id })),
    ...database.select({ id: taskComments.taskId }).from(taskComments).where(eq(taskComments.commentId, commentId)).all().map((row) => ({ type: "task" as const, id: row.id })),
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

function insertCommentLink(database: DbClient, owner: CommentOwner, commentId: number): void {
  if (owner.type === "project") {
    database.insert(projectComments).values({ projectId: owner.id, commentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "task") {
    database.insert(taskComments).values({ taskId: owner.id, commentId }).onConflictDoNothing().run();
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

export function listEntityComments(database: DbClient, entityType: CommentEntityType, entityId: number): Comment[] {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  return selectOwnerComments(database, owner).map((comment) => mapComment(database, comment));
}

export function createEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, input: CommentInput): Comment {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  const body = requireNonEmpty(input.body, "body");
  const created = database.transaction((tx) => {
    const comment = commentRepository.create(tx as unknown as DbClient, {
      body
    });
    insertCommentLink(tx, owner, comment.id);
    return comment;
  });

  return mapComment(database, created);
}

export function linkEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, commentId: number): Comment {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  const comment = commentRepository.findById(database, commentId);
  if (!comment) {
    throw notFound(`Comment with id ${commentId} not found`);
  }
  insertCommentLink(database, owner, commentId);
  return mapComment(database, comment);
}

export function deleteEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, id: number): void {
  const owner = { type: entityType, id: entityId };
  ensureOwnerExists(database, owner);
  const changes = deleteCommentLink(database, owner, id);
  if (changes === 0) {
    throw notFound(`Comment with id ${id} not found`);
  }
}

export function listComments(database: DbClient, taskId: number): Comment[] {
  return listEntityComments(database, "task", taskId);
}

export function createComment(database: DbClient, taskId: number, input: CommentInput): Comment {
  return createEntityComment(database, "task", taskId, input);
}

export function deleteComment(database: DbClient, id: number): void {
  if (commentRepository.delete(database, id) === 0) {
    throw notFound(`Comment with id ${id} not found`);
  }
}
