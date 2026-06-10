import { and, asc, desc, eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
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
  responsibleUserId: tasks.responsibleUserId,
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
  responsibleUserId: events.responsibleUserId,
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
  async findById(database: DbSession, id: number): Promise<DayPlanRecord | undefined> {
    return firstRow(await database.select().from(dayPlans).where(eq(dayPlans.id, id)));
  },

  async findByUserAndDate(database: DbSession, userId: number, date: string): Promise<DayPlanRecord | undefined> {
    return firstRow(await database.select().from(dayPlans).where(and(eq(dayPlans.userId, userId), eq(dayPlans.date, date))));
  },

  async createForUserAndDate(database: DbSession, userId: number, date: string, actorUserId?: number): Promise<DayPlanRecord> {
    const now = nowIso();
    const result = await database
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
      });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created day plan could not be loaded");
    }
    return created;
  },

  async listTasks(database: DbSession, dayPlanId: number): Promise<DayPlanTaskRow[]> {
    return database
      .select(taskSelect)
      .from(dayPlanTasks)
      .innerJoin(tasks, eq(dayPlanTasks.taskId, tasks.id))
      .where(eq(dayPlanTasks.ownerId, dayPlanId))
      .orderBy(asc(dayPlanTasks.position), asc(tasks.id));
  },

  async listEvents(database: DbSession, dayPlanId: number): Promise<DayPlanEventRow[]> {
    return database
      .select(eventSelect)
      .from(dayPlanEvents)
      .innerJoin(events, eq(dayPlanEvents.eventId, events.id))
      .where(eq(dayPlanEvents.ownerId, dayPlanId))
      .orderBy(asc(dayPlanEvents.position), asc(events.startTime), asc(events.id));
  },

  async addTask(database: DbSession, dayPlanId: number, taskId: number, position: number): Promise<void> {
    await database.insert(dayPlanTasks).ignore().values({ ownerId: dayPlanId, taskId, position });
  },

  async updateTaskPosition(database: DbSession, dayPlanId: number, taskId: number, position: number): Promise<void> {
    await database.update(dayPlanTasks).set({ position }).where(and(eq(dayPlanTasks.ownerId, dayPlanId), eq(dayPlanTasks.taskId, taskId)));
  },

  async removeTask(database: DbSession, dayPlanId: number, taskId: number): Promise<number> {
    return mutationAffectedRows(await database.delete(dayPlanTasks).where(and(eq(dayPlanTasks.ownerId, dayPlanId), eq(dayPlanTasks.taskId, taskId))));
  },

  async addEvent(database: DbSession, dayPlanId: number, eventId: number, position: number): Promise<void> {
    await database.insert(dayPlanEvents).ignore().values({ ownerId: dayPlanId, eventId, position });
  },

  async updateEventPosition(database: DbSession, dayPlanId: number, eventId: number, position: number): Promise<void> {
    await database.update(dayPlanEvents).set({ position }).where(and(eq(dayPlanEvents.ownerId, dayPlanId), eq(dayPlanEvents.eventId, eventId)));
  },

  async removeEvent(database: DbSession, dayPlanId: number, eventId: number): Promise<number> {
    return mutationAffectedRows(await database.delete(dayPlanEvents).where(and(eq(dayPlanEvents.ownerId, dayPlanId), eq(dayPlanEvents.eventId, eventId))));
  },

  async listNotes(database: DbSession, dayPlanId: number): Promise<DayPlanNoteRow[]> {
    return database
      .select(noteSelect)
      .from(dayPlanNotes)
      .innerJoin(notes, eq(dayPlanNotes.noteId, notes.id))
      .where(eq(dayPlanNotes.dayPlanId, dayPlanId))
      .orderBy(desc(notes.updatedAt), desc(notes.id));
  },

  async addNote(database: DbSession, dayPlanId: number, noteId: number): Promise<void> {
    await database.insert(dayPlanNotes).ignore().values({ dayPlanId, noteId });
  },

  async removeNote(database: DbSession, dayPlanId: number, noteId: number): Promise<number> {
    return mutationAffectedRows(await database.delete(dayPlanNotes).where(and(eq(dayPlanNotes.dayPlanId, dayPlanId), eq(dayPlanNotes.noteId, noteId))));
  },

  async listComments(database: DbSession, dayPlanId: number): Promise<DayPlanCommentRow[]> {
    return database
      .select(commentSelect)
      .from(dayPlanComments)
      .innerJoin(comments, eq(dayPlanComments.commentId, comments.id))
      .where(eq(dayPlanComments.dayPlanId, dayPlanId))
      .orderBy(...recencyOrder(comments));
  },

  async addComment(database: DbSession, dayPlanId: number, commentId: number): Promise<void> {
    await database.insert(dayPlanComments).ignore().values({ dayPlanId, commentId });
  },

  async removeComment(database: DbSession, dayPlanId: number, commentId: number): Promise<number> {
    return mutationAffectedRows(await database.delete(dayPlanComments).where(and(eq(dayPlanComments.dayPlanId, dayPlanId), eq(dayPlanComments.commentId, commentId))));
  },

  async update(database: DbSession, dayPlanId: number, expectedVersion: number, values: Partial<Pick<DayPlanRecord, "status">>, actorUserId?: number): Promise<DayPlanRecord | undefined> {
    const current = await this.findById(database, dayPlanId);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(dayPlans)
      .set({
        ...values,
        version: current.version + 1,
        updatedBy: actorUserId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(dayPlans.id, dayPlanId));
    return this.findById(database, dayPlanId);
  }
};

