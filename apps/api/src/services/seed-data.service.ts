import type {
  SeedRun,
  SeedRunCreateRequest,
  SeedRunDeletePreview,
  SeedRunDeleteResult,
  SeedRunSummary,
  SeedRunTableCount
} from "@taskmanager/shared-types";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import {
  BACKLOG_STATUSES,
  FEATURE_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TICKET_SEVERITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
  attachments,
  backlogItems,
  comments,
  events,
  features,
  notes,
  projectFeatures,
  projectNotes,
  projectTags,
  projects,
  seedRunItems,
  seedRuns,
  tags,
  taskFeatures,
  taskNotes,
  taskTags,
  taskUseCases,
  tasks,
  ticketNotes,
  ticketRelations,
  ticketTags,
  tickets,
  useCases,
  wikiPages
} from "../db/schema.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import {
  buildFilename,
  buildStoredContentPath,
  deleteContent,
  resolveContentPath,
  resolveStoredContentPath,
  writeContent
} from "./content.service.js";
import { nowIso } from "./helpers.js";

type SeedRunRecord = typeof seedRuns.$inferSelect;
type TaskRecord = typeof tasks.$inferSelect;
type TicketRecord = typeof tickets.$inferSelect;
type FeatureRecord = typeof features.$inferSelect;
type UseCaseRecord = typeof useCases.$inferSelect;
type NoteRecord = typeof notes.$inferSelect;
type BacklogRecord = typeof backlogItems.$inferSelect;

const VISUAL_SEED_TABLES = [
  "projects",
  "tasks",
  "tags",
  "features",
  "use_cases",
  "backlog_items",
  "wiki_pages",
  "notes",
  "comments",
  "events",
  "attachments",
  "project_tags",
  "task_tags",
  "tickets",
  "ticket_relations",
  "ticket_tags",
  "ticket_notes",
  "project_notes",
  "task_notes",
  "project_features",
  "task_features",
  "task_use_cases",
  "content_files",
  "upload_files"
] as const;

const PROJECT_COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#64748b"] as const;
const TASK_ASSIGNEES = ["Ada Lovelace", "Grace Hopper", "Alan Turing"] as const;
const EVENT_COLORS = ["#2563eb", "#16a34a", "#ca8a04"] as const;

function requiredAt<T>(items: readonly T[], index: number, label: string): T {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`${label} is missing at index ${index}`);
  }
  return value;
}

function wrappedAt<T>(items: readonly T[], index: number, label: string): T {
  if (items.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  return requiredAt(items, index % items.length, label);
}

function formatRunTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function formatHumanDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createRunId(date = new Date()): string {
  return `seed-${formatRunTimestamp(date)}-${randomUUID().slice(0, 8)}`;
}

function cleanLabel(input: SeedRunCreateRequest): string {
  const trimmed = input.label?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : `Visuelle Testdaten ${formatHumanDate(new Date())}`;
}

function parseSummary(value: string): SeedRunSummary | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const candidate = parsed as { totalRecords?: unknown; tableCounts?: unknown };
    if (typeof candidate.totalRecords !== "number" || !Number.isInteger(candidate.totalRecords) || !Array.isArray(candidate.tableCounts)) {
      return null;
    }
    const tableCounts = candidate.tableCounts
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }
        const count = item as { tableName?: unknown; count?: unknown };
        return typeof count.tableName === "string" && Number.isInteger(count.count)
          ? { tableName: count.tableName, count: count.count }
          : null;
      })
      .filter((item): item is SeedRunTableCount => item !== null);
    return { totalRecords: candidate.totalRecords, tableCounts };
  } catch {
    return null;
  }
}

function summarizeItems(database: DbClient, seedRunId: string): SeedRunSummary {
  const counts = new Map<string, number>();
  const rows = database
    .select({ tableName: seedRunItems.tableName })
    .from(seedRunItems)
    .where(eq(seedRunItems.seedRunId, seedRunId))
    .all();

  for (const row of rows) {
    counts.set(row.tableName, (counts.get(row.tableName) ?? 0) + 1);
  }

  const tableCounts = [...counts.entries()]
    .map(([tableName, count]) => ({ tableName, count }))
    .sort((left, right) => left.tableName.localeCompare(right.tableName, "en"));

  return {
    totalRecords: rows.length,
    tableCounts
  };
}

function mapSeedRun(database: DbClient, record: SeedRunRecord): SeedRun {
  return {
    id: record.id,
    label: record.label,
    scenario: "visual",
    createdAt: record.createdAt,
    summary: parseSummary(record.summaryJson) ?? summarizeItems(database, record.id)
  };
}

function ids<T extends { id: number }>(rows: T[]): number[] {
  return rows.map((row) => row.id);
}

function addCount(counts: Map<string, number>, tableName: string): void {
  counts.set(tableName, (counts.get(tableName) ?? 0) + 1);
}

function richTextDoc(text: string): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }]
      }
    ]
  });
}

function featureContent(label: string, status: string): string {
  return `# ${label}\n\nStatus: ${status}\n\nDiese Datei wurde automatisch als visuelle Testdatei erzeugt.`;
}

function wikiContent(label: string): string {
  return `# ${label}\n\nDiese Wiki-Seite gehört zu einem isolierten Seed-Run.`;
}

function writeSeedAttachment(seedRunId: string, kind: string, body: string): { filename: string; originalName: string; size: number } {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const filename = `${seedRunId}-${kind}-${randomUUID().slice(0, 8)}.txt`;
  const absolutePath = path.join(config.uploadDir, filename);
  fs.writeFileSync(absolutePath, body, "utf8");
  return {
    filename,
    originalName: `${kind}-testdaten.txt`,
    size: Buffer.byteLength(body, "utf8")
  };
}

