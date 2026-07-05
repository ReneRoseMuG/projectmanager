import type { Event, EventInput, EventOwner, EventUpdate } from "@taskmanager/shared-types";
import { and, eq, gte, lte } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { dayPlanEvents, dayPlans, events, milestoneEvents, milestones, projectEvents, projects, taskEvents, tasks } from "../db/schema.js";
import { firstRow, insertId } from "../db/query-utils.js";
import { assertVersion } from "../repositories/base.repository.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
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
import { getUserOption, normalizeAssignableUserId } from "./users.service.js";

type EventRecord = typeof events.$inferSelect;

const eventJournalFields: Array<JournalFieldDefinition<EventRecord>> = [
  { key: "title", label: "Titel" },
  { key: "description", label: "Beschreibung" },
  { key: "startTime", label: "Startzeit" },
  { key: "endTime", label: "Endzeit" },
  { key: "isAllDay", label: "Ganztägig" },
  { key: "color", label: "Farbe" },
  { key: "reminderMinutes", label: "Erinnerung" },
  { key: "responsibleUserId", label: "Verantwortlich" }
];

async function listEventOwners(database: DbClient, eventId: number): Promise<EventOwner[]> {
  const projectOwners = (await database
    .select({ id: projectEvents.projectId })
    .from(projectEvents)
    .where(eq(projectEvents.eventId, eventId)))
    .map((row) => ({ type: "project" as const, id: row.id }));

  const taskOwners = (await database
    .select({ id: taskEvents.taskId })
    .from(taskEvents)
    .where(eq(taskEvents.eventId, eventId)))
    .map((row) => ({ type: "task" as const, id: row.id }));

  const milestoneOwners = (await database
    .select({ id: milestoneEvents.milestoneId })
    .from(milestoneEvents)
    .where(eq(milestoneEvents.eventId, eventId)))
    .map((row) => ({ type: "milestone" as const, id: row.id }));

  const dayPlanOwners = (await database
    .select({ id: dayPlanEvents.ownerId })
    .from(dayPlanEvents)
    .where(eq(dayPlanEvents.eventId, eventId)))
    .map((row) => ({ type: "dayPlan" as const, id: row.id }));

  return [...projectOwners, ...taskOwners, ...milestoneOwners, ...dayPlanOwners];
}

async function mapEvent(database: DbClient, record: EventRecord): Promise<Event> {
  return {
    id: record.id,
    owners: await listEventOwners(database, record.id),
    title: record.title,
    description: record.description,
    startTime: record.startTime,
    endTime: record.endTime,
    isAllDay: record.isAllDay,
    color: record.color,
    reminderMinutes: record.reminderMinutes,
    responsibleUserId: record.responsibleUserId,
    responsibleUser: await getUserOption(database, record.responsibleUserId),
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    origin: record.origin,
    readonly: record.readonly
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

async function ensureDayPlanExists(database: DbClient, dayPlanId: number): Promise<void> {
  const dayPlan = firstRow(await database.select({ id: dayPlans.id }).from(dayPlans).where(eq(dayPlans.id, dayPlanId)));
  if (!dayPlan) {
    throw notFound(`Day plan with id ${dayPlanId} not found`);
  }
}

async function ensureOwnersExist(database: DbClient, owners: EventOwner[]): Promise<void> {
  for (const owner of owners) {
    if (owner.type === "project") {
      await ensureProjectExists(database, owner.id);
    } else if (owner.type === "task") {
      await ensureTaskExists(database, owner.id);
    } else if (owner.type === "milestone") {
      await ensureMilestoneExists(database, owner.id);
    } else {
      await ensureDayPlanExists(database, owner.id);
    }
  }
}

async function getOwnerJournalObject(database: DbClient, owner: EventOwner): Promise<JournalObjectRef> {
  if (owner.type === "project") {
    const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, owner.id)));
    return makeJournalObject("project", owner.id, project?.name ?? `Projekt ${owner.id}`);
  }
  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)));
    return makeJournalObject("milestone", owner.id, milestone?.name ?? `Meilenstein ${owner.id}`);
  }
  if (owner.type === "dayPlan") {
    const dayPlan = firstRow(await database.select({ id: dayPlans.id, date: dayPlans.date }).from(dayPlans).where(eq(dayPlans.id, owner.id)));
    return makeJournalObject("dayPlan", owner.id, dayPlan?.date ? `Persönliche Planung ${dayPlan.date}` : `Persönliche Planung ${owner.id}`);
  }
  const task = firstRow(await database.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)));
  return makeJournalObject("task", owner.id, task?.title ?? `Aufgabe ${owner.id}`);
}

async function getOwnerJournalContexts(database: DbClient, owners: EventOwner[]) {
  return Promise.all(owners.map(async (owner) => makeJournalContext(await getOwnerJournalObject(database, owner), "owner")));
}

async function ownerLabels(database: DbClient, owners: EventOwner[]): Promise<string> {
  const labels = await Promise.all(owners.map(async (owner) => (await getOwnerJournalObject(database, owner)).label));
  return labels.join(", ");
}

async function insertEventOwner(database: DbClient, eventId: number, owner: EventOwner): Promise<void> {
  if (owner.type === "project") {
    await database.insert(projectEvents).ignore().values({ projectId: owner.id, eventId });
    return;
  }

  if (owner.type === "milestone") {
    await database.insert(milestoneEvents).ignore().values({ milestoneId: owner.id, eventId });
    return;
  }

  if (owner.type === "dayPlan") {
    await database.insert(dayPlanEvents).ignore().values({ ownerId: owner.id, eventId });
    return;
  }

  await database.insert(taskEvents).ignore().values({ taskId: owner.id, eventId });
}

