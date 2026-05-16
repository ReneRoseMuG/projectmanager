import type { Event, EventInput, EventUpdate } from "@taskmanager/shared-types";
import { and, eq, gte, lte } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { events, projects, tasks } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";

type EventRecord = typeof events.$inferSelect;

function mapEvent(record: EventRecord): Event {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    startTime: record.startTime,
    endTime: record.endTime,
    isAllDay: record.isAllDay,
    color: record.color,
    projectId: record.projectId,
    taskId: record.taskId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function ensureLinkedEntities(database: DbClient, projectId: number | null | undefined, taskId: number | null | undefined): void {
  if (projectId) {
    const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      throw notFound(`Project with id ${projectId} not found`);
    }
  }

  if (taskId) {
    const task = database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task) {
      throw notFound(`Task with id ${taskId} not found`);
    }
  }
}

function ensureDateRange(startTime: string, endTime: string): void {
  if (new Date(startTime).getTime() > new Date(endTime).getTime()) {
    throw badRequest("endTime must be after startTime");
  }
}

export function listEvents(database: DbClient, query: { from?: string; to?: string }): Event[] {
  const where =
    query.from && query.to
      ? and(gte(events.endTime, query.from), lte(events.startTime, query.to))
      : query.from
        ? gte(events.endTime, query.from)
        : query.to
          ? lte(events.startTime, query.to)
          : undefined;

  return database.select().from(events).where(where).all().map(mapEvent);
}

export function createEvent(database: DbClient, input: EventInput): Event {
  const title = requireNonEmpty(input.title, "title");
  ensureDateRange(input.startTime, input.endTime);
  ensureLinkedEntities(database, input.projectId, input.taskId);

  const now = nowIso();
  const created = database
    .insert(events)
    .values({
      title,
      description: cleanNullable(input.description) ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      isAllDay: input.isAllDay ?? false,
      color: input.color ?? "#6366f1",
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      createdAt: now,
      updatedAt: now
    })
    .returning()
    .get();

  return mapEvent(created);
}

export function getEvent(database: DbClient, id: number): Event {
  const event = database.select().from(events).where(eq(events.id, id)).get();
  if (!event) {
    throw notFound(`Event with id ${id} not found`);
  }

  return mapEvent(event);
}

export function updateEvent(database: DbClient, id: number, input: EventUpdate): Event {
  const current = database.select().from(events).where(eq(events.id, id)).get();
  if (!current) {
    throw notFound(`Event with id ${id} not found`);
  }

  const values: Partial<typeof events.$inferInsert> = {};

  if (input.title !== undefined) {
    values.title = requireNonEmpty(input.title, "title");
  }
  if (input.description !== undefined) {
    values.description = cleanNullable(input.description) ?? null;
  }
  if (input.startTime !== undefined) {
    values.startTime = input.startTime;
  }
  if (input.endTime !== undefined) {
    values.endTime = input.endTime;
  }
  if (input.isAllDay !== undefined) {
    values.isAllDay = input.isAllDay;
  }
  if (input.color !== undefined) {
    values.color = input.color;
  }
  if (input.projectId !== undefined) {
    values.projectId = input.projectId;
  }
  if (input.taskId !== undefined) {
    values.taskId = input.taskId;
  }

  if (Object.keys(values).length === 0) {
    throw badRequest("No event fields provided");
  }

  ensureDateRange(values.startTime ?? current.startTime, values.endTime ?? current.endTime);
  ensureLinkedEntities(database, values.projectId, values.taskId);
  values.updatedAt = nowIso();

  const updated = database.update(events).set(values).where(eq(events.id, id)).returning().get();
  return mapEvent(updated);
}

export function deleteEvent(database: DbClient, id: number): void {
  const result = database.delete(events).where(eq(events.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Event with id ${id} not found`);
  }
}
