import type {
  Priority,
  WikiImportAction,
  WikiImportItemResult,
  WikiImportReport,
  WikiImportRunRequest,
  WikiImportSummary
} from "@taskmanager/shared-types";
import { and, eq, isNull } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import type { DbClient } from "../db/client.js";
import { features, projectFeatures, projects, taskFeatures, taskUseCases, tasks, useCases } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import {
  buildFilename,
  buildStoredContentPath,
  resolveContentPath,
  resolveStoredContentPath,
  writeContent
} from "./content.service.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";

interface ParsedWiki {
  sourcePath: string;
  features: ParsedFeature[];
  useCases: ParsedUseCase[];
  tasks: ParsedTask[];
  warnings: WikiImportItemResult[];
}

interface ParsedFeature {
  title: string;
  slug: string;
  description: string | null;
  content: string;
  sortOrder: number;
  sourcePath: string;
  featureCode: string | null;
}

interface ParsedUseCase {
  featureSlug: string;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  sortOrder: number;
  sourcePath: string;
}

interface ParsedTask {
  title: string;
  importKey: string;
  description: string;
  priority: Priority;
  sourcePath: string;
  featureSlugs: string[];
  useCaseSlugs: string[];
}

interface StoredFeature {
  id: number;
  slug: string;
  contentPath: string | null;
}

interface StoredUseCase {
  id: number;
  featureId: number;
  slug: string;
  contentPath: string | null;
}

interface StoredTask {
  id: number;
  projectId: number;
  importKey: string | null;
}

const MARKDOWN_LINK_TARGET_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;

function emptySummary(): WikiImportSummary {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
    warnings: 0,
    errors: 0
  };
}

function addResult(report: WikiImportReport, result: WikiImportItemResult): void {
  report.items.push(result);
  if (result.action === "created") {
    report.summary.created += 1;
  } else if (result.action === "updated") {
    report.summary.updated += 1;
  } else if (result.action === "skipped") {
    report.summary.skipped += 1;
  } else if (result.action === "warning") {
    report.summary.warnings += 1;
  } else {
    report.summary.errors += 1;
  }
}

function normalizePathSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "import";
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function relativeSourcePath(root: string, target: string): string {
  return toPosixPath(path.relative(root, target));
}

function markdownTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return cleanNullable(match?.[1]) ?? fallback;
}

function markdownSection(content: string, headings: string[]): string {
  const wanted = new Set(headings.map((heading) => heading.toLowerCase()));
  const lines = content.split(/\r?\n/);
  let collecting = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (heading) {
      if (collecting) {
        break;
      }
      collecting = wanted.has((heading[2] ?? "").toLowerCase());
      continue;
    }

    if (collecting) {
      sectionLines.push(line);
    }
  }

  return sectionLines.join("\n").trim();
}

function firstParagraph(content: string): string | null {
  const paragraphs = content.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    const cleaned = paragraph
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("|") && !line.startsWith("- "))
      .join(" ")
      .trim();

    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

function descriptionFromSection(content: string, headings: string[]): string | null {
  return firstParagraph(markdownSection(content, headings)) ?? firstParagraph(content);
}

function numberFromSlug(slug: string): number {
  const match = slug.match(/^(?:ft|uc)-(\d+)(?:-(\d+))?/i);
  if (!match) {
    return 0;
  }

  const major = Number(match[1] ?? "0");
  const minor = match[2] ? Number(match[2]) : 0;
  return Number.isFinite(major) ? major * 100 + minor : 0;
}

function featureCodeFromSlug(slug: string): string | null {
  const match = slug.match(/^ft-(\d+)/i);
  return match ? `ft-${(match[1] ?? "").padStart(2, "0")}` : null;
}

function parsePriority(content: string): Priority {
  const normalized = content.toLowerCase();
  if (normalized.match(/\|\s*`?offen`?\s*\|\s*hoch\s*\|/) || normalized.includes("dringlichkeit | hoch")) {
    return "high";
  }
  if (normalized.match(/\|\s*`?offen`?\s*\|\s*niedrig\s*\|/) || normalized.includes("dringlichkeit | niedrig")) {
    return "low";
  }
  if (normalized.includes("dringend") || normalized.includes("urgent")) {
    return "urgent";
  }

  return "medium";
}

