import type { Event, EventInput, EventOwner, EventUpdate } from "@taskmanager/shared-types";
import { and, eq, gte, lte } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { dayPlanEvents, dayPlans, events, milestoneEvents, milestones, projectEvents, projects, taskEvents, tasks } from "../db/schema.js";
import { assertVersion } from "../repositories/base.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";
import {
  buildCreateSummary,
  buildDeleteSummary,
  buildJournalChanges,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";

type EventRecord = typeof events.$inferSelect;

const eventJournalFields: Array<JournalFieldDefinition<EventRecord>> = [
  { key: "title", label: "Titel" },
  { key: "description", label: "Beschreibung" },
  { key: "startTime", label: "Startzeit" },
  { key: "endTime", label: "Endzeit" },
  { key: "isAllDay", label: "Ganztägig" },
  { key: "color", label: "Farbe" },
  { key: "reminderMinutes", label: "Erinnerung" }
];

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

  const milestoneOwners = database
    .select({ id: milestoneEvents.milestoneId })
    .from(milestoneEvents)
    .where(eq(milestoneEvents.eventId, eventId))
    .all()
    .map((row) => ({ type: "milestone" as const, id: row.id }));

  const dayPlanOwners = database
    .select({ id: dayPlanEvents.ownerId })
    .from(dayPlanEvents)
    .where(eq(dayPlanEvents.eventId, eventId))
    .all()
    .map((row) => ({ type: "dayPlan" as const, id: row.id }));

  return [...projectOwners, ...taskOwners, ...milestoneOwners, ...dayPlanOwners];
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
    reminderMinutes: record.reminderMinutes,
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
    if ((owner.type !== "project" && owner.type !== "task" && owner.type !== "milestone" && owner.type !== "dayPlan") || !Number.isInteger(owner.id) || owner.id < 1) {
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

function ensureMilestoneExists(database: DbClient, milestoneId: number): void {
  const milestone = database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

function ensureDayPlanExists(database: DbClient, dayPlanId: number): void {
  const dayPlan = database.select({ id: dayPlans.id }).from(dayPlans).where(eq(dayPlans.id, dayPlanId)).get();
  if (!dayPlan) {
    throw notFound(`Day plan with id ${dayPlanId} not found`);
  }
}

function ensureOwnersExist(database: DbClient, owners: EventOwner[]): void {
  for (const owner of owners) {
    if (owner.type === "project") {
      ensureProjectExists(database, owner.id);
    } else if (owner.type === "task") {
      ensureTaskExists(database, owner.id);
    } else if (owner.type === "milestone") {
      ensureMilestoneExists(database, owner.id);
    } else {
      ensureDayPlanExists(database, owner.id);
    }
  }
}

function getOwnerJournalObject(database: DbClient, owner: EventOwner): JournalObjectRef {
  if (owner.type === "project") {
    const project = database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, owner.id)).get();
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)).get();
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "dayPlan") {
    const dayPlan = database.select({ id: dayPlans.id, date: dayPlans.date }).from(dayPlans).where(eq(dayPlans.id, owner.id)).get();
    return makeJournalObject("dayPlan", owner.id, dayPlan?.date ? `Persönliche Planung ${dayPlan.date}` : `Persönliche Planung ${owner.id}`);
  }
  const task = database.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)).get();
  return makeJournalObject("task", owner.id, task?.title ?? `Aufgabe ${owner.id}`);
}

function getOwnerJournalContexts(database: DbClient, owners: EventOwner[]) {
  return owners.map((owner) => makeJournalContext(getOwnerJournalObject(database, owner), "owner"));
}

function ownerLabels(database: DbClient, owners: EventOwner[]): string {
  return owners.map((owner) => getOwnerJournalObject(database, owner).label).join(", ");
}

