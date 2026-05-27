import type {
  CurrentUser,
  JournalChange,
  JournalContext,
  JournalContextRelation,
  JournalEntry,
  JournalListResponse,
  JournalObjectType,
  JournalOperation,
  JsonValue
} from "@taskmanager/shared-types";
import type { DbClient, DbSession } from "../db/client.js";
import {
  journalRepository,
  type JournalActorRecord,
  type JournalChangeCreateData,
  type JournalChangeRecord,
  type JournalContextCreateData,
  type JournalContextRecord,
  type JournalEntryCreateData,
  type JournalEntryFilters,
  type JournalEntryRecord
} from "../repositories/journal.repository.js";
import { badRequest } from "../utils/errors.js";

export interface JournalActor extends JournalActorRecord {}

export interface JournalObjectRef {
  type: JournalObjectType;
  id: number;
  label: string;
}

export interface JournalFieldDefinition<TRecord extends Record<string, unknown>> {
  key: keyof TRecord & string;
  label: string;
  format?: (value: unknown) => string | null;
}

export interface JournalWriteInput {
  operation: JournalOperation;
  object: JournalObjectRef;
  summary: string;
  actor?: JournalActor | null;
  changes?: JournalChangeCreateData[];
  contexts?: JournalContextCreateData[];
}

export interface JournalQueryInput {
  limit?: number;
  cursor?: number;
  q?: string;
  operation?: JournalOperation;
  objectType?: JournalObjectType;
  objectId?: number;
  actorUserId?: number;
  from?: string;
  to?: string;
}

const objectTypeLabels: Record<JournalObjectType, string> = {
  project: "Projekt",
  milestone: "Meilenstein",
  task: "Aufgabe",
  feature: "Feature",
  useCase: "Use Case",
  wikiPage: "Wiki-Seite",
  backlogItem: "Backlog-Eintrag",
  ticket: "Ticket",
  event: "Termin",
  dayPlan: "Tagesplan",
  tag: "Tag",
  note: "Notiz",
  attachment: "Datei",
  comment: "Kommentar"
};

const statusLabels: Record<string, string> = {
  active: "Aktiv",
  on_hold: "Pausiert",
  completed: "Abgeschlossen",
  archived: "Archiviert",
  todo: "Offen",
  open: "Offen",
  in_progress: "In Arbeit",
  in_review: "In Prüfung",
  done: "Erledigt",
  resolved: "Gelöst",
  closed: "Geschlossen",
  rejected: "Verworfen",
  draft: "Entwurf"
};

const priorityLabels: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend"
};

function parseJsonValue(value: string): JsonValue {
  return JSON.parse(value) as JsonValue;
}

