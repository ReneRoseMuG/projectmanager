import type { CalendarEvent, DayPlan, DayPlanStatus, DayPlanUpdate, EventInput, EventOwner, TaskBoardItem, TaskInput } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { DAY_PLAN_STATUSES, tasks } from "../db/schema.js";
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

function mapDayPlanTask(database: DbClient, row: DayPlanTaskRow): TaskBoardItem {
  return {
    ...mapTask(database, row),
    boardPosition: row.boardPosition
  };
}

function mapDayPlanEvent(database: DbClient, row: DayPlanEventRow): CalendarEvent {
  return getEvent(database, row.id);
}

function mapDayPlan(database: DbClient, record: DayPlanRecord): DayPlan {
  return {
    id: record.id,
    date: record.date,
    userId: record.userId,
    status: record.status as DayPlanStatus,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tasks: dayPlanRepository.listTasks(database, record.id).map((row) => mapDayPlanTask(database, row)),
    events: dayPlanRepository.listEvents(database, record.id).map((row) => mapDayPlanEvent(database, row))
  };
}

function nextTaskPosition(database: DbClient, dayPlanId: number): number {
  return dayPlanRepository.listTasks(database, dayPlanId).reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

function nextEventPosition(database: DbClient, dayPlanId: number): number {
  return dayPlanRepository.listEvents(database, dayPlanId).reduce((current, row) => Math.max(current, row.boardPosition), 0) + 1024;
}

function ensureTaskRecord(database: DbClient, taskId: number): TaskRecord {
  const task = taskRepository.findById(database, taskId);
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
  if (task.parentId !== null) {
    throw badRequest("Subtasks cannot be linked to day plans");
  }
  return task;
}

function createTaskRecord(database: DbClient, input: TaskInput, actor?: JournalActor | null): TaskRecord {
  const status = input.status ?? resolveDefaultCatalogEntryKey(database, "workStatus", "active");
  const priority = input.priority ?? resolveDefaultCatalogEntryKey(database, "priority", "medium");
  ensureCatalogEntryExists(database, "workStatus", status);
  ensureCatalogEntryExists(database, "priority", priority);
  return taskRepository.create(
    database,
    {
      parentId: null,
      title: requireNonEmpty(input.title, "title"),
      description: cleanNullable(input.description) ?? null,
      status,
      priority,
      responsibleUserId: normalizeAssignableUserId(database, input.responsibleUserId ?? actor?.actorUserId ?? null, "responsibleUserId"),
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

function requireExistingDayPlan(database: DbClient, userId: number, rawDate: string): DayPlanRecord {
  const date = normalizeDayPlanDate(rawDate);
  const dayPlan = dayPlanRepository.findByUserAndDate(database, userId, date);
  if (!dayPlan) {
    throw notFound("Day plan not found");
  }
  return dayPlan;
}

export function ensureDayPlanOwnedByUser(database: DbClient, dayPlanId: number, userId: number): DayPlanRecord {
  const dayPlan = dayPlanRepository.findById(database, dayPlanId);
  if (!dayPlan || dayPlan.userId !== userId) {
    throw notFound("Day plan not found");
  }
  return dayPlan;
}

export function findOrCreateDayPlanByUserAndDate(database: DbClient, userId: number, rawDate: string, actor?: JournalActor | null): DayPlan {
  const date = normalizeDayPlanDate(rawDate);
  const existing = dayPlanRepository.findByUserAndDate(database, userId, date);
  if (existing) {
    return mapDayPlan(database, existing);
  }

  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const dayPlan = dayPlanRepository.createForUserAndDate(txDb, userId, date, actor?.actorUserId ?? userId);
    const object = dayPlanObject(dayPlan);
    recordJournalEntry(txDb, {
      operation: "create",
      object,
      summary: buildCreateSummary(object),
      actor
    });
    return dayPlan;
  });

  return mapDayPlan(database, created);
}

export function updateDayPlanForUserAndDate(database: DbClient, userId: number, rawDate: string, input: DayPlanUpdate, actor?: JournalActor | null): DayPlan {
  const current = dayPlanRepository.findByUserAndDate(database, userId, normalizeDayPlanDate(rawDate));
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

  const updated = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const dayPlan = dayPlanRepository.update(txDb, current.id, input.expectedVersion, values, actor?.actorUserId ?? userId);
    if (!dayPlan) {
      throw notFound("Day plan not found");
    }
    const object = dayPlanObject(dayPlan);
    const changes = buildJournalChanges(current, dayPlan, dayPlanJournalFields);
    recordJournalEntry(txDb, {
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

export function createDayPlanTask(database: DbClient, userId: number, rawDate: string, input: TaskInput, actor?: JournalActor | null): TaskBoardItem {
  const dayPlan = findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const position = nextTaskPosition(database, dayPlan.id);
  const created = database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const task = createTaskRecord(txDb, input, actor);
    dayPlanRepository.addTask(txDb, dayPlan.id, task.id, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = dayPlanObject(dayPlan);
    recordJournalEntry(txDb, {
      operation: "create",
      object: taskObject,
      summary: buildCreateSummary(taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return task;
  });

  return { ...mapTask(database, created), boardPosition: position };
}

export function linkDayPlanTask(database: DbClient, userId: number, rawDate: string, taskId: number, actor?: JournalActor | null): TaskBoardItem {
  const dayPlan = findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const task = ensureTaskRecord(database, taskId);
  const existing = dayPlanRepository.listTasks(database, dayPlan.id).find((row) => row.id === taskId);
  if (existing) {
    return mapDayPlanTask(database, existing);
  }

  const position = nextTaskPosition(database, dayPlan.id);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    dayPlanRepository.addTask(txDb, dayPlan.id, task.id, position);
    const taskObject = taskJournalObject(task);
    const ownerObject = dayPlanObject(dayPlan);
    recordJournalEntry(txDb, {
      operation: "link",
      object: taskObject,
      summary: buildLinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });

  return { ...mapTask(database, task), boardPosition: position };
}

export function unlinkDayPlanTask(database: DbClient, userId: number, rawDate: string, taskId: number, actor?: JournalActor | null): void {
  const dayPlan = requireExistingDayPlan(database, userId, rawDate);
  const task = ensureTaskRecord(database, taskId);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = dayPlanRepository.removeTask(txDb, dayPlan.id, taskId);
    if (changes === 0) {
      throw notFound(`Task ${taskId} is not linked to day plan ${dayPlan.id}`);
    }
    const taskObject = taskJournalObject(task);
    const ownerObject = dayPlanObject(dayPlan);
    recordJournalEntry(txDb, {
      operation: "unlink",
      object: taskObject,
      summary: buildUnlinkSummary(ownerObject, taskObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}

export function createDayPlanEvent(database: DbClient, userId: number, rawDate: string, input: EventInput, actor?: JournalActor | null): CalendarEvent {
  const dayPlan = findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const position = nextEventPosition(database, dayPlan.id);
  const event = createEvent(database, withDayPlanOwner(input, dayPlan.id), actor);
  dayPlanRepository.updateEventPosition(database, dayPlan.id, event.id, position);
  return getEvent(database, event.id);
}

export function linkDayPlanEvent(database: DbClient, userId: number, rawDate: string, eventId: number, actor?: JournalActor | null): CalendarEvent {
  const dayPlan = findOrCreateDayPlanByUserAndDate(database, userId, rawDate, actor);
  const event = getEvent(database, eventId);
  const existing = dayPlanRepository.listEvents(database, dayPlan.id).find((row) => row.id === eventId);
  if (existing) {
    return event;
  }

  const position = nextEventPosition(database, dayPlan.id);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    dayPlanRepository.addEvent(txDb, dayPlan.id, eventId, position);
    const eventObject = makeJournalObject("event", event.id, event.title);
    const ownerObject = dayPlanObject(dayPlan);
    recordJournalEntry(txDb, {
      operation: "link",
      object: eventObject,
      summary: buildLinkSummary(ownerObject, eventObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });

  return getEvent(database, eventId);
}

export function unlinkDayPlanEvent(database: DbClient, userId: number, rawDate: string, eventId: number, actor?: JournalActor | null): void {
  const dayPlan = requireExistingDayPlan(database, userId, rawDate);
  const event = getEvent(database, eventId);
  database.transaction((tx) => {
    const txDb = tx as unknown as DbClient;
    const changes = dayPlanRepository.removeEvent(txDb, dayPlan.id, eventId);
    if (changes === 0) {
      throw notFound(`Event ${eventId} is not linked to day plan ${dayPlan.id}`);
    }
    const eventObject = makeJournalObject("event", event.id, event.title);
    const ownerObject = dayPlanObject(dayPlan);
    recordJournalEntry(txDb, {
      operation: "unlink",
      object: eventObject,
      summary: buildUnlinkSummary(ownerObject, eventObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}