function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => path.join(dir, entry.name))
    .sort((first, second) => first.localeCompare(second));
}

function readMarkdown(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function parseLinkTargets(content: string): string[] {
  const targets: string[] = [];
  for (const match of content.matchAll(MARKDOWN_LINK_TARGET_PATTERN)) {
    const rawTarget = match[1]?.trim();
    if (!rawTarget || rawTarget.startsWith("#") || rawTarget.match(/^[a-z][a-z0-9+.-]*:/i)) {
      continue;
    }
    targets.push(toPosixPath(rawTarget.split("#")[0] ?? ""));
  }

  return targets;
}

function parseTaskRelations(content: string, featureCodeToSlug: Map<string, string>, useCaseSlugToFeatureSlug: Map<string, string>) {
  const featureSlugs = new Set<string>();
  const useCaseSlugs = new Set<string>();

  for (const target of parseLinkTargets(content)) {
    const featureMatch = target.match(/features\/(ft-[^/]+)/i);
    if (featureMatch) {
      featureSlugs.add(normalizePathSegment(featureMatch[1] ?? ""));
    }

    const useCaseMatch = target.match(/features\/[^/]+\/use-cases\/(uc-[^/#)]+)\.md/i);
    if (useCaseMatch) {
      const useCaseSlug = normalizePathSegment(useCaseMatch[1] ?? "");
      useCaseSlugs.add(useCaseSlug);
      const featureSlug = useCaseSlugToFeatureSlug.get(useCaseSlug);
      if (featureSlug) {
        featureSlugs.add(featureSlug);
      }
    }
  }

  for (const match of content.matchAll(/\bFT\s*\(?\s*(\d{1,2})\s*\)?/gi)) {
    const featureSlug = featureCodeToSlug.get(`ft-${(match[1] ?? "").padStart(2, "0")}`);
    if (featureSlug) {
      featureSlugs.add(featureSlug);
    }
  }

  return {
    featureSlugs: [...featureSlugs].sort(),
    useCaseSlugs: [...useCaseSlugs].sort()
  };
}

function parseWikiSource(sourcePathInput: string): ParsedWiki {
  const sourcePath = path.resolve(requireNonEmpty(sourcePathInput, "sourcePath"));
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    throw badRequest(`Wiki source path "${sourcePathInput}" is not a directory`);
  }

  const featuresDir = path.join(sourcePath, "features");
  const tasksDir = path.join(sourcePath, "tasks");
  if (!fs.existsSync(featuresDir) || !fs.statSync(featuresDir).isDirectory()) {
    throw badRequest("Wiki source path must contain a features directory");
  }
  if (!fs.existsSync(tasksDir) || !fs.statSync(tasksDir).isDirectory()) {
    throw badRequest("Wiki source path must contain a tasks directory");
  }

  const warnings: WikiImportItemResult[] = [];
  const parsedFeatures: ParsedFeature[] = [];
  const parsedUseCases: ParsedUseCase[] = [];
  const featureCodeToSlug = new Map<string, string>();
  const useCaseSlugToFeatureSlug = new Map<string, string>();

  const featureDirs = fs
    .readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(featuresDir, entry.name))
    .sort((first, second) => first.localeCompare(second));

  for (const featureDir of featureDirs) {
    const featureSlug = normalizePathSegment(path.basename(featureDir));
    const featureDoc =
      listMarkdownFiles(featureDir).find((filePath) => normalizePathSegment(path.basename(filePath, ".md")) === featureSlug) ??
      listMarkdownFiles(featureDir).find((filePath) => /^ft-\d+/i.test(path.basename(filePath)));

    if (!featureDoc) {
      warnings.push({
        type: "feature",
        action: "warning",
        title: featureSlug,
        slug: featureSlug,
        sourcePath: relativeSourcePath(sourcePath, featureDir),
        message: "Feature directory has no direct feature markdown file"
      });
      continue;
    }

    const content = readMarkdown(featureDoc);
    const featureCode = featureCodeFromSlug(featureSlug);
    if (featureCode) {
      featureCodeToSlug.set(featureCode, featureSlug);
    }

    parsedFeatures.push({
      title: markdownTitle(content, featureSlug),
      slug: featureSlug,
      description: descriptionFromSection(content, ["Ziel / Zweck", "Fachliche Beschreibung"]),
      content,
      sortOrder: numberFromSlug(featureSlug),
      sourcePath: relativeSourcePath(sourcePath, featureDoc),
      featureCode
    });

    const useCaseDir = path.join(featureDir, "use-cases");
    for (const useCaseFile of listMarkdownFiles(useCaseDir).filter((filePath) => /^uc-\d+/i.test(path.basename(filePath)))) {
      const useCaseSlug = normalizePathSegment(path.basename(useCaseFile, ".md"));
      const useCaseContent = readMarkdown(useCaseFile);
      useCaseSlugToFeatureSlug.set(useCaseSlug, featureSlug);
      parsedUseCases.push({
        featureSlug,
        title: markdownTitle(useCaseContent, useCaseSlug),
        slug: useCaseSlug,
        description: descriptionFromSection(useCaseContent, ["Ziel", "Beschreibung"]),
        content: useCaseContent,
        sortOrder: numberFromSlug(useCaseSlug),
        sourcePath: relativeSourcePath(sourcePath, useCaseFile)
      });
    }
  }

  const parsedTasks = listMarkdownFiles(tasksDir)
    .filter((filePath) => {
      const name = path.basename(filePath).toLowerCase();
      return name !== "readme.md" && name !== "template.md";
    })
    .map((filePath) => {
      const content = readMarkdown(filePath);
      const relations = parseTaskRelations(content, featureCodeToSlug, useCaseSlugToFeatureSlug);
      const sourceRelativePath = relativeSourcePath(sourcePath, filePath);
      return {
        title: markdownTitle(content, path.basename(filePath, ".md")),
        importKey: `wiki:${sourceRelativePath.toLowerCase()}`,
        description: content,
        priority: parsePriority(content),
        sourcePath: sourceRelativePath,
        featureSlugs: relations.featureSlugs,
        useCaseSlugs: relations.useCaseSlugs
      };
    });

  return {
    sourcePath,
    features: parsedFeatures,
    useCases: parsedUseCases,
    tasks: parsedTasks,
    warnings
  };
}

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function getFeatureBySlug(database: DbClient, slug: string): StoredFeature | undefined {
  return database
    .select({ id: features.id, slug: features.slug, contentPath: features.contentPath })
    .from(features)
    .where(eq(features.slug, slug))
    .get();
}

function getUseCaseBySlug(database: DbClient, slug: string): StoredUseCase | undefined {
  return database
    .select({ id: useCases.id, featureId: useCases.featureId, slug: useCases.slug, contentPath: useCases.contentPath })
    .from(useCases)
    .where(eq(useCases.slug, slug))
    .get();
}

function getTaskByImportKey(database: DbClient, projectId: number, importKey: string): StoredTask | undefined {
  return database
    .select({ id: tasks.id, projectId: tasks.projectId, importKey: tasks.importKey })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.importKey, importKey)))
    .get();
}

