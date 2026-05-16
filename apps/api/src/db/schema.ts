import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { check, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const BACKLOG_STATUSES = ["open", "in_progress", "done", "rejected"] as const;

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: PROJECT_STATUSES }).notNull().default("active"),
  color: text("color").default("#6366f1"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  position: real("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#94a3b8")
});

export const projectTags = sqliteTable("project_tags", {
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const taskTags = sqliteTable("task_tags", {
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default("Ohne Titel"),
  contentJson: text("content_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const projectNotes = sqliteTable("project_notes", {
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const taskNotes = sqliteTable("task_notes", {
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
    projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    filename: text("filename").notNull(),
    mimetype: text("mimetype").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    ownerCheck: check(
      "attachments_exactly_one_owner",
      sql`(${table.projectId} is not null and ${table.taskId} is null) or (${table.projectId} is null and ${table.taskId} is not null)`
    )
  })
);

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

export const wikiPages = sqliteTable("wiki_pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => wikiPages.id, { onDelete: "restrict" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  contentPath: text("content_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const backlogItems = sqliteTable("backlog_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  featureId: integer("feature_id").references(() => features.id, { onDelete: "set null" }),
  useCaseId: integer("use_case_id").references(() => useCases.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: BACKLOG_STATUSES }).notNull().default("open"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const projectFeatures = sqliteTable("project_features", {
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  featureId: integer("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" })
});

export const taskFeatures = sqliteTable("task_features", {
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  featureId: integer("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" })
});

export const taskUseCases = sqliteTable("task_use_cases", {
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  useCaseId: integer("use_case_id")
    .notNull()
    .references(() => useCases.id, { onDelete: "cascade" })
});
