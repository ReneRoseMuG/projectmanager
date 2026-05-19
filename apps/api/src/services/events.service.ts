import type { Event, EventInput, EventOwner, EventUpdate } from "@taskmanager/shared-types";
import { and, eq, gte, lte } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { events, projectEvents, projects, taskEvents, tasks } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";

type EventRecord = typeof events.$inferSelect;

function listEventOwners(database: DbClient, eventId: number): EventOwner[] {
  const projectOwners = database
    .select({ id: projectEvents.projectId })
    .from(projectEvents)
    .where(eq(projectEvents.eventId, eventId))
    .all()
    .map((row) => ({ type: "project" as const, id: row.id }));

  const taskOwners = database
    .select({ id: taskEvents.taskId })
    .from(taskEvents)
    .where(eq(taskEvents.eventId, eventId))
    .all()
    .map((row) => ({ type: "task" as const, id: row.id }));

  return [...projectOwners, ...taskOwners];
}

function mapEvent(database: DbClient, record: EventRecord): Event {
  return {
    id: record.id,
    owners: listEventOwners(database, record.id),
    title: record.title,
    description: record.description,
    startTime: record.startTime,
    endTime: record.endTime,
    isAllDay: record.isAllDay,
    color: record.color,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function normalizeOwners(owners: EventOwner[] | undefined): EventOwner[] {
  if (!owners) {
    return [];
  }

  const result: EventOwner[] = [];
  const seen = new Set<string>();
  for (const owner of owners) {
    if ((owner.type !== "project" && owner.type !== "task") || !Number.isInteger(owner.id) || owner.id < 1) {
      throw badRequest("Invalid event owner");
    }

    const key = `${owner.type}:${owner.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(owner);
    }
  }
  return result;
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

function ensureOwnersExist(database: DbClient, owners: EventOwner[]): void {
  for (const owner of owners) {
    if (owner.type === "project") {
      ensureProjectExists(database, owner.id);
    } else {
      ensureTaskExists(database, owner.id);
    }
  }
}

function insertEventOwner(database: DbClient, seedRunId: string | null, eventId: number, owner: EventOwner): void {
  if (owner.type === "project") {
    database.insert(projectEvents).values({ seedRunId, projectId: owner.id, eventId }).onConflictDoNothing().run();
    return;
  }

  database.insert(taskEvents).values({ seedRunId, taskId: owner.id, eventId }).onConflictDoNothing().run();
}

function replaceEventOwners(database: DbClient, event: EventRecord, owners: EventOwner[]): void {
  database.delete(projectEvents).where(eq(projectEvents.eventId, event.id)).run();
  database.delete(taskEvents).where(eq(taskEvents.eventId, event.id)).run();
  for (const owner of owners) {
    insertEventOwner(database, event.seedRunId, event.id, owner);
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

  return database.select().from(events).where(where).all().map((event) => mapEvent(database, event));
}

export function createEvent(database: DbClient, input: EventInput): Event {
  const title = requireNonEmpty(input.title, "title");
  const owners = normalizeOwners(input.owners);
  ensureDateRange(input.startTime, input.endTime);
  ensureOwnersExist(database, owners);

  const now = nowIso();
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const event = txDb
      .insert(events)
      .values({
        title,
        description: cleanNullable(input.description) ?? null,
        startTime: input.startTime,
        endTime: input.endTime,
        isAllDay: input.isAllDay ?? false,
        color: input.color ?? "#6366f1",
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();

    for (const owner of owners) {
      insertEventOwner(txDb, event.seedRunId, event.id, owner);
    }
    return event;
  });

  return mapEvent(database, created);
}

export function getEvent(database: DbClient, id: number): Event {
  const event = database.select().from(events).where(eq(events.id, id)).get();
  if (!event) {
    throw notFound(`Event with id ${id} not found`);
  }

  return mapEvent(database, event);
}

export function updateEvent(database: DbClient, id: number, input: EventUpdate): Event {
  const current = database.select().from(events).where(eq(events.id, id)).get();
  if (!current) {
    throw notFound(`Event with id ${id} not found`);
  }

  assertVersion(current.version, input.expectedVersion);

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

  const ownersSpecified = input.owners !== undefined;
  const owners = ownersSpecified ? normalizeOwners(input.owners) : [];
  if (Object.keys(values).length === 0 && !ownersSpecified) {
    throw badRequest("No event fields provided");
  }

  ensureDateRange(values.startTime ?? current.startTime, values.endTime ?? current.endTime);
  if (ownersSpecified) {
    ensureOwnersExist(database, owners);
  }

  const updated = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const event = txDb
      .update(events)
      .set({ ...values, version: current.version + 1, updatedAt: nowIso() })
      .where(eq(events.id, id))
      .returning()
      .get();

    if (ownersSpecified) {
      replaceEventOwners(txDb, event, owners);
    }
    return event;
  });

  return mapEvent(database, updated);
}

export function deleteEvent(database: DbClient, id: number): void {
  const result = database.delete(events).where(eq(events.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Event with id ${id} not found`);
  }
}