function featureContentPath(featureId: number, slug: string): string {
  return buildStoredContentPath("features", buildFilename("feature", featureId, slug));
}

function makeUseCaseContentPath(useCaseId: number, slug: string): string {
  return buildStoredContentPath("usecases", buildFilename("usecase", useCaseId, slug));
}

function writeStoredContent(contentPath: string, content: string): void {
  writeContent(resolveStoredContentPath(contentPath), content);
}

function nextTaskPosition(database: DbClient, projectId: number): number {
  const rows = database
    .select({ position: tasks.position })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "todo"), isNull(tasks.parentId)))
    .all();

  return rows.reduce((current, row) => Math.max(current, row.position), 0) + 1024;
}

function hasProjectFeature(database: DbClient, projectId: number, featureId: number): boolean {
  return Boolean(
    database
      .select({ projectId: projectFeatures.projectId })
      .from(projectFeatures)
      .where(and(eq(projectFeatures.projectId, projectId), eq(projectFeatures.featureId, featureId)))
      .get()
  );
}

function hasTaskFeature(database: DbClient, taskId: number, featureId: number): boolean {
  return Boolean(
    database
      .select({ taskId: taskFeatures.taskId })
      .from(taskFeatures)
      .where(and(eq(taskFeatures.taskId, taskId), eq(taskFeatures.featureId, featureId)))
      .get()
  );
}

