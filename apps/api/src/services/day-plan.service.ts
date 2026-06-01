import type { CalendarEvent, DayPlan, DayPlanStatus, DayPlanUpdate, EventInput, EventOwner, TaskBoardItem, TaskInput } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { DAY_PLAN_STATUSES } from "../db/schema.js";
import type { tasks } from "../db/schema.js";
import { dayPlanRepository, type DayPlanEventRow, type DayPlanRecord, type DayPlanTaskRow } from "../repositories/day-plan.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { ensureCatalogEntryExists, resolveDefaultCatalogEntryKey } from "./catalogs.service.js";
import { createEvent, getEvent } from "./events.service.js";
import { cleanNullable, requireNonEmpty } from "./helpers.js";
import {
  buildCreateSummary,
  buildJournalChanges,
  buildLinkSummary,
  buildUnlinkSummary,
  buildUpdateSummary,
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor,
  type JournalFieldDefinition,
  type JournalObjectRef
} from "./journal.service.js";
import { mapTask } from "./tasks.service.js";
import { normalizeAssignableUserId } from "./users.service.js";

type TaskRecord = typeof tasks.$inferSelect;

const dayPlanJournalFields: Array<JournalFieldDefinition<DayPlanRecord>> = [
  { key: "status", label: "Status" }
];

function dayPlanObject(dayPlan: Pick<DayPlanRecord, "id" | "date">): JournalObjectRef {
  return makeJournalObject("dayPlan", dayPlan.id, `Persönliche Planung ${dayPlan.date}`);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === (month ?? 1) - 1 && parsed.getUTCDate() === day;
}

export function normalizeDayPlanDate(value: string): string {
  if (!isValidIsoDate(value)) {
    throw badRequest("date must be a valid YYYY-MM-DD value");
  }
  return value;
}

function ensureDayPlanStatus(value: string): DayPlanStatus {
  if (!(DAY_PLAN_STATUSES as readonly string[]).includes(value)) {
    throw badRequest("Invalid day plan status");
  }
  return value as DayPlanStatus;
}

function taskJournalObject(task: Pick<TaskRecord, "id" | "title">): JournalObjectRef {
  return makeJournalObject("task", task.id, task.title);
}

async function mapDayPlanTask(database: DbClient, row: DayPlanTaskRow): Promise<TaskBoardItem> {
  return {
    ...(await mapTask(database, row)),
    boardPosition: row.boardPosition
  };
}

async function mapDayPlanEvent(database: DbClient, row: DayPlanEventRow): Promise<CalendarEvent> {
  return getEvent(database, row.id);
}

async function mapDayPlan(database: DbClient, record: DayPlanRecord): Promise<DayPlan> {
  const taskRows = await dayPlanRepository.listTasks(database, record.id);
  const eventRows = await dayPlanRepository.listEvents(database, record.id);
  return {
    id: record.id,
    date: record.date,
    userId: record.userId,
    status: record.status as DayPlanStatus,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tasks: await Promise.all(taskRows.map((row) => mapDayPlanTask(database, row))),
    events: await Promise.all(eventRows.map((row) => mapDayPlanEvent(database, row)))
  };
}

