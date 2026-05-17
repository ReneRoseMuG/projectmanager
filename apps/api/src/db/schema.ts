import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { check, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const FEATURE_RELATION_TYPES = ["related", "depends_on", "consumed_by"] as const;
export const BACKLOG_STATUSES = ["open", "in_progress", "done", "rejected"] as const;
export const COMMENT_ENTITY_TYPES = ["task", "feature", "project", "useCase", "backlogItem", "wikiPage"] as const;

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const seedRuns = sqliteTable("seed_runs", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  scenario: text("scenario").notNull().default("visual"),
  summaryJson: text("summary_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
});

export const seedRunItems = sqliteTable(
  "seed_run_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seedRunId: text("seed_run_id")
      .notNull()
      .references(() => seedRuns.id, { onDelete: "cascade" }),
    tableName: text("table_name").notNull(),
    recordKey: text("record_key").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    seedRunItemUnique: uniqueIndex("seed_run_items_run_table_record_unique").on(table.seedRunId, table.tableName, table.recordKey)
  })
);

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: PROJECT_STATUSES }).notNull().default("active"),
  color: text("color").default("#6366f1"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seedRunId: text("seed_run_id").references(() => seedRuns.id),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnySQLiteColumn => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("todo"),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
    assignee: text("assignee"),
    dueDate: text("due_date"),
    importKey: text("import_key"),
    position: real("position").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    projectImportKeyUnique: uniqueIndex("tasks_project_import_key_unique").on(table.projectId, table.importKey)
  })
);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  taskId: integer("task_id")
    .references(() => tasks.id, { onDelete: "cascade" }),
  entityType: text("entity_type", { enum: COMMENT_ENTITY_TYPES }).notNull().default("task"),
  entityId: integer("entity_id").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#94a3b8")
});

export const projectTags = sqliteTable("project_tags", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const taskTags = sqliteTable("task_tags", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  title: text("title").notNull().default("Ohne Titel"),
  contentJson: text("content_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const projectNotes = sqliteTable("project_notes", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const taskNotes = sqliteTable("task_notes", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const attachments = sqliteTable(
  "attachments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seedRunId: text("seed_run_id").references(() => seedRuns.id),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    featureId: integer("feature_id").references(() => features.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    filename: text("filename").notNull(),
    mimetype: text("mimetype").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    ownerCheck: check(
      "attachments_exactly_one_owner",
      sql`(${table.projectId} is not null and ${table.taskId} is null and ${table.featureId} is null) or (${table.projectId} is null and ${table.taskId} is not null and ${table.featureId} is null) or (${table.projectId} is null and ${table.taskId} is null and ${table.featureId} is not null)`
    )
  })
);

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
  color: text("color").default("#6366f1"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const features = sqliteTable("features", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: FEATURE_STATUSES }).notNull().default("draft"),
  description: text("description"),
  contentPath: text("content_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const useCases = sqliteTable("use_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  featureId: integer("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: FEATURE_STATUSES }).notNull().default("draft"),
  description: text("description"),
  contentPath: text("content_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const featureRelations = sqliteTable(
  "feature_relations",
  {
    seedRunId: text("seed_run_id").references(() => seedRuns.id),
    sourceFeatureId: integer("source_feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    targetFeatureId: integer("target_feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    relationType: text("relation_type", { enum: FEATURE_RELATION_TYPES }).notNull().default("related"),
    description: text("description"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    featureRelationUnique: uniqueIndex("feature_relations_source_target_type_unique").on(table.sourceFeatureId, table.targetFeatureId, table.relationType),
    noSelfRelation: check("feature_relations_no_self_relation", sql`${table.sourceFeatureId} <> ${table.targetFeatureId}`)
  })
);

export const wikiPages = sqliteTable("wiki_pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  parentId: integer("parent_id").references((): AnySQLiteColumn => wikiPages.id, { onDelete: "restrict" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  contentPath: text("content_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const backlogItems = sqliteTable(
  "backlog_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seedRunId: text("seed_run_id").references(() => seedRuns.id),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    featureId: integer("feature_id").references(() => features.id, { onDelete: "set null" }),
    useCaseId: integer("use_case_id").references(() => useCases.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: BACKLOG_STATUSES }).notNull().default("open"),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
    importKey: text("import_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    projectImportKeyUnique: uniqueIndex("backlog_items_project_import_key_unique").on(table.projectId, table.importKey)
  })
);

export const projectFeatures = sqliteTable("project_features", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  featureId: integer("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" })
});

export const taskFeatures = sqliteTable("task_features", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  featureId: integer("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" })
});

export const taskUseCases = sqliteTable("task_use_cases", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  useCaseId: integer("use_case_id")
    .notNull()
    .references(() => useCases.id, { onDelete: "cascade" })
});