function hasTaskUseCase(database: DbClient, taskId: number, useCaseId: number): boolean {
  return Boolean(
    database
      .select({ taskId: taskUseCases.taskId })
      .from(taskUseCases)
      .where(and(eq(taskUseCases.taskId, taskId), eq(taskUseCases.useCaseId, useCaseId)))
      .get()
  );
}

function reportProjectFeatureLink(report: WikiImportReport, database: DbClient, projectId: number, feature: StoredFeature, execute: boolean): void {
  if (!execute && feature.id <= 0) {
    addResult(report, {
      type: "projectFeature",
      action: "created",
      title: feature.slug,
      slug: feature.slug,
      message: "Feature will be linked to project"
    });
    return;
  }

  if (hasProjectFeature(database, projectId, feature.id)) {
    addResult(report, {
      type: "projectFeature",
      action: "skipped",
      title: feature.slug,
      slug: feature.slug,
      message: "Feature is already linked to project"
    });
    return;
  }

  if (execute) {
    database.insert(projectFeatures).values({ projectId, featureId: feature.id }).run();
  }

  addResult(report, {
    type: "projectFeature",
    action: "created",
    title: feature.slug,
    slug: feature.slug,
    message: "Feature linked to project"
  });
}

function upsertFeature(database: DbClient, feature: ParsedFeature, execute: boolean, now: string): { record?: StoredFeature; action: WikiImportAction } {
  const existing = getFeatureBySlug(database, feature.slug);
  if (!execute) {
    return { record: existing, action: existing ? "updated" : "created" };
  }

  if (existing) {
    const contentPath = existing.contentPath ?? featureContentPath(existing.id, existing.slug);
    database
      .update(features)
      .set({
        title: feature.title,
        description: feature.description,
        sortOrder: feature.sortOrder,
        contentPath,
        updatedAt: now
      })
      .where(eq(features.id, existing.id))
      .run();
    writeStoredContent(contentPath, feature.content);
    return { record: { ...existing, contentPath }, action: "updated" };
  }

  const created = database
    .insert(features)
    .values({
      title: feature.title,
      slug: feature.slug,
      status: "active",
      description: feature.description,
      contentPath: null,
      sortOrder: feature.sortOrder,
      createdAt: now,
      updatedAt: now
    })
    .returning({ id: features.id, slug: features.slug, contentPath: features.contentPath })
    .get();
  const contentPath = featureContentPath(created.id, created.slug);
  writeContent(resolveContentPath("features", path.basename(contentPath)), feature.content);
  database.update(features).set({ contentPath, updatedAt: now }).where(eq(features.id, created.id)).run();

  return { record: { ...created, contentPath }, action: "created" };
}

function upsertUseCase(
  database: DbClient,
  useCase: ParsedUseCase,
  featureId: number,
  execute: boolean,
  now: string
): { record?: StoredUseCase; action: WikiImportAction } {
  const existing = getUseCaseBySlug(database, useCase.slug);
  if (!execute) {
    return { record: existing, action: existing ? "updated" : "created" };
  }

  if (existing) {
    const contentPath = existing.contentPath ?? makeUseCaseContentPath(existing.id, existing.slug);
    database
      .update(useCases)
      .set({
        featureId,
        title: useCase.title,
        description: useCase.description,
        sortOrder: useCase.sortOrder,
        contentPath,
        updatedAt: now
      })
      .where(eq(useCases.id, existing.id))
      .run();
    writeStoredContent(contentPath, useCase.content);
    return { record: { ...existing, featureId, contentPath }, action: "updated" };
  }

  const created = database
    .insert(useCases)
    .values({
      featureId,
      title: useCase.title,
      slug: useCase.slug,
      status: "active",
      description: useCase.description,
      contentPath: null,
      sortOrder: useCase.sortOrder,
      createdAt: now,
      updatedAt: now
    })
    .returning({ id: useCases.id, featureId: useCases.featureId, slug: useCases.slug, contentPath: useCases.contentPath })
    .get();
  const contentPath = makeUseCaseContentPath(created.id, created.slug);
  writeContent(resolveContentPath("usecases", path.basename(contentPath)), useCase.content);
  database.update(useCases).set({ contentPath, updatedAt: now }).where(eq(useCases.id, created.id)).run();

  return { record: { ...created, contentPath }, action: "created" };
}