async function replaceEventOwners(database: DbClient, event: EventRecord, owners: EventOwner[]): Promise<void> {
  await database.delete(projectEvents).where(eq(projectEvents.eventId, event.id));
  await database.delete(taskEvents).where(eq(taskEvents.eventId, event.id));
  await database.delete(milestoneEvents).where(eq(milestoneEvents.eventId, event.id));
  await database.delete(dayPlanEvents).where(eq(dayPlanEvents.eventId, event.id));
  for (const owner of owners) {
    await insertEventOwner(database, event.id, owner);
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

export async function listEvents(database: DbClient, query: { from?: string; to?: string }): Promise<Event[]> {
  const where =
    query.from && query.to
      ? and(gte(events.endTime, query.from), lte(events.startTime, query.to))
      : query.from
        ? gte(events.endTime, query.from)
        : query.to
          ? lte(events.startTime, query.to)
          : undefined;

  const rows = await database.select().from(events).where(where);
  return Promise.all(rows.map((event) => mapEvent(database, event)));
}

export async function createEvent(database: DbClient, input: EventInput, actor?: JournalActor | null): Promise<Event> {
  const title = requireNonEmpty(input.title, "title");
  const owners = normalizeOwners(input.owners);
  const reminderMinutes = normalizeReminderMinutes(input.reminderMinutes);
  ensureDateRange(input.startTime, input.endTime);
  await ensureOwnersExist(database, owners);

  const now = nowIso();
  const created = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const eventId = insertId(await txDb
      .insert(events)
      .values({
        title,
        description: cleanNullable(input.description) ?? null,
        startTime: input.startTime,
        endTime: input.endTime,
        isAllDay: input.isAllDay ?? false,
        color: input.color ?? "#6366f1",
        reminderMinutes,
        responsibleUserId: await normalizeAssignableUserId(txDb, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId"),
        createdBy: actor?.actorUserId ?? null,
        updatedBy: actor?.actorUserId ?? null,
        createdAt: now,
        updatedAt: now
      })
    );

    const inserted = firstRow(await txDb.select().from(events).where(eq(events.id, eventId)));
    if (!inserted) {
      throw new Error("Created event could not be loaded");
    }

    for (const owner of owners) {
      await insertEventOwner(txDb, inserted.id, owner);
    }
    const journalObject = makeJournalObject("event", inserted.id, inserted.title);
    await recordJournalEntry(txDb, {
      operation: "create",
      object: journalObject,
      summary: buildCreateSummary(journalObject),
      actor,
      contexts: await getOwnerJournalContexts(txDb, owners)
    });
    return inserted;
  });

  return mapEvent(database, created);
}

export async function getEvent(database: DbClient, id: number): Promise<Event> {
  const event = firstRow(await database.select().from(events).where(eq(events.id, id)));
  if (!event) {
    throw notFound(`Event with id ${id} not found`);
  }

  return mapEvent(database, event);
}

export async function updateEvent(database: DbClient, id: number, input: EventUpdate, actor?: JournalActor | null): Promise<Event> {
  const current = firstRow(await database.select().from(events).where(eq(events.id, id)));
  if (!current) {
    throw notFound(`Event with id ${id} not found`);
  }
  if (current.readonly) {
    throw forbidden("Importierte Kalender-Termine sind schreibgeschützt und können nicht bearbeitet werden.");
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
  if (input.responsibleUserId !== undefined) {
    values.responsibleUserId = await normalizeAssignableUserId(database, input.responsibleUserId, "responsibleUserId");
  }

  const ownersSpecified = input.owners !== undefined;
  const owners = ownersSpecified ? normalizeOwners(input.owners) : [];
  const currentOwners = await listEventOwners(database, id);
  if (Object.keys(values).length === 0 && !ownersSpecified) {
    throw badRequest("No event fields provided");
  }

  ensureDateRange(values.startTime ?? current.startTime, values.endTime ?? current.endTime);
  if (ownersSpecified) {
    await ensureOwnersExist(database, owners);
  }

  const updated = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    await txDb
      .update(events)
      .set({ ...values, version: current.version + 1, updatedBy: actor?.actorUserId ?? null, updatedAt: nowIso() })
      .where(eq(events.id, id));

    const event = firstRow(await txDb.select().from(events).where(eq(events.id, id)));
    if (!event) {
      throw notFound(`Event with id ${id} not found`);
    }

    if (ownersSpecified) {
      await replaceEventOwners(txDb, event, owners);
    }
    const journalObject = makeJournalObject("event", event.id, event.title);
    const changes = buildJournalChanges(current, event, eventJournalFields);
    if (ownersSpecified && JSON.stringify(currentOwners) !== JSON.stringify(owners)) {
      const oldValueLabel = await ownerLabels(txDb, currentOwners) || null;
      const newValueLabel = await ownerLabels(txDb, owners) || null;
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
    await recordJournalEntry(txDb, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      actor,
      changes,
      contexts: await getOwnerJournalContexts(txDb, ownersSpecified ? owners : currentOwners)
    });
    return event;
  });

  return mapEvent(database, updated);
}

export async function deleteEvent(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const current = firstRow(await database.select().from(events).where(eq(events.id, id)));
  if (!current) {
    throw notFound(`Event with id ${id} not found`);
  }
  if (current.readonly) {
    throw forbidden("Importierte Kalender-Termine sind schreibgeschützt und können nicht gelöscht werden.");
  }
  const currentOwners = await listEventOwners(database, id);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbClient;
    const journalObject = makeJournalObject("event", current.id, current.title);
    await recordJournalEntry(txDb, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: await getOwnerJournalContexts(txDb, currentOwners)
    });
    await txDb.delete(events).where(eq(events.id, id));
  });
}
