import { and, asc, desc, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { comments, dayPlanComments, dayPlanEvents, dayPlanNotes, dayPlans, dayPlanTasks, events, notes, tasks } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type DayPlanRecord = typeof dayPlans.$inferSelect;
export type DayPlanTaskRow = typeof tasks.$inferSelect & { boardPosition: number };
export type DayPlanEventRow = typeof events.$inferSelect & { boardPosition: number };
export type DayPlanNoteRow = Pick<typeof notes.$inferSelect, "id" | "title" | "contentJson" | "version" | "createdAt" | "updatedAt">;
export type DayPlanCommentRow = typeof comments.$inferSelect;

const taskSelect = {
  id: tasks.id,
  parentId: tasks.parentId,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  assignee: tasks.assignee,
  dueDate: tasks.dueDate,
  importKey: tasks.importKey,
  version: tasks.version,
  createdBy: tasks.createdBy,
  updatedBy: tasks.updatedBy,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  boardPosition: dayPlanTasks.position
};

const eventSelect = {
  id: events.id,
  title: events.title,
  description: events.description,
  startTime: events.startTime,
  endTime: events.endTime,
  isAllDay: events.isAllDay,
  color: events.color,
  reminderMinutes: events.reminderMinutes,
  version: events.version,
  createdBy: events.createdBy,
  updatedBy: events.updatedBy,
  createdAt: events.createdAt,
  updatedAt: events.updatedAt,
  boardPosition: dayPlanEvents.position
};

const noteSelect = {
  id: notes.id,
  title: notes.title,
  contentJson: notes.contentJson,
  version: notes.version,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt
};

const commentSelect = {
  id: comments.id,
  body: comments.body,
  version: comments.version,
  createdBy: comments.createdBy,
  updatedBy: comments.updatedBy,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt
};

function nowIso(): string {
  return new Date().toISOString();
}

export const dayPlanRepository = {
  findById(database: DbClient, id: number): DayPlanRecord | undefined {
    return database.select().from(dayPlans).where(eq(dayPlans.id, id)).get();
  },

  findByUserAndDate(database: DbClient, userId: number, date: string): DayPlanRecord | undefined {
    return database.select().from(dayPlans).where(and(eq(dayPlans.userId, userId), eq(dayPlans.date, date))).get();
  },

  createForUserAndDate(database: DbClient, userId: number, date: string, actorUserId?: number): DayPlanRecord {
    const now = nowIso();
    return database
      .insert(dayPlans)
      .values({
        userId,
        date,
        status: "open",
        version: 1,
        createdBy: actorUserId ?? null,
        updatedBy: actorUserId ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
  },

  listTasks(database: DbClient, dayPlanId: number): DayPlanTaskRow[] {
    return database
      .select(taskSelect)
      .from(dayPlanTasks)
      .innerJoin(tasks, eq(dayPlanTasks.taskId, tasks.id))
      .where(eq(dayPlanTasks.ownerId, dayPlanId))
      .orderBy(asc(dayPlanTasks.position), asc(tasks.id))
      .all();
  },

  listEvents(database: DbClient, dayPlanId: number): DayPlanEventRow[] {
    return database
      .select(eventSelect)
      .from(dayPlanEvents)
      .innerJoin(events, eq(dayPlanEvents.eventId, events.id))
      .where(eq(dayPlanEvents.ownerId, dayPlanId))
      .orderBy(asc(dayPlanEvents.position), asc(events.startTime), asc(events.id))
      .all();
  },

  addTask(database: DbClient, dayPlanId: number, taskId: number, position: number): void {
    database.insert(dayPlanTasks).values({ ownerId: dayPlanId, taskId, position }).onConflictDoNothing().run();
  },

  updateTaskPosition(database: DbClient, dayPlanId: number, taskId: number, position: number): void {
    database.update(dayPlanTasks).set({ position }).where(and(eq(dayPlanTasks.ownerId, dayPlanId), eq(dayPlanTasks.taskId, taskId))).run();
  },

  removeTask(database: DbClient, dayPlanId: number, taskId: number): number {
    return database.delete(dayPlanTasks).where(and(eq(dayPlanTasks.ownerId, dayPlanId), eq(dayPlanTasks.taskId, taskId))).run().changes;
  },

  addEvent(database: DbClient, dayPlanId: number, eventId: number, position: number): void {
    database.insert(dayPlanEvents).values({ ownerId: dayPlanId, eventId, position }).onConflictDoNothing().run();
  },

  updateEventPosition(database: DbClient, dayPlanId: number, eventId: number, position: number): void {
    database.update(dayPlanEvents).set({ position }).where(and(eq(dayPlanEvents.ownerId, dayPlanId), eq(dayPlanEvents.eventId, eventId))).run();
  },

  removeEvent(database: DbClient, dayPlanId: number, eventId: number): number {
    return database.delete(dayPlanEvents).where(and(eq(dayPlanEvents.ownerId, dayPlanId), eq(dayPlanEvents.eventId, eventId))).run().changes;
  },

  listNotes(database: DbClient, dayPlanId: number): DayPlanNoteRow[] {
    return database
      .select(noteSelect)
      .from(dayPlanNotes)
      .innerJoin(notes, eq(dayPlanNotes.noteId, notes.id))
      .where(eq(dayPlanNotes.dayPlanId, dayPlanId))
      .orderBy(desc(notes.updatedAt), desc(notes.id))
      .all();
  },

  addNote(database: DbClient, dayPlanId: number, noteId: number): void {
    database.insert(dayPlanNotes).values({ dayPlanId, noteId }).onConflictDoNothing().run();
  },

  removeNote(database: DbClient, dayPlanId: number, noteId: number): number {
    return database.delete(dayPlanNotes).where(and(eq(dayPlanNotes.dayPlanId, dayPlanId), eq(dayPlanNotes.noteId, noteId))).run().changes;
  },

  listComments(database: DbClient, dayPlanId: number): DayPlanCommentRow[] {
    return database
      .select(commentSelect)
      .from(dayPlanComments)
      .innerJoin(comments, eq(dayPlanComments.commentId, comments.id))
      .where(eq(dayPlanComments.dayPlanId, dayPlanId))
      .orderBy(asc(comments.createdAt), asc(comments.id))
      .all();
  },

  addComment(database: DbClient, dayPlanId: number, commentId: number): void {
    database.insert(dayPlanComments).values({ dayPlanId, commentId }).onConflictDoNothing().run();
  },

  removeComment(database: DbClient, dayPlanId: number, commentId: number): number {
    return database.delete(dayPlanComments).where(and(eq(dayPlanComments.dayPlanId, dayPlanId), eq(dayPlanComments.commentId, commentId))).run().changes;
  },

  update(database: DbClient, dayPlanId: number, expectedVersion: number, values: Partial<Pick<DayPlanRecord, "status">>, actorUserId?: number): DayPlanRecord | undefined {
    const current = this.findById(database, dayPlanId);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(dayPlans)
      .set({
        ...values,
        version: current.version + 1,
        updatedBy: actorUserId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(dayPlans.id, dayPlanId))
      .returning()
      .get();
  }
};
