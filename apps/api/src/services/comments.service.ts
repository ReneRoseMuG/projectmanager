import type { Comment, CommentInput } from "@taskmanager/shared-types";
import { desc, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { comments, tasks } from "../db/schema.js";
import { notFound } from "../utils/errors.js";
import { nowIso, requireNonEmpty } from "./helpers.js";

type CommentRecord = typeof comments.$inferSelect;

function mapComment(record: CommentRecord): Comment {
  return {
    id: record.id,
    taskId: record.taskId,
    body: record.body,
    createdAt: record.createdAt
  };
}

function ensureTaskExists(database: DbClient, taskId: number): void {
  const task = database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

export function listComments(database: DbClient, taskId: number): Comment[] {
  ensureTaskExists(database, taskId);
  return database
    .select()
    .from(comments)
    .where(eq(comments.taskId, taskId))
    .orderBy(desc(comments.createdAt))
    .all()
    .map(mapComment);
}

export function createComment(database: DbClient, taskId: number, input: CommentInput): Comment {
  ensureTaskExists(database, taskId);
  const body = requireNonEmpty(input.body, "body");
  const created = database
    .insert(comments)
    .values({ taskId, body, createdAt: nowIso() })
    .returning()
    .get();

  return mapComment(created);
}

export function deleteComment(database: DbClient, id: number): void {
  const result = database.delete(comments).where(eq(comments.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Comment with id ${id} not found`);
  }
}
