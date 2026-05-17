import type { Comment, CommentEntityType, CommentInput } from "@taskmanager/shared-types";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { backlogItems, comments, features, projects, tasks, tickets, useCases, wikiPages } from "../db/schema.js";
import { notFound } from "../utils/errors.js";
import { nowIso, requireNonEmpty } from "./helpers.js";

type CommentRecord = typeof comments.$inferSelect;

function mapComment(record: CommentRecord): Comment {
  return {
    id: record.id,
    taskId: record.taskId,
    entityType: record.entityType,
    entityId: record.entityId,
    body: record.body,
    createdAt: record.createdAt
  };
}

function ensureEntityExists(database: DbClient, entityType: CommentEntityType, entityId: number): void {
  const exists =
    entityType === "task"
      ? database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, entityId)).get()
      : entityType === "feature"
        ? database.select({ id: features.id }).from(features).where(eq(features.id, entityId)).get()
        : entityType === "project"
          ? database.select({ id: projects.id }).from(projects).where(eq(projects.id, entityId)).get()
          : entityType === "useCase"
            ? database.select({ id: useCases.id }).from(useCases).where(eq(useCases.id, entityId)).get()
            : entityType === "backlogItem"
              ? database.select({ id: backlogItems.id }).from(backlogItems).where(eq(backlogItems.id, entityId)).get()
              : entityType === "wikiPage"
                ? database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, entityId)).get()
                : database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, entityId)).get();

  if (!exists) {
    throw notFound(`${entityType} with id ${entityId} not found`);
  }
}

export function listEntityComments(database: DbClient, entityType: CommentEntityType, entityId: number): Comment[] {
  ensureEntityExists(database, entityType, entityId);
  return database
    .select()
    .from(comments)
    .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
    .orderBy(comments.createdAt, comments.id)
    .all()
    .map(mapComment);
}

export function createEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, input: CommentInput): Comment {
  ensureEntityExists(database, entityType, entityId);
  const body = requireNonEmpty(input.body, "body");
  const created = database
    .insert(comments)
    .values({
      taskId: entityType === "task" ? entityId : null,
      entityType,
      entityId,
      body,
      createdAt: nowIso()
    })
    .returning()
    .get();

  return mapComment(created);
}

export function deleteEntityComment(database: DbClient, entityType: CommentEntityType, entityId: number, id: number): void {
  ensureEntityExists(database, entityType, entityId);
  const result = database
    .delete(comments)
    .where(and(eq(comments.id, id), eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
    .run();
  if (result.changes === 0) {
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
  const result = database.delete(comments).where(eq(comments.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Comment with id ${id} not found`);
  }
}