function upsertTask(database: DbClient, projectId: number, task: ParsedTask, execute: boolean, now: string): { record?: StoredTask; action: WikiImportAction } {
  const existing = getTaskByImportKey(database, projectId, task.importKey);
  if (!execute) {
    return { record: existing, action: existing ? "updated" : "created" };
  }

  if (existing) {
    database
      .update(tasks)
      .set({
        title: task.title,
        description: task.description,
        priority: task.priority,
        updatedAt: now
      })
      .where(eq(tasks.id, existing.id))
      .run();
    return { record: existing, action: "updated" };
  }

  const created = database
    .insert(tasks)
    .values({
      projectId,
      parentId: null,
      title: task.title,
      description: task.description,
      status: "todo",
      priority: task.priority,
      assignee: null,
      dueDate: null,
      importKey: task.importKey,
      position: nextTaskPosition(database, projectId),
      createdAt: now,
      updatedAt: now
    })
    .returning({ id: tasks.id, projectId: tasks.projectId, importKey: tasks.importKey })
    .get();

  return { record: created, action: "created" };
}

function reportTaskFeatureLink(report: WikiImportReport, database: DbClient, taskId: number, feature: StoredFeature, execute: boolean): void {
  if (!execute && feature.id <= 0) {
    addResult(report, {
      type: "taskFeature",
      action: "created",
      title: feature.slug,
      slug: feature.slug,
      message: "Feature will be linked to task"
    });
    return;
  }

  if (hasTaskFeature(database, taskId, feature.id)) {
    addResult(report, {
      type: "taskFeature",
      action: "skipped",
      title: feature.slug,
      slug: feature.slug,
      message: "Task already has feature link"
    });
    return;
  }

  if (execute) {
    database.insert(taskFeatures).values({ taskId, featureId: feature.id }).run();
  }

  addResult(report, {
    type: "taskFeature",
    action: "created",
    title: feature.slug,
    slug: feature.slug,
    message: "Feature linked to task"
  });
}

function reportTaskUseCaseLink(report: WikiImportReport, database: DbClient, taskId: number, useCase: StoredUseCase, execute: boolean): void {
  if (!execute && useCase.id <= 0) {
    addResult(report, {
      type: "taskUseCase",
      action: "created",
      title: useCase.slug,
      slug: useCase.slug,
      message: "Use case will be linked to task"
    });
    return;
  }

  if (hasTaskUseCase(database, taskId, useCase.id)) {
    addResult(report, {
      type: "taskUseCase",
      action: "skipped",
      title: useCase.slug,
      slug: useCase.slug,
      message: "Task already has use case link"
    });
    return;
  }

  if (execute) {
    database.insert(taskUseCases).values({ taskId, useCaseId: useCase.id }).run();
  }

  addResult(report, {
    type: "taskUseCase",
    action: "created",
    title: useCase.slug,
    slug: useCase.slug,
    message: "Use case linked to task"
  });
}