function insertEventOwner(database: DbClient, eventId: number, owner: EventOwner): void {
  if (owner.type === "project") {
    database.insert(projectEvents).values({ projectId: owner.id, eventId }).onConflictDoNothing().run();
    return;
  }

  if (owner.type === "milestone") {
    database.insert(milestoneEvents).values({ milestoneId: owner.id, eventId }).onConflictDoNothing().run();
    return;
  }

  if (owner.type === "dayPlan") {
    database.insert(dayPlanEvents).values({ ownerId: owner.id, eventId }).onConflictDoNothing().run();
    return;
  }

  database.insert(taskEvents).values({ taskId: owner.id, eventId }).onConflictDoNothing().run();
}

function replaceEventOwners(database: DbClient, event: EventRecord, owners: EventOwner[]): void {
  database.delete(projectEvents).where(eq(projectEvents.eventId, event.id)).run();
  database.delete(taskEvents).where(eq(taskEvents.eventId, event.id)).run();
  database.delete(milestoneEvents).where(eq(milestoneEvents.eventId, event.id)).run();
  database.delete(dayPlanEvents).where(eq(dayPlanEvents.eventId, event.id)).run();
  for (const owner of owners) {
    insertEventOwner(database, event.id, owner);
  }
}

function ensureDateRange(startTime: string, endTime: string): void {
  if (new Date(startTime).getTime() > new Date(endTime).getTime()) {
    throw badRequest("endTime must be after startTime");
  }
}

function normalizeReminderMinutes(value: number | undefined): number {
  if (value === undefined) {
    return 60;
  }
  if (!Number.isInteger(value) || value < 1) {
    throw badRequest("reminderMinutes must be a positive integer");
  }
  return value;
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

export function createEvent(database: DbClient, input: EventInput, actor?: JournalActor | null): Event {
  const title = requireNonEmpty(input.title, "title");
  const owners = normalizeOwners(input.owners);
  const reminderMinutes = normalizeReminderMinutes(input.reminderMinutes);
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
        reminderMinutes,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();

    for (const owner of owners) {
      insertEventOwner(txDb, event.id, owner);
    }
    const journalObject = makeJournalObject("event", event.id, event.title);
    recordJournalEntry(txDb, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor,
      contexts: getOwnerJournalContexts(txDb, owners)
    });
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

export function updateEvent(database: DbClient, id: number, input: EventUpdate, actor?: JournalActor | null): Event {
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
  if (input.reminderMinutes !== undefined) {
    values.reminderMinutes = normalizeReminderMinutes(input.reminderMinutes);
  }

  const ownersSpecified = input.owners !== undefined;
  const owners = ownersSpecified ? normalizeOwners(input.owners) : [];
  const currentOwners = listEventOwners(database, id);
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
    const journalObject = makeJournalObject("event", event.id, event.title);
    const changes = buildJournalChanges(current, event, eventJournalFields);
    if (ownersSpecified && JSON.stringify(currentOwners) !== JSON.stringify(owners)) {
      const oldValueLabel = ownerLabels(txDb, currentOwners) || null;
      const newValueLabel = ownerLabels(txDb, owners) || null;
      changes.push({
        fieldKey: "owners",
        fieldLabel: "Zuordnung",
        oldValue: currentOwners,
        oldValueLabel,
        newValue: owners,
        newValueLabel,
        summary: `Zuordnung: ${oldValueLabel ?? "leer"} → ${newValueLabel ?? "leer"}`
      });
    }
    recordJournalEntry(txDb, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: getOwnerJournalContexts(txDb, ownersSpecified ? owners : currentOwners)
    });
    return event;
  });

  return mapEvent(database, updated);
}

export function deleteEvent(database: DbClient, id: number, actor?: JournalActor | null): void {
  const current = database.select().from(events).where(eq(events.id, id)).get();
  if (!current) {
    throw notFound(`Event with id ${id} not found`);
  }
  const currentOwners = listEventOwners(database, id);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const journalObject = makeJournalObject("event", current.id, current.title);
    recordJournalEntry(txDb, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: getOwnerJournalContexts(txDb, currentOwners)
    });
    const result = txDb.delete(events).where(eq(events.id, id)).run();
    if (result.changes === 0) {
      throw notFound(`Event with id ${id} not found`);
    }
  });
}