async function nextTaskPosition(database: DbClient, dayPlanId: number): Promise<number> {
  return (await dayPlanRepository.listTasks(database, dayPlanId)).reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

async function nextEventPosition(database: DbClient, dayPlanId: number): Promise<number> {
  return (await dayPlanRepository.listEvents(database, dayPlanId)).reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

async function ensureTaskRecord(database: DbClient, taskId: number): Promise<TaskRecord> {
  const task = await taskRepository.findById(database, taskId);
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
  if (task.parentId !== null) {
    throw badRequest("Subtasks cannot be linked to day plans");
  }
  return task;
}

async function createTaskRecord(database: DbClient, input: TaskInput, actor?: JournalActor | null): Promise<TaskRecord> {
  const status = input.status ?? await resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  const priority = input.priority ?? await resolveDefaultCatalogEntryKey(database, "priority", "medium");
  await ensureCatalogEntryExists(database, "workStatus", status);
  await ensureCatalogEntryExists(database, "priority", priority);
  return taskRepository.create(
    database,
    {
      parentId: null,
      title: requireNonEmpty(input.title, "title"),
      description: cleanNullable(input.description) ?? null,
      status,
      priority,
      responsibleUserId: await normalizeAssignableUserId(database, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId"),
      dueDate: input.dueDate ?? null
    },
    actor?.actorUserId ?? undefined
  );
}

function withDayPlanOwner(input: EventInput, dayPlanId: number): EventInput {
  const owners = input.owners ?? [];
  const seen = new Set<string>();
  const merged: EventOwner[] = [];
  for (const owner of [...owners, { type: "dayPlan" as const, id: dayPlanId }]) {
    const key = `${owner.type}:${owner.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(owner);
    }
  }
  return { ...input, owners: merged };
}

async function requireExistingDayPlan(database: DbClient, userId: number, rawDate: string): Promise<DayPlanRecord> {
  const date = normalizeDayPlanDate(rawDate);
  const dayPlan = await dayPlanRepository.findByUserAndDate(database, userId, date);
  if (!dayPlan) {
    throw notFound("Day plan not found");
  }
  return dayPlan;
}

export async function ensureDayPlanOwnedByUser(database: DbClient, dayPlanId: number, userId: number): Promise<DayPlanRecord> {
  const dayPlan = await dayPlanRepository.findById(database, dayPlanId);
  if (!dayPlan || dayPlan.userId !== userId) {
    throw notFound("Day plan not found");
  }
  return dayPlan;
}

export async function findOrCreateDayPlanByUserAndDate(database: DbClient, userId: number, rawDate: string, actor?: JournalActor | null): Promise<DayPlan> {
  const date = normalizeDayPlanDate(rawDate);
  const existing = await dayPlanRepository.findByUserAndDate(database, userId, date);
  if (existing) {
    return mapDayPlan(database, existing);
  }

  const created = await database.transaction(async (tx) => {
    const dayPlan = await dayPlanRepository.createForUserAndDate(tx, userId, date, actor?.actorUserId ?? userId);
    const object = dayPlanObject(dayPlan);
    await recordJournalEntry(tx, {
      operation: "create",
      object,
      summary: buildCreateSummary(object),
      actor
    });
    return dayPlan;
  });

  return mapDayPlan(database, created);
}

export async function updateDayPlanForUserAndDate(database: DbClient, userId: number, rawDate: string, input: DayPlanUpdate, actor?: JournalActor | null): Promise<DayPlan> {
  const current = await dayPlanRepository.findByUserAndDate(database, userId, normalizeDayPlanDate(rawDate));
  if (!current) {
    throw notFound("Day plan not found");
  }

  const values: Partial<Pick<DayPlanRecord, "status">> = {};
  if (input.status !== undefined) {
    values.status = ensureDayPlanStatus(input.status);
  }
  if (Object.keys(values).length === 0) {
    throw badRequest("No day plan fields provided");
  }

  const updated = await database.transaction(async (tx) => {
    const dayPlan = await dayPlanRepository.update(tx, current.id, input.expectedVersion, values, actor?.actorUserId ?? userId);
    if (!dayPlan) {
      throw notFound("Day plan not found");
    }
    const object = dayPlanObject(dayPlan);
    const changes = buildJournalChanges(current, dayPlan, dayPlanJournalFields);
    await recordJournalEntry(tx, {
      operation: "update",
      object,
      summary: buildUpdateSummary(object, changes),
      actor,
      changes
    });
    return dayPlan;
  });

  return mapDayPlan(database, updated);
}

export async function createDayPlanTask(database: DbClient, userId: number, rawDate: string, input: TaskInput, actor?: JournalActor | null): Promise<TaskBoardItem> {
  const dayPlan = await findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const position = await nextTaskPosition(database, dayPlan.id);
  const created = await database.transaction(async (tx) => {
    const task = await createTaskRecord(tx, input, actor);
    await dayPlanRepository.addTask(tx, dayPlan.id, task.id, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = dayPlanObject(dayPlan);
    await recordJournalEntry(tx, {
      operation: "create",
      object: taskObject,
      summary: buildCreateSummary(taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return task;
  });

  return { ...(await mapTask(database, created)), boardPosition: position };
}

export async function linkDayPlanTask(database: DbClient, userId: number, rawDate: string, taskId: number, actor?: JournalActor | null): Promise<TaskBoardItem> {
  const dayPlan = await findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const task = await ensureTaskRecord(database, taskId);
  const existing = (await dayPlanRepository.listTasks(database, dayPlan.id)).find((row) => row.id === taskId);
  if (existing) {
    return mapDayPlanTask(database, existing);
  }

  const position = await nextTaskPosition(database, dayPlan.id);
  await database.transaction(async (tx) => {
    await dayPlanRepository.addTask(tx, dayPlan.id, task.id, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = dayPlanObject(dayPlan);
    await recordJournalEntry(tx, {
      operation: "link",
      object: taskObject,
      summary: buildLinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });

  return { ...(await mapTask(database, task)), boardPosition: position };
}

export async function unlinkDayPlanTask(database: DbClient, userId: number, rawDate: string, taskId: number, actor?: JournalActor | null): Promise<void> {
  const dayPlan = await requireExistingDayPlan(database, userId, rawDate);
  const task = await ensureTaskRecord(database, taskId);
  await database.transaction(async (tx) => {
    const changes = await dayPlanRepository.removeTask(tx, dayPlan.id, taskId);
    if (changes === 0) {
      throw notFound(`Task ${taskId} is not linked to day plan ${dayPlan.id}`);
    }
    const taskObject = taskJournalObject(task);
    const ownerObject = dayPlanObject(dayPlan);
    await recordJournalEntry(tx, {
      operation: "unlink",
      object: taskObject,
      summary: buildUnlinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export async function createDayPlanEvent(database: DbClient, userId: number, rawDate: string, input: EventInput, actor?: JournalActor | null): Promise<CalendarEvent> {
  const dayPlan = await findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const position = await nextEventPosition(database, dayPlan.id);
  const event = await createEvent(database, withDayPlanOwner(input, dayPlan.id), actor);
  await dayPlanRepository.updateEventPosition(database, dayPlan.id, event.id, position);
  return getEvent(database, event.id);
}

export async function linkDayPlanEvent(database: DbClient, userId: number, rawDate: string, eventId: number, actor?: JournalActor | null): Promise<CalendarEvent> {
  const dayPlan = await findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const event = await getEvent(database, eventId);
  const existing = (await dayPlanRepository.listEvents(database, dayPlan.id)).find((row) => row.id === eventId);
  if (existing) {
    return event;
  }

  const position = await nextEventPosition(database, dayPlan.id);
  await database.transaction(async (tx) => {
    await dayPlanRepository.addEvent(tx, dayPlan.id, eventId, position);
    const eventObject = makeJournalObject("event", event.id, event.title);
    const ownerObject = dayPlanObject(dayPlan);
    await recordJournalEntry(tx, {
      operation: "link",
      object: eventObject,
      summary: buildLinkSummary(ownerObject, eventObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });

  return getEvent(database, eventId);
}

export async function unlinkDayPlanEvent(database: DbClient, userId: number, rawDate: string, eventId: number, actor?: JournalActor | null): Promise<void> {
  const dayPlan = await requireExistingDayPlan(database, userId, rawDate);
  const event = await getEvent(database, eventId);
  await database.transaction(async (tx) => {
    const changes = await dayPlanRepository.removeEvent(tx, dayPlan.id, eventId);
    if (changes === 0) {
      throw notFound(`Event ${eventId} is not linked to day plan ${dayPlan.id}`);
    }
    const eventObject = makeJournalObject("event", event.id, event.title);
    const ownerObject = dayPlanObject(dayPlan);
    await recordJournalEntry(tx, {
      operation: "unlink",
      object: eventObject,
      summary: buildUnlinkSummary(ownerObject, eventObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}