function buildImportReport(database: DbClient, projectId: number, parsed: ParsedWiki, mode: WikiImportReport["mode"], execute: boolean): WikiImportReport {
  const report: WikiImportReport = {
    projectId,
    sourcePath: parsed.sourcePath,
    mode,
    summary: emptySummary(),
    items: []
  };
  const now = nowIso();
  const featureRecordsBySlug = new Map<string, StoredFeature>();
  const useCaseRecordsBySlug = new Map<string, StoredUseCase>();
  let previewFeatureId = -1;
  let previewUseCaseId = -1;

  for (const warning of parsed.warnings) {
    addResult(report, warning);
  }

  for (const feature of parsed.features) {
    const result = upsertFeature(database, feature, execute, now);
    const record = result.record ?? getFeatureBySlug(database, feature.slug) ?? (!execute ? { id: previewFeatureId--, slug: feature.slug, contentPath: null } : undefined);
    if (record) {
      featureRecordsBySlug.set(feature.slug, record);
      reportProjectFeatureLink(report, database, projectId, record, execute);
    }
    addResult(report, {
      type: "feature",
      action: result.action,
      title: feature.title,
      slug: feature.slug,
      sourcePath: feature.sourcePath
    });
  }

  for (const useCase of parsed.useCases) {
    const feature = featureRecordsBySlug.get(useCase.featureSlug) ?? getFeatureBySlug(database, useCase.featureSlug);
    if (!feature) {
      addResult(report, {
        type: "useCase",
        action: "error",
        title: useCase.title,
        slug: useCase.slug,
        sourcePath: useCase.sourcePath,
        message: `Feature "${useCase.featureSlug}" is missing`
      });
      continue;
    }

    const result = upsertUseCase(database, useCase, feature.id, execute, now);
    const record = result.record ?? getUseCaseBySlug(database, useCase.slug) ?? (!execute ? { id: previewUseCaseId--, featureId: feature.id, slug: useCase.slug, contentPath: null } : undefined);
    if (record) {
      useCaseRecordsBySlug.set(useCase.slug, record);
    }
    addResult(report, {
      type: "useCase",
      action: result.action,
      title: useCase.title,
      slug: useCase.slug,
      sourcePath: useCase.sourcePath
    });
  }

  for (const task of parsed.tasks) {
    const result = upsertTask(database, projectId, task, execute, now);
    const record = result.record ?? getTaskByImportKey(database, projectId, task.importKey);
    addResult(report, {
      type: "task",
      action: result.action,
      title: task.title,
      importKey: task.importKey,
      sourcePath: task.sourcePath
    });

    if (!record) {
      continue;
    }

    const linkedFeatureIds = new Set<number>();
    for (const featureSlug of task.featureSlugs) {
      const feature = featureRecordsBySlug.get(featureSlug) ?? getFeatureBySlug(database, featureSlug);
      if (feature && !linkedFeatureIds.has(feature.id)) {
        linkedFeatureIds.add(feature.id);
        reportTaskFeatureLink(report, database, record.id, feature, execute);
      }
    }

    for (const useCaseSlug of task.useCaseSlugs) {
      const useCase = useCaseRecordsBySlug.get(useCaseSlug) ?? getUseCaseBySlug(database, useCaseSlug);
      if (useCase) {
        reportTaskUseCaseLink(report, database, record.id, useCase, execute);
        const feature = [...featureRecordsBySlug.values()].find((candidate) => candidate.id === useCase.featureId) ?? getFeatureBySlug(database, task.featureSlugs.find((slug) => featureRecordsBySlug.get(slug)?.id === useCase.featureId) ?? "");
        if (feature && !linkedFeatureIds.has(feature.id)) {
          linkedFeatureIds.add(feature.id);
          reportTaskFeatureLink(report, database, record.id, feature, execute);
        }
      }
    }
  }

  return report;
}

export function previewWikiImport(database: DbClient, projectId: number, input: WikiImportRunRequest): WikiImportReport {
  ensureProjectExists(database, projectId);
  const parsed = parseWikiSource(input.sourcePath);
  return buildImportReport(database, projectId, parsed, "preview", false);
}

export function runWikiImport(database: DbClient, projectId: number, input: WikiImportRunRequest): WikiImportReport {
  ensureProjectExists(database, projectId);
  const parsed = parseWikiSource(input.sourcePath);
  return database.transaction((tx) => buildImportReport(tx as unknown as DbClient, projectId, parsed, "run", true));
}