function removeSeedAttachment(filename: string): void {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  fs.rmSync(path.join(config.uploadDir, filename), { force: true });
}

function tableCountsFromMap(counts: Map<string, number>): SeedRunTableCount[] {
  return [...counts.entries()]
    .map(([tableName, count]) => ({ tableName, count }))
    .sort((left, right) => left.tableName.localeCompare(right.tableName, "en"));
}

function externalCountForProjects(database: DbClient, seedRunId: string, projectIds: number[]): number {
  if (projectIds.length === 0) return 0;
  return (
    database.select({ id: tasks.id }).from(tasks).where(and(inArray(tasks.projectId, projectIds), or(isNull(tasks.seedRunId), ne(tasks.seedRunId, seedRunId)))).all().length +
    database.select({ id: tickets.id }).from(tickets).where(and(inArray(tickets.projectId, projectIds), or(isNull(tickets.seedRunId), ne(tickets.seedRunId, seedRunId)))).all().length +
    database
      .select({ id: backlogItems.id })
      .from(backlogItems)
      .where(and(inArray(backlogItems.projectId, projectIds), or(isNull(backlogItems.seedRunId), ne(backlogItems.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: wikiPages.id })
      .from(wikiPages)
      .where(and(inArray(wikiPages.projectId, projectIds), or(isNull(wikiPages.seedRunId), ne(wikiPages.seedRunId, seedRunId))))
      .all().length +
    database.select({ id: events.id }).from(events).where(and(inArray(events.projectId, projectIds), or(isNull(events.seedRunId), ne(events.seedRunId, seedRunId)))).all().length +
    database
      .select({ id: attachments.id })
      .from(attachments)
      .where(and(inArray(attachments.projectId, projectIds), or(isNull(attachments.seedRunId), ne(attachments.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ projectId: projectTags.projectId })
      .from(projectTags)
      .where(and(inArray(projectTags.projectId, projectIds), or(isNull(projectTags.seedRunId), ne(projectTags.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ projectId: projectNotes.projectId })
      .from(projectNotes)
      .where(and(inArray(projectNotes.projectId, projectIds), or(isNull(projectNotes.seedRunId), ne(projectNotes.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ projectId: projectFeatures.projectId })
      .from(projectFeatures)
      .where(and(inArray(projectFeatures.projectId, projectIds), or(isNull(projectFeatures.seedRunId), ne(projectFeatures.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.entityType, "project"), inArray(comments.entityId, projectIds), or(isNull(comments.seedRunId), ne(comments.seedRunId, seedRunId))))
      .all().length
  );
}

function externalCountForTasks(database: DbClient, seedRunId: string, taskIds: number[]): number {
  if (taskIds.length === 0) return 0;
  return (
    database.select({ id: tasks.id }).from(tasks).where(and(inArray(tasks.parentId, taskIds), or(isNull(tasks.seedRunId), ne(tasks.seedRunId, seedRunId)))).all().length +
    database.select({ id: events.id }).from(events).where(and(inArray(events.taskId, taskIds), or(isNull(events.seedRunId), ne(events.seedRunId, seedRunId)))).all().length +
    database
      .select({ id: attachments.id })
      .from(attachments)
      .where(and(inArray(attachments.taskId, taskIds), or(isNull(attachments.seedRunId), ne(attachments.seedRunId, seedRunId))))
      .all().length +
    database.select({ taskId: taskTags.taskId }).from(taskTags).where(and(inArray(taskTags.taskId, taskIds), or(isNull(taskTags.seedRunId), ne(taskTags.seedRunId, seedRunId)))).all().length +
    database.select({ taskId: taskNotes.taskId }).from(taskNotes).where(and(inArray(taskNotes.taskId, taskIds), or(isNull(taskNotes.seedRunId), ne(taskNotes.seedRunId, seedRunId)))).all().length +
    database
      .select({ taskId: taskFeatures.taskId })
      .from(taskFeatures)
      .where(and(inArray(taskFeatures.taskId, taskIds), or(isNull(taskFeatures.seedRunId), ne(taskFeatures.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ taskId: taskUseCases.taskId })
      .from(taskUseCases)
      .where(and(inArray(taskUseCases.taskId, taskIds), or(isNull(taskUseCases.seedRunId), ne(taskUseCases.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.entityType, "task"), inArray(comments.entityId, taskIds), or(isNull(comments.seedRunId), ne(comments.seedRunId, seedRunId))))
      .all().length
  );
}

function externalCountForTickets(database: DbClient, seedRunId: string, ticketIds: number[]): number {
  if (ticketIds.length === 0) return 0;
  return (
    database.select({ id: tickets.id }).from(tickets).where(and(inArray(tickets.parentId, ticketIds), or(isNull(tickets.seedRunId), ne(tickets.seedRunId, seedRunId)))).all().length +
    database
      .select({ id: attachments.id })
      .from(attachments)
      .where(and(inArray(attachments.ticketId, ticketIds), or(isNull(attachments.seedRunId), ne(attachments.seedRunId, seedRunId))))
      .all().length +
    database.select({ ticketId: ticketTags.ticketId }).from(ticketTags).where(and(inArray(ticketTags.ticketId, ticketIds), or(isNull(ticketTags.seedRunId), ne(ticketTags.seedRunId, seedRunId)))).all().length +
    database.select({ ticketId: ticketNotes.ticketId }).from(ticketNotes).where(and(inArray(ticketNotes.ticketId, ticketIds), or(isNull(ticketNotes.seedRunId), ne(ticketNotes.seedRunId, seedRunId)))).all().length +
    database
      .select({ sourceTicketId: ticketRelations.sourceTicketId })
      .from(ticketRelations)
      .where(and(inArray(ticketRelations.sourceTicketId, ticketIds), or(isNull(ticketRelations.seedRunId), ne(ticketRelations.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ targetTicketId: ticketRelations.targetTicketId })
      .from(ticketRelations)
      .where(and(inArray(ticketRelations.targetTicketId, ticketIds), or(isNull(ticketRelations.seedRunId), ne(ticketRelations.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.entityType, "ticket"), inArray(comments.entityId, ticketIds), or(isNull(comments.seedRunId), ne(comments.seedRunId, seedRunId))))
      .all().length
  );
}

function externalCountForTags(database: DbClient, seedRunId: string, tagIds: number[]): number {
  if (tagIds.length === 0) return 0;
  return (
    database.select({ tagId: projectTags.tagId }).from(projectTags).where(and(inArray(projectTags.tagId, tagIds), or(isNull(projectTags.seedRunId), ne(projectTags.seedRunId, seedRunId)))).all()
      .length +
    database.select({ tagId: taskTags.tagId }).from(taskTags).where(and(inArray(taskTags.tagId, tagIds), or(isNull(taskTags.seedRunId), ne(taskTags.seedRunId, seedRunId)))).all().length +
    database.select({ tagId: ticketTags.tagId }).from(ticketTags).where(and(inArray(ticketTags.tagId, tagIds), or(isNull(ticketTags.seedRunId), ne(ticketTags.seedRunId, seedRunId)))).all().length
  );
}

function externalCountForFeatures(database: DbClient, seedRunId: string, featureIds: number[]): number {
  if (featureIds.length === 0) return 0;
  return (
    database
      .select({ id: useCases.id })
      .from(useCases)
      .where(and(inArray(useCases.featureId, featureIds), or(isNull(useCases.seedRunId), ne(useCases.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: backlogItems.id })
      .from(backlogItems)
      .where(and(inArray(backlogItems.featureId, featureIds), or(isNull(backlogItems.seedRunId), ne(backlogItems.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: attachments.id })
      .from(attachments)
      .where(and(inArray(attachments.featureId, featureIds), or(isNull(attachments.seedRunId), ne(attachments.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ featureId: projectFeatures.featureId })
      .from(projectFeatures)
      .where(and(inArray(projectFeatures.featureId, featureIds), or(isNull(projectFeatures.seedRunId), ne(projectFeatures.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ featureId: taskFeatures.featureId })
      .from(taskFeatures)
      .where(and(inArray(taskFeatures.featureId, featureIds), or(isNull(taskFeatures.seedRunId), ne(taskFeatures.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.entityType, "feature"), inArray(comments.entityId, featureIds), or(isNull(comments.seedRunId), ne(comments.seedRunId, seedRunId))))
      .all().length
  );
}

function externalCountForUseCases(database: DbClient, seedRunId: string, useCaseIds: number[]): number {
  if (useCaseIds.length === 0) return 0;
  return (
    database
      .select({ id: backlogItems.id })
      .from(backlogItems)
      .where(and(inArray(backlogItems.useCaseId, useCaseIds), or(isNull(backlogItems.seedRunId), ne(backlogItems.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ useCaseId: taskUseCases.useCaseId })
      .from(taskUseCases)
      .where(and(inArray(taskUseCases.useCaseId, useCaseIds), or(isNull(taskUseCases.seedRunId), ne(taskUseCases.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.entityType, "useCase"), inArray(comments.entityId, useCaseIds), or(isNull(comments.seedRunId), ne(comments.seedRunId, seedRunId))))
      .all().length
  );
}

function externalCountForNotes(database: DbClient, seedRunId: string, noteIds: number[]): number {
  if (noteIds.length === 0) return 0;
  return (
    database.select({ noteId: projectNotes.noteId }).from(projectNotes).where(and(inArray(projectNotes.noteId, noteIds), or(isNull(projectNotes.seedRunId), ne(projectNotes.seedRunId, seedRunId)))).all()
      .length +
    database.select({ noteId: taskNotes.noteId }).from(taskNotes).where(and(inArray(taskNotes.noteId, noteIds), or(isNull(taskNotes.seedRunId), ne(taskNotes.seedRunId, seedRunId)))).all().length +
    database.select({ noteId: ticketNotes.noteId }).from(ticketNotes).where(and(inArray(ticketNotes.noteId, noteIds), or(isNull(ticketNotes.seedRunId), ne(ticketNotes.seedRunId, seedRunId)))).all().length
  );
}

function externalCountForBacklog(database: DbClient, seedRunId: string, backlogIds: number[]): number {
  if (backlogIds.length === 0) return 0;
  return database
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.entityType, "backlogItem"), inArray(comments.entityId, backlogIds), or(isNull(comments.seedRunId), ne(comments.seedRunId, seedRunId))))
    .all().length;
}

function externalCountForWiki(database: DbClient, seedRunId: string, wikiIds: number[]): number {
  if (wikiIds.length === 0) return 0;
  return (
    database
      .select({ id: wikiPages.id })
      .from(wikiPages)
      .where(and(inArray(wikiPages.parentId, wikiIds), or(isNull(wikiPages.seedRunId), ne(wikiPages.seedRunId, seedRunId))))
      .all().length +
    database
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.entityType, "wikiPage"), inArray(comments.entityId, wikiIds), or(isNull(comments.seedRunId), ne(comments.seedRunId, seedRunId))))
      .all().length
  );
}

function collectBlockingIssues(database: DbClient, seedRunId: string): string[] {
  const seedProjects = database.select({ id: projects.id }).from(projects).where(eq(projects.seedRunId, seedRunId)).all();
  const seedTasks = database.select({ id: tasks.id }).from(tasks).where(eq(tasks.seedRunId, seedRunId)).all();
  const seedTickets = database.select({ id: tickets.id }).from(tickets).where(eq(tickets.seedRunId, seedRunId)).all();
  const seedTags = database.select({ id: tags.id }).from(tags).where(eq(tags.seedRunId, seedRunId)).all();
  const seedFeatures = database.select({ id: features.id }).from(features).where(eq(features.seedRunId, seedRunId)).all();
  const seedUseCases = database.select({ id: useCases.id }).from(useCases).where(eq(useCases.seedRunId, seedRunId)).all();
  const seedNotes = database.select({ id: notes.id }).from(notes).where(eq(notes.seedRunId, seedRunId)).all();
  const seedBacklog = database.select({ id: backlogItems.id }).from(backlogItems).where(eq(backlogItems.seedRunId, seedRunId)).all();
  const seedWiki = database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.seedRunId, seedRunId)).all();

  const checks = [
    { label: "Projekte", count: externalCountForProjects(database, seedRunId, ids(seedProjects)) },
    { label: "Aufgaben", count: externalCountForTasks(database, seedRunId, ids(seedTasks)) },
    { label: "Tickets", count: externalCountForTickets(database, seedRunId, ids(seedTickets)) },
    { label: "Tags", count: externalCountForTags(database, seedRunId, ids(seedTags)) },
    { label: "Features", count: externalCountForFeatures(database, seedRunId, ids(seedFeatures)) },
    { label: "Use Cases", count: externalCountForUseCases(database, seedRunId, ids(seedUseCases)) },
    { label: "Notizen", count: externalCountForNotes(database, seedRunId, ids(seedNotes)) },
    { label: "Backlog", count: externalCountForBacklog(database, seedRunId, ids(seedBacklog)) },
    { label: "Wiki", count: externalCountForWiki(database, seedRunId, ids(seedWiki)) }
  ];

  return checks
    .filter((check) => check.count > 0)
    .map((check) => `${check.label}: ${check.count} externe Referenz(en) auf Testdaten gefunden.`);
}

function getSeedRunRecord(database: DbClient, id: string): SeedRunRecord {
  const run = database.select().from(seedRuns).where(eq(seedRuns.id, id)).get();
  if (!run) {
    throw notFound(`Seed run with id ${id} not found`);
  }
  return run;
}

export function listSeedRuns(database: DbClient): SeedRun[] {
  return database.select().from(seedRuns).orderBy(desc(seedRuns.createdAt)).all().map((run) => mapSeedRun(database, run));
}

export function getSeedRun(database: DbClient, id: string): SeedRun {
  return mapSeedRun(database, getSeedRunRecord(database, id));
}

export function createVisualSeedRun(database: DbClient, input: SeedRunCreateRequest): SeedRun {
  const runId = createRunId();
  const label = cleanLabel(input);
  const prefix = `[Testdaten ${runId.slice(-8)}]`;
  const now = nowIso();
  const createdContentPaths: string[] = [];
  const createdUploadFilenames: string[] = [];

  try {
    database.transaction((tx) => {
      const counts = new Map<string, number>();
      const recordItem = (tableName: string, recordKey: string): void => {
        tx.insert(seedRunItems).values({ seedRunId: runId, tableName, recordKey, createdAt: nowIso() }).run();
        addCount(counts, tableName);
      };

      tx.insert(seedRuns)
        .values({
          id: runId,
          label,
          scenario: "visual",
          summaryJson: "{}",
          createdAt: now
        })
        .run();

      const createdTags = tx
        .insert(tags)
        .values([
          { seedRunId: runId, name: `${prefix} Backend`, color: "#2563eb" },
          { seedRunId: runId, name: `${prefix} Frontend`, color: "#16a34a" },
          { seedRunId: runId, name: `${prefix} Kritisch`, color: "#dc2626" },
          { seedRunId: runId, name: `${prefix} Review`, color: "#ca8a04" },
          { seedRunId: runId, name: `${prefix} Dokumentation`, color: "#7c3aed" }
        ])
        .returning()
        .all();
      createdTags.forEach((tag) => recordItem("tags", String(tag.id)));

      const createdProjects = tx
        .insert(projects)
        .values(
          PROJECT_STATUSES.map((status, index) => ({
            seedRunId: runId,
            name: `${prefix} Projekt ${index + 1} ${status}`,
            description: `Visuelles Testprojekt mit Status ${status}.`,
            status,
            color: requiredAt(PROJECT_COLORS, index, "project color"),
            startDate: `2026-06-${String(3 + index).padStart(2, "0")}`,
            dueDate: `2026-07-${String(10 + index).padStart(2, "0")}`,
            createdAt: now,
            updatedAt: now
          }))
        )
        .returning()
        .all();
      createdProjects.forEach((project) => recordItem("projects", String(project.id)));

      for (const project of createdProjects) {
        for (const tag of createdTags.slice(0, 3)) {
          tx.insert(projectTags).values({ seedRunId: runId, projectId: project.id, tagId: tag.id }).run();
          recordItem("project_tags", `${project.id}:${tag.id}`);
        }
      }

      const createdFeatures: FeatureRecord[] = [];
      for (const [index, status] of FEATURE_STATUSES.entries()) {
        const slug = `${runId}-feature-${status}`;
        const feature = tx
          .insert(features)
          .values({
            seedRunId: runId,
            title: `${prefix} Feature ${index + 1} ${status}`,
            slug,
            status,
            description: `Feature-Testdatensatz mit Status ${status}.`,
            contentPath: null,
            sortOrder: index,
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        const filename = buildFilename("feature", feature.id, slug);
        const absolutePath = resolveContentPath("features", filename);
        const storedPath = buildStoredContentPath("features", filename);
        writeContent(absolutePath, featureContent(feature.title, status));
        createdContentPaths.push(absolutePath);
        tx.update(features).set({ contentPath: storedPath }).where(eq(features.id, feature.id)).run();
        createdFeatures.push({ ...feature, contentPath: storedPath });
        recordItem("features", String(feature.id));
        recordItem("content_files", storedPath);
      }

      for (const project of createdProjects) {
        for (const feature of createdFeatures.slice(0, 2)) {
          tx.insert(projectFeatures).values({ seedRunId: runId, projectId: project.id, featureId: feature.id }).run();
          recordItem("project_features", `${project.id}:${feature.id}`);
        }
      }

      const createdUseCases: UseCaseRecord[] = [];
      for (const [index, feature] of createdFeatures.entries()) {
        const status = wrappedAt(FEATURE_STATUSES, index + 1, "feature status");
        const slug = `${runId}-usecase-${index + 1}`;
        const useCase = tx
          .insert(useCases)
          .values({
            seedRunId: runId,
            featureId: feature.id,
            title: `${prefix} Use Case ${index + 1}`,
            slug,
            status,
            description: `Use Case für visuelle Tests, Status ${status}.`,
            contentPath: null,
            sortOrder: index,
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        const filename = buildFilename("usecase", useCase.id, slug);
        const absolutePath = resolveContentPath("usecases", filename);
        const storedPath = buildStoredContentPath("usecases", filename);
        writeContent(absolutePath, featureContent(useCase.title, status));
        createdContentPaths.push(absolutePath);
        tx.update(useCases).set({ contentPath: storedPath }).where(eq(useCases.id, useCase.id)).run();
        createdUseCases.push({ ...useCase, contentPath: storedPath });
        recordItem("use_cases", String(useCase.id));
        recordItem("content_files", storedPath);
      }

      const createdTasks: TaskRecord[] = [];
      for (const [projectIndex, project] of createdProjects.entries()) {
        for (const [statusIndex, status] of TASK_STATUSES.entries()) {
          const priority = wrappedAt(PRIORITIES, projectIndex + statusIndex, "priority");
          const task = tx
            .insert(tasks)
            .values({
              seedRunId: runId,
              projectId: project.id,
              parentId: null,
              title: `${prefix} Aufgabe ${projectIndex + 1}.${statusIndex + 1} ${status}`,
              description: `Aufgabe für Board-, Listen- und Detailtests mit Priorität ${priority}.`,
              status,
              priority,
              assignee: requiredAt(TASK_ASSIGNEES, statusIndex, "task assignee"),
              dueDate: `2026-06-${String(12 + projectIndex + statusIndex).padStart(2, "0")}`,
              position: (statusIndex + 1) * 1024,
              createdAt: now,
              updatedAt: now
            })
            .returning()
            .get();
          createdTasks.push(task);
          recordItem("tasks", String(task.id));

          if (status !== "done") {
            const subtask = tx
              .insert(tasks)
              .values({
                seedRunId: runId,
                projectId: project.id,
                parentId: task.id,
                title: `${prefix} Unteraufgabe ${projectIndex + 1}.${statusIndex + 1}`,
                description: "Unteraufgabe zur visuellen Prüfung verschachtelter Aufgaben.",
                status: "todo",
                priority,
                assignee: "Seed Team",
                dueDate: null,
                position: 512,
                createdAt: now,
                updatedAt: now
              })
              .returning()
              .get();
            createdTasks.push(subtask);
            recordItem("tasks", String(subtask.id));
          }
        }
      }

      for (const task of createdTasks.slice(0, 12)) {
        const tag = wrappedAt(createdTags, task.id, "tag");
        tx.insert(taskTags).values({ seedRunId: runId, taskId: task.id, tagId: tag.id }).run();
        recordItem("task_tags", `${task.id}:${tag.id}`);
      }

      const createdTickets: TicketRecord[] = [];
      for (const [projectIndex, project] of createdProjects.entries()) {
        const projectTickets: TicketRecord[] = [];
        for (let ticketIndex = 0; ticketIndex < 5; ticketIndex += 1) {
          const type = ticketIndex < 2 ? "bug" : wrappedAt(TICKET_TYPES, ticketIndex, "ticket type");
          const status = wrappedAt(TICKET_STATUSES, projectIndex + ticketIndex, "ticket status");
          const priority = wrappedAt(PRIORITIES, projectIndex + ticketIndex + 1, "ticket priority");
          const severity = type === "bug" ? wrappedAt(TICKET_SEVERITIES, ticketIndex, "ticket severity") : null;
          const resolvedAt = status === "resolved" || status === "closed" ? now : null;
          const ticket = tx
            .insert(tickets)
            .values({
              seedRunId: runId,
              projectId: project.id,
              parentId: null,
              type,
              title: `${prefix} Ticket ${projectIndex + 1}.${ticketIndex + 1} ${type}`,
              description: `Ticket-Testdatensatz mit Status ${status} und Priorität ${priority}.`,
              status,
              priority,
              severity,
              resolution: resolvedAt ? "fixed" : null,
              reporter: "Seed QA",
              assignee: wrappedAt(TASK_ASSIGNEES, ticketIndex, "ticket assignee"),
              environment: type === "bug" ? "Seed Browser 120 / Local" : null,
              affectedVersion: type === "bug" ? "seed-1.0" : null,
              dueDate: `2026-06-${String(18 + projectIndex + ticketIndex).padStart(2, "0")}`,
              resolvedAt,
              position: (ticketIndex + 1) * 1024,
              createdAt: now,
              updatedAt: now
            })
            .returning()
            .get();
          projectTickets.push(ticket);
          createdTickets.push(ticket);
          recordItem("tickets", String(ticket.id));

          const tag = wrappedAt(createdTags, ticketIndex, "ticket tag");
          tx.insert(ticketTags).values({ seedRunId: runId, ticketId: ticket.id, tagId: tag.id }).run();
          recordItem("ticket_tags", `${ticket.id}:${tag.id}`);
        }

        const parentTicket = requiredAt(projectTickets, 0, "parent ticket");
        const subTicket = tx
          .insert(tickets)
          .values({
            seedRunId: runId,
            projectId: project.id,
            parentId: parentTicket.id,
            type: parentTicket.type,
            title: `${prefix} Sub-Ticket ${projectIndex + 1}.1`,
            description: "Sub-Ticket zur visuellen Prüfung verschachtelter Tickets.",
            status: "open",
            priority: parentTicket.priority,
            severity: parentTicket.severity,
            resolution: null,
            reporter: "Seed QA",
            assignee: "Seed Team",
            environment: parentTicket.environment,
            affectedVersion: parentTicket.affectedVersion,
            dueDate: null,
            resolvedAt: null,
            position: 512,
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        createdTickets.push(subTicket);
        recordItem("tickets", String(subTicket.id));

        const blockedTicket = requiredAt(projectTickets, 1, "blocked ticket");
        tx.insert(ticketRelations)
          .values({
            seedRunId: runId,
            sourceTicketId: parentTicket.id,
            targetTicketId: blockedTicket.id,
            relationType: "blocks",
            createdAt: now
          })
          .run();
        recordItem("ticket_relations", `${parentTicket.id}:${blockedTicket.id}:blocks`);
      }

      for (const task of createdTasks.slice(0, 8)) {
        const feature = wrappedAt(createdFeatures, task.id, "feature");
        const useCase = wrappedAt(createdUseCases, task.id, "use case");
        tx.insert(taskFeatures).values({ seedRunId: runId, taskId: task.id, featureId: feature.id }).run();
        tx.insert(taskUseCases).values({ seedRunId: runId, taskId: task.id, useCaseId: useCase.id }).run();
        recordItem("task_features", `${task.id}:${feature.id}`);
        recordItem("task_use_cases", `${task.id}:${useCase.id}`);
      }

      const createdNotes: NoteRecord[] = [];
      for (const project of createdProjects.slice(0, 2)) {
        const note = tx
          .insert(notes)
          .values({
            seedRunId: runId,
            title: `${prefix} Projektnotiz ${project.id}`,
            contentJson: richTextDoc("Projektbezogene Testnotiz mit formatiertem Beispielinhalt."),
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        tx.insert(projectNotes).values({ seedRunId: runId, projectId: project.id, noteId: note.id }).run();
        createdNotes.push(note);
        recordItem("notes", String(note.id));
        recordItem("project_notes", `${project.id}:${note.id}`);
      }

      for (const task of createdTasks.slice(0, 2)) {
        const note = tx
          .insert(notes)
          .values({
            seedRunId: runId,
            title: `${prefix} Aufgabennotiz ${task.id}`,
            contentJson: richTextDoc("Aufgabenbezogene Testnotiz für Detailansichten."),
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        tx.insert(taskNotes).values({ seedRunId: runId, taskId: task.id, noteId: note.id }).run();
        createdNotes.push(note);
        recordItem("notes", String(note.id));
        recordItem("task_notes", `${task.id}:${note.id}`);
      }

      for (const ticket of createdTickets.slice(0, 2)) {
        const note = tx
          .insert(notes)
          .values({
            seedRunId: runId,
            title: `${prefix} Ticketnotiz ${ticket.id}`,
            contentJson: richTextDoc("Ticketbezogene Testnotiz für Detailansichten."),
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        tx.insert(ticketNotes).values({ seedRunId: runId, ticketId: ticket.id, noteId: note.id }).run();
        createdNotes.push(note);
        recordItem("notes", String(note.id));
        recordItem("ticket_notes", `${ticket.id}:${note.id}`);
      }

      const createdBacklog: BacklogRecord[] = [];
      for (const [index, status] of BACKLOG_STATUSES.entries()) {
        const item = tx
          .insert(backlogItems)
          .values({
            seedRunId: runId,
            projectId: wrappedAt(createdProjects, index, "project").id,
            featureId: wrappedAt(createdFeatures, index, "feature").id,
            useCaseId: wrappedAt(createdUseCases, index, "use case").id,
            title: `${prefix} Backlog ${index + 1} ${status}`,
            description: `Backlog-Testdatensatz mit Status ${status}.`,
            status,
            priority: wrappedAt(PRIORITIES, index, "priority"),
            sortOrder: index,
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        createdBacklog.push(item);
        recordItem("backlog_items", String(item.id));
      }

      const wikiRootSlug = `${runId}/uebersicht`;
      const wikiRootPath = buildStoredContentPath("wiki", `${runId}/uebersicht.md`);
      const wikiRootAbsolutePath = resolveContentPath("wiki", `${runId}/uebersicht.md`);
      const wikiRoot = tx
        .insert(wikiPages)
        .values({
          seedRunId: runId,
          parentId: null,
          projectId: requiredAt(createdProjects, 0, "project").id,
          title: `${prefix} Wiki Übersicht`,
          slug: wikiRootSlug,
          contentPath: wikiRootPath,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now
        })
        .returning()
        .get();
      writeContent(wikiRootAbsolutePath, wikiContent(wikiRoot.title));
      createdContentPaths.push(wikiRootAbsolutePath);
      recordItem("wiki_pages", String(wikiRoot.id));
      recordItem("content_files", wikiRootPath);

      const wikiChildPath = buildStoredContentPath("wiki", `${runId}/detail.md`);
      const wikiChildAbsolutePath = resolveContentPath("wiki", `${runId}/detail.md`);
      const wikiChild = tx
        .insert(wikiPages)
        .values({
          seedRunId: runId,
          parentId: wikiRoot.id,
          projectId: requiredAt(createdProjects, 1, "project").id,
          title: `${prefix} Wiki Detail`,
          slug: `${runId}/detail`,
          contentPath: wikiChildPath,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now
        })
        .returning()
        .get();
      writeContent(wikiChildAbsolutePath, wikiContent(wikiChild.title));
      createdContentPaths.push(wikiChildAbsolutePath);
      recordItem("wiki_pages", String(wikiChild.id));
      recordItem("content_files", wikiChildPath);

      const eventInputs = [
        { title: `${prefix} Termin Projekt`, projectId: requiredAt(createdProjects, 0, "project").id, taskId: null, startTime: "2026-06-15T09:00:00", endTime: "2026-06-15T11:00:00", isAllDay: false },
        { title: `${prefix} Termin Aufgabe`, projectId: requiredAt(createdProjects, 1, "project").id, taskId: requiredAt(createdTasks, 1, "task").id, startTime: "2026-06-16T13:00:00", endTime: "2026-06-16T14:30:00", isAllDay: false },
        { title: `${prefix} Ganztagestermin`, projectId: null, taskId: null, startTime: "2026-06-17T00:00:00", endTime: "2026-06-17T23:59:59", isAllDay: true }
      ];
      for (const [index, eventInput] of eventInputs.entries()) {
        const event = tx
          .insert(events)
          .values({
            seedRunId: runId,
            title: eventInput.title,
            description: "Kalender-Testdatum aus einem isolierten Seed-Run.",
            startTime: eventInput.startTime,
            endTime: eventInput.endTime,
            isAllDay: eventInput.isAllDay,
            color: requiredAt(EVENT_COLORS, index, "event color"),
            projectId: eventInput.projectId,
            taskId: eventInput.taskId,
            createdAt: now,
            updatedAt: now
          })
          .returning()
          .get();
        recordItem("events", String(event.id));
      }

      const commentTargets = [
        { entityType: "project" as const, entityId: requiredAt(createdProjects, 0, "project").id, taskId: null },
        { entityType: "task" as const, entityId: requiredAt(createdTasks, 0, "task").id, taskId: requiredAt(createdTasks, 0, "task").id },
        { entityType: "feature" as const, entityId: requiredAt(createdFeatures, 0, "feature").id, taskId: null },
        { entityType: "useCase" as const, entityId: requiredAt(createdUseCases, 0, "use case").id, taskId: null },
        { entityType: "backlogItem" as const, entityId: requiredAt(createdBacklog, 0, "backlog item").id, taskId: null },
        { entityType: "wikiPage" as const, entityId: wikiRoot.id, taskId: null },
        { entityType: "ticket" as const, entityId: requiredAt(createdTickets, 0, "ticket").id, taskId: null }
      ];
      for (const target of commentTargets) {
        const comment = tx
          .insert(comments)
          .values({
            seedRunId: runId,
            taskId: target.taskId,
            entityType: target.entityType,
            entityId: target.entityId,
            body: `${prefix} Kommentar für ${target.entityType}.`,
            createdAt: now
          })
          .returning()
          .get();
        recordItem("comments", String(comment.id));
      }

      const attachmentInputs = [
        { kind: "project", projectId: requiredAt(createdProjects, 0, "project").id, taskId: null, featureId: null, ticketId: null },
        { kind: "task", projectId: null, taskId: requiredAt(createdTasks, 0, "task").id, featureId: null, ticketId: null },
        { kind: "feature", projectId: null, taskId: null, featureId: requiredAt(createdFeatures, 0, "feature").id, ticketId: null },
        { kind: "ticket", projectId: null, taskId: null, featureId: null, ticketId: requiredAt(createdTickets, 0, "ticket").id }
      ];
      for (const input of attachmentInputs) {
        const file = writeSeedAttachment(runId, input.kind, `${prefix} Attachment für ${input.kind}.`);
        createdUploadFilenames.push(file.filename);
        const attachment = tx
          .insert(attachments)
          .values({
            seedRunId: runId,
            projectId: input.projectId,
            taskId: input.taskId,
            featureId: input.featureId,
            ticketId: input.ticketId,
            originalName: file.originalName,
            filename: file.filename,
            mimetype: "text/plain",
            size: file.size,
            createdAt: now
          })
          .returning()
          .get();
        recordItem("attachments", String(attachment.id));
        recordItem("upload_files", file.filename);
      }

      const summary: SeedRunSummary = {
        totalRecords: [...counts.values()].reduce((sum, count) => sum + count, 0),
        tableCounts: tableCountsFromMap(counts)
      };

      tx.update(seedRuns).set({ summaryJson: JSON.stringify(summary) }).where(eq(seedRuns.id, runId)).run();
    });

    return getSeedRun(database, runId);
  } catch (error) {
    for (const contentPath of createdContentPaths) {
      deleteContent(contentPath);
    }
    for (const filename of createdUploadFilenames) {
      removeSeedAttachment(filename);
    }
    throw error;
  }
}

export function previewSeedRunDelete(database: DbClient, id: string): SeedRunDeletePreview {
  const seedRun = getSeedRun(database, id);
  const blockingIssues = collectBlockingIssues(database, id);
  return {
    seedRun,
    canDelete: blockingIssues.length === 0,
    blockingIssues,
    tableCounts: summarizeItems(database, id).tableCounts
  };
}

export function deleteSeedRun(database: DbClient, id: string, confirmationId: string): SeedRunDeleteResult {
  if (confirmationId !== id) {
    throw badRequest("confirmationId must match the seed run id");
  }
  const preview = previewSeedRunDelete(database, id);
  if (!preview.canDelete) {
    throw conflict(`Seed run cannot be deleted: ${preview.blockingIssues.join(" | ")}`);
  }

  const contentPaths = [
    ...database.select({ contentPath: features.contentPath }).from(features).where(eq(features.seedRunId, id)).all(),
    ...database.select({ contentPath: useCases.contentPath }).from(useCases).where(eq(useCases.seedRunId, id)).all(),
    ...database.select({ contentPath: wikiPages.contentPath }).from(wikiPages).where(eq(wikiPages.seedRunId, id)).all()
  ]
    .map((row) => row.contentPath)
    .filter((contentPath): contentPath is string => contentPath !== null);
  const uploadFilenames = database.select({ filename: attachments.filename }).from(attachments).where(eq(attachments.seedRunId, id)).all().map((row) => row.filename);
  const deletedTables: SeedRunTableCount[] = [];
  const addDeleted = (tableName: string, count: number): void => {
    if (count > 0) {
      deletedTables.push({ tableName, count });
    }
  };

  database.transaction((tx) => {
    addDeleted("comments", tx.delete(comments).where(eq(comments.seedRunId, id)).run().changes);
    addDeleted("ticket_relations", tx.delete(ticketRelations).where(eq(ticketRelations.seedRunId, id)).run().changes);
    addDeleted("task_use_cases", tx.delete(taskUseCases).where(eq(taskUseCases.seedRunId, id)).run().changes);
    addDeleted("task_features", tx.delete(taskFeatures).where(eq(taskFeatures.seedRunId, id)).run().changes);
    addDeleted("project_features", tx.delete(projectFeatures).where(eq(projectFeatures.seedRunId, id)).run().changes);
    addDeleted("ticket_tags", tx.delete(ticketTags).where(eq(ticketTags.seedRunId, id)).run().changes);
    addDeleted("task_tags", tx.delete(taskTags).where(eq(taskTags.seedRunId, id)).run().changes);
    addDeleted("project_tags", tx.delete(projectTags).where(eq(projectTags.seedRunId, id)).run().changes);
    addDeleted("ticket_notes", tx.delete(ticketNotes).where(eq(ticketNotes.seedRunId, id)).run().changes);
    addDeleted("task_notes", tx.delete(taskNotes).where(eq(taskNotes.seedRunId, id)).run().changes);
    addDeleted("project_notes", tx.delete(projectNotes).where(eq(projectNotes.seedRunId, id)).run().changes);
    addDeleted("events", tx.delete(events).where(eq(events.seedRunId, id)).run().changes);
    addDeleted("attachments", tx.delete(attachments).where(eq(attachments.seedRunId, id)).run().changes);
    addDeleted("backlog_items", tx.delete(backlogItems).where(eq(backlogItems.seedRunId, id)).run().changes);
    addDeleted("notes", tx.delete(notes).where(eq(notes.seedRunId, id)).run().changes);

    const seedWikiPages = tx.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.seedRunId, id)).all().sort((left, right) => right.id - left.id);
    for (const page of seedWikiPages) {
      addDeleted("wiki_pages", tx.delete(wikiPages).where(eq(wikiPages.id, page.id)).run().changes);
    }

    addDeleted("task_use_cases", tx.delete(taskUseCases).where(eq(taskUseCases.seedRunId, id)).run().changes);
    addDeleted("tasks", tx.delete(tasks).where(eq(tasks.seedRunId, id)).run().changes);
    addDeleted("tickets", tx.delete(tickets).where(eq(tickets.seedRunId, id)).run().changes);
    addDeleted("use_cases", tx.delete(useCases).where(eq(useCases.seedRunId, id)).run().changes);
    addDeleted("features", tx.delete(features).where(eq(features.seedRunId, id)).run().changes);
    addDeleted("projects", tx.delete(projects).where(eq(projects.seedRunId, id)).run().changes);
    addDeleted("tags", tx.delete(tags).where(eq(tags.seedRunId, id)).run().changes);
    addDeleted("seed_run_items", tx.delete(seedRunItems).where(eq(seedRunItems.seedRunId, id)).run().changes);
    addDeleted("seed_runs", tx.delete(seedRuns).where(eq(seedRuns.id, id)).run().changes);
  });

  for (const contentPath of contentPaths) {
    deleteContent(resolveStoredContentPath(contentPath));
  }
  for (const filename of uploadFilenames) {
    removeSeedAttachment(filename);
  }

  return {
    seedRunId: id,
    deletedAt: nowIso(),
    deletedTables: tableCountsFromMap(deletedTables.reduce((counts, item) => counts.set(item.tableName, (counts.get(item.tableName) ?? 0) + item.count), new Map<string, number>())),
    deletedFiles: contentPaths.length + uploadFilenames.length
  };
}

export function getVisualSeedTableNames(): string[] {
  return [...VISUAL_SEED_TABLES];
}
