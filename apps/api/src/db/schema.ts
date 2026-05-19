import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { check, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const FEATURE_RELATION_TYPES = ["related", "depends_on", "consumed_by"] as const;
export const BACKLOG_STATUSES = ["open", "in_progress", "done", "rejected"] as const;
export const TICKET_TYPES = ["bug", "improvement", "question", "task"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "in_review", "resolved", "closed"] as const;
export const TICKET_RESOLUTIONS = ["fixed", "wont_fix", "duplicate", "cant_reproduce", "by_design"] as const;
export const TICKET_RELATION_TYPES = ["blocks", "related", "duplicate"] as const;

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: PROJECT_STATUSES }).notNull().default("active"),
  color: text("color").default("#6366f1"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references((): AnySQLiteColumn => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("todo"),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
    assignee: text("assignee"),
    dueDate: text("due_date"),
    importKey: text("import_key"),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  }
);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const projectComments = sqliteTable(
  "project_comments",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    projectCommentUnique: uniqueIndex("project_comments_parent_comment_unique").on(table.projectId, table.commentId)
  })
);

export const taskComments = sqliteTable(
  "task_comments",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    taskCommentUnique: uniqueIndex("task_comments_parent_comment_unique").on(table.taskId, table.commentId)
  })
);

export const featureComments = sqliteTable(
  "feature_comments",
  {
    featureId: integer("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    featureCommentUnique: uniqueIndex("feature_comments_parent_comment_unique").on(table.featureId, table.commentId)
  })
);

export const useCaseComments = sqliteTable(
  "use_case_comments",
  {
    useCaseId: integer("use_case_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    useCaseCommentUnique: uniqueIndex("use_case_comments_parent_comment_unique").on(table.useCaseId, table.commentId)
  })
);

export const backlogItemComments = sqliteTable(
  "backlog_item_comments",
  {
    backlogItemId: integer("backlog_item_id")
      .notNull()
      .references(() => backlogItems.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    backlogItemCommentUnique: uniqueIndex("backlog_item_comments_parent_comment_unique").on(table.backlogItemId, table.commentId)
  })
);

export const wikiPageComments = sqliteTable(
  "wiki_page_comments",
  {
    wikiPageId: integer("wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    wikiPageCommentUnique: uniqueIndex("wiki_page_comments_parent_comment_unique").on(table.wikiPageId, table.commentId)
  })
);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#94a3b8"),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
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
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
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
    originalName: text("original_name").notNull(),
    filename: text("filename").notNull(),
    mimetype: text("mimetype").notNull(),
    size: integer("size").notNull(),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  }
);

export const projectAttachments = sqliteTable(
  "project_attachments",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    attachmentId: integer("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    projectAttachmentUnique: uniqueIndex("project_attachments_parent_attachment_unique").on(table.projectId, table.attachmentId)
  })
);

export const taskAttachments = sqliteTable(
  "task_attachments",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    attachmentId: integer("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    taskAttachmentUnique: uniqueIndex("task_attachments_parent_attachment_unique").on(table.taskId, table.attachmentId)
  })
);

export const featureAttachments = sqliteTable(
  "feature_attachments",
  {
    featureId: integer("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    attachmentId: integer("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    featureAttachmentUnique: uniqueIndex("feature_attachments_parent_attachment_unique").on(table.featureId, table.attachmentId)
  })
);

export const ticketAttachments = sqliteTable(
  "ticket_attachments",
  {
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    attachmentId: integer("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    ticketAttachmentUnique: uniqueIndex("ticket_attachments_parent_attachment_unique").on(table.ticketId, table.attachmentId)
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
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const projectEvents = sqliteTable(
  "project_events",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" })
  },
  (table) => ({
    projectEventUnique: uniqueIndex("project_events_parent_event_unique").on(table.projectId, table.eventId)
  })
);

export const taskEvents = sqliteTable(
  "task_events",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" })
  },
  (table) => ({
    taskEventUnique: uniqueIndex("task_events_parent_event_unique").on(table.taskId, table.eventId)
  })
);

export const features = sqliteTable("features", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: FEATURE_STATUSES }).notNull().default("draft"),
  description: text("description"),
  contentPath: text("content_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
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
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const featureRelations = sqliteTable(
  "feature_relations",
  {
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
  parentId: integer("parent_id").references((): AnySQLiteColumn => wikiPages.id, { onDelete: "restrict" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  contentPath: text("content_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const backlogItems = sqliteTable(
  "backlog_items",
  {
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
    importKey: text("import_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    projectImportKeyUnique: uniqueIndex("backlog_items_project_import_key_unique").on(table.projectId, table.importKey)
  })
);

export const projectFeatures = sqliteTable("project_features", {
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  featureId: integer("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" })
});

export const projectTasks = sqliteTable(
  "project_tasks",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    projectTaskUnique: uniqueIndex("project_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const featureTasks = sqliteTable(
  "feature_tasks",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    featureTaskUnique: uniqueIndex("feature_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const useCaseTasks = sqliteTable(
  "use_case_tasks",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    useCaseTaskUnique: uniqueIndex("use_case_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => tickets.id, { onDelete: "cascade" }),
  type: text("type", { enum: TICKET_TYPES }).notNull().default("bug"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: TICKET_STATUSES }).notNull().default("open"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  resolution: text("resolution", { enum: TICKET_RESOLUTIONS }),
  reporter: text("reporter"),
  assignee: text("assignee"),
  environment: text("environment"),
  affectedVersion: text("affected_version"),
  dueDate: text("due_date"),
  resolvedAt: text("resolved_at"),
  position: real("position").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const projectTickets = sqliteTable(
  "project_tickets",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    projectTicketUnique: uniqueIndex("project_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const taskTickets = sqliteTable(
  "task_tickets",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    taskTicketUnique: uniqueIndex("task_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const featureTickets = sqliteTable(
  "feature_tickets",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    featureTicketUnique: uniqueIndex("feature_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const useCaseTickets = sqliteTable(
  "use_case_tickets",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    useCaseTicketUnique: uniqueIndex("use_case_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const ticketRelations = sqliteTable(
  "ticket_relations",
  {
    sourceTicketId: integer("source_ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    targetTicketId: integer("target_ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    relationType: text("relation_type", { enum: TICKET_RELATION_TYPES }).notNull().default("related"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    ticketRelationUnique: uniqueIndex("ticket_relations_source_target_type_unique").on(
      table.sourceTicketId,
      table.targetTicketId,
      table.relationType
    ),
    noSelfRelation: check("ticket_relations_no_self_relation", sql`${table.sourceTicketId} <> ${table.targetTicketId}`)
  })
);

export const ticketTags = sqliteTable("ticket_tags", {
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const ticketNotes = sqliteTable("ticket_notes", {
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const ticketComments = sqliteTable(
  "ticket_comments",
  {
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    ticketCommentUnique: uniqueIndex("ticket_comments_parent_comment_unique").on(table.ticketId, table.commentId)
  })
);