function truncate(value: string, maxLength = 120): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear()).slice(-2);
  if (value.includes("T")) {
    const hour = String(parsed.getHours()).padStart(2, "0");
    const minute = String(parsed.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hour}:${minute}`;
  }
  return `${day}.${month}.${year}`;
}

export function createJournalActor(user: CurrentUser | null | undefined): JournalActor {
  if (!user) {
    return { actorUserId: null, actorName: "System" };
  }
  return { actorUserId: user.id, actorName: user.fullName || user.email };
}

export function objectTypeLabel(type: JournalObjectType): string {
  return objectTypeLabels[type];
}

export function makeJournalObject(type: JournalObjectType, id: number, label: string): JournalObjectRef {
  return { type, id, label: label.trim() || `${objectTypeLabel(type)} ${id}` };
}

export function makeJournalContext(object: JournalObjectRef, relation: JournalContextRelation): JournalContextCreateData {
  return { objectType: object.type, objectId: object.id, objectLabel: object.label, relation };
}

export function formatJournalValue(fieldKey: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (fieldKey.toLowerCase().includes("date") || fieldKey.toLowerCase().includes("time") || fieldKey.endsWith("At")) {
      return formatDate(value);
    }
    if (fieldKey.toLowerCase().includes("status")) {
      return statusLabels[value] ?? value;
    }
    if (fieldKey.toLowerCase().includes("priority")) {
      return priorityLabels[value] ?? value;
    }
    return truncate(stripHtml(value) || value);
  }
  return truncate(JSON.stringify(value));
}

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function valueChangeSummary(fieldLabel: string, oldValueLabel: string | null, newValueLabel: string | null): string {
  return `${fieldLabel}: ${oldValueLabel ?? "leer"} → ${newValueLabel ?? "leer"}`;
}

export function buildJournalChanges<TRecord extends Record<string, unknown>>(
  before: TRecord,
  after: TRecord,
  fields: Array<JournalFieldDefinition<TRecord>>
): JournalChangeCreateData[] {
  const changes: JournalChangeCreateData[] = [];
  for (const field of fields) {
    const oldValue = before[field.key];
    const newValue = after[field.key];
    if (JSON.stringify(oldValue ?? null) === JSON.stringify(newValue ?? null)) {
      continue;
    }
    const oldValueLabel = field.format ? field.format(oldValue) : formatJournalValue(field.key, oldValue);
    const newValueLabel = field.format ? field.format(newValue) : formatJournalValue(field.key, newValue);
    changes.push({
      fieldKey: field.key,
      fieldLabel: field.label,
      oldValue: toJsonValue(oldValue),
      oldValueLabel,
      newValue: toJsonValue(newValue),
      newValueLabel,
      summary: valueChangeSummary(field.label, oldValueLabel, newValueLabel)
    });
  }
  return changes;
}

export function buildUpdateSummary(object: JournalObjectRef, changes: JournalChangeCreateData[]): string {
  if (changes.length === 0) {
    return `${objectTypeLabel(object.type)} "${object.label}" wurde gespeichert; journalisierte Felder haben sich fachlich nicht geändert.`;
  }
  if (changes.length === 1) {
    const change = changes[0] as JournalChangeCreateData;
    return `${objectTypeLabel(object.type)} "${object.label}" hat ein neues ${change.fieldLabel}: ${change.oldValueLabel ?? "leer"} → ${change.newValueLabel ?? "leer"}.`;
  }
  return `${objectTypeLabel(object.type)} "${object.label}" wurde aktualisiert: ${changes.map((change) => change.summary).join("; ")}.`;
}

export function buildCreateSummary(object: JournalObjectRef): string {
  return `${objectTypeLabel(object.type)} "${object.label}" wurde erstellt.`;
}

export function buildDeleteSummary(object: JournalObjectRef): string {
  return `${objectTypeLabel(object.type)} "${object.label}" wurde gelöscht.`;
}

export function buildLinkSummary(source: JournalObjectRef, target: JournalObjectRef): string {
  return `${objectTypeLabel(source.type)} "${source.label}" wurde mit ${objectTypeLabel(target.type)} "${target.label}" verknüpft.`;
}

export function buildUnlinkSummary(source: JournalObjectRef, target: JournalObjectRef): string {
  return `${objectTypeLabel(source.type)} "${source.label}" wurde von ${objectTypeLabel(target.type)} "${target.label}" getrennt.`;
}

function normalizeContexts(object: JournalObjectRef, contexts: JournalContextCreateData[] | undefined): JournalContextCreateData[] {
  const allContexts = [makeJournalContext(object, "self"), ...(contexts ?? [])];
  const seen = new Set<string>();
  return allContexts.filter((context) => {
    const key = `${context.objectType}:${context.objectId}:${context.relation}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function recordJournalEntry(database: DbSession, input: JournalWriteInput): void {
  const summary = input.summary.trim();
  if (!summary) {
    throw badRequest("Journal summary is required");
  }
  const actor = input.actor ?? createJournalActor(null);
  const data: JournalEntryCreateData = {
    operation: input.operation,
    objectType: input.object.type,
    objectId: input.object.id,
    objectLabel: input.object.label,
    summary,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    changes: input.changes ?? [],
    contexts: normalizeContexts(input.object, input.contexts)
  };
  journalRepository.create(database, data);
}

function mapChange(record: JournalChangeRecord): JournalChange {
  return {
    id: record.id,
    fieldKey: record.fieldKey,
    fieldLabel: record.fieldLabel,
    oldValue: parseJsonValue(record.oldValueJson),
    oldValueLabel: record.oldValueLabel,
    newValue: parseJsonValue(record.newValueJson),
    newValueLabel: record.newValueLabel,
    summary: record.summary
  };
}

function mapContext(record: JournalContextRecord): JournalContext {
  return {
    id: record.id,
    objectType: record.objectType,
    objectId: record.objectId,
    objectLabel: record.objectLabel,
    relation: record.relation
  };
}

function mapEntry(record: JournalEntryRecord, changes: JournalChangeRecord[], contexts: JournalContextRecord[]): JournalEntry {
  return {
    id: record.id,
    operation: record.operation,
    objectType: record.objectType,
    objectId: record.objectId,
    objectLabel: record.objectLabel,
    summary: record.summary,
    actorUserId: record.actorUserId,
    actorName: record.actorName,
    createdAt: record.createdAt,
    changes: changes.filter((change) => change.journalEntryId === record.id).map(mapChange),
    contexts: contexts.filter((context) => context.journalEntryId === record.id).map(mapContext)
  };
}

function normalizeQuery(input: JournalQueryInput): JournalEntryFilters {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100) + 1;
  return {
    limit,
    cursor: input.cursor,
    q: input.q,
    operation: input.operation,
    objectType: input.objectType,
    objectId: input.objectId,
    actorUserId: input.actorUserId,
    from: input.from,
    to: input.to
  };
}

export function listJournalEntries(database: DbClient, input: JournalQueryInput): JournalListResponse {
  const filters = normalizeQuery(input);
  const requestedLimit = filters.limit - 1;
  const records = journalRepository.list(database, filters);
  const page = records.slice(0, requestedLimit);
  const ids = page.map((record) => record.id);
  const changes = journalRepository.listChanges(database, ids);
  const contexts = journalRepository.listContexts(database, ids);
  return {
    entries: page.map((record) => mapEntry(record, changes, contexts)),
    nextCursor: records.length > requestedLimit ? records[requestedLimit]?.id ?? null : null
  };
}

export function listObjectJournalEntries(database: DbClient, objectType: JournalObjectType, objectId: number, input: JournalQueryInput): JournalListResponse {
  return listJournalEntries(database, { ...input, objectType, objectId });
}
