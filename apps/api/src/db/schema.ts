import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { blob, check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const WORK_STATUSES = ["active", "on_hold", "completed", "archived", "todo", "open", "in_progress", "in_review", "done", "resolved", "closed", "rejected"] as const;
export const PROJECT_STATUSES = WORK_STATUSES;
export const TASK_STATUSES = WORK_STATUSES;
export const DAY_PLAN_STATUSES = ["open", "completed"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const FEATURE_STATUSES = ["draft", "active", "done", "archived"] as const;
export const FEATURE_RELATION_TYPES = ["related", "depends_on", "consumed_by"] as const;
export const BACKLOG_STATUSES = WORK_STATUSES;
export const TICKET_STATUSES = WORK_STATUSES;
export const TICKET_RESOLUTIONS = ["fixed", "wont_fix", "duplicate", "cant_reproduce", "by_design"] as const;
export const TICKET_RELATION_TYPES = ["blocks", "related", "duplicate"] as const;
export const CATALOG_KINDS = ["workStatus", "featureStatus", "priority", "ticketType"] as const;
export const SETTING_SCOPE_TYPES = ["GLOBAL", "ROLE", "USER"] as const;
export const DASHBOARD_CONTEXTS = ["global", "project", "milestone", "task", "home", "calendar", "dayPlan"] as const;
export const DASHBOARD_DEFAULT_SCOPE_TYPES = ["GLOBAL", "USER"] as const;
export const NOTIFICATION_CHANNELS = ["email", "push"] as const;
export const JOURNAL_OBJECT_TYPES = [
  "project",
  "milestone",
  "task",
  "feature",
  "useCase",
  "wikiPage",
  "backlogItem",
  "ticket",
  "event",
  "dayPlan",
  "tag",
  "note",
  "attachment",
  "comment"
] as const;
export const JOURNAL_OPERATIONS = ["create", "update", "delete", "link", "unlink"] as const;
export const JOURNAL_CONTEXT_RELATIONS = ["self", "owner", "parent", "related"] as const;

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const permissions = sqliteTable(
  "permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    action: text("action").notNull()
  },
  (table) => ({
    permissionsRoleResourceActionUnique: uniqueIndex("permissions_role_resource_action_unique").on(table.roleId, table.resource, table.action)
  })
);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  fullName: text("full_name").notNull().$defaultFn(() => ""),
  address: text("address"),
  phone: text("phone"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "restrict" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    operation: text("operation", { enum: JOURNAL_OPERATIONS }).notNull(),
    objectType: text("object_type", { enum: JOURNAL_OBJECT_TYPES }).notNull(),
    objectId: integer("object_id").notNull(),
    objectLabel: text("object_label").notNull(),
    summary: text("summary").notNull(),
    actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull().default("System"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    journalEntriesCreatedAtIdx: index("journal_entries_created_at_idx").on(table.createdAt),
    journalEntriesObjectIdx: index("journal_entries_object_idx").on(table.objectType, table.objectId),
    journalEntriesActorIdx: index("journal_entries_actor_idx").on(table.actorUserId)
  })
);

export const journalEntryChanges = sqliteTable("journal_entry_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  journalEntryId: integer("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id, { onDelete: "cascade" }),
  fieldKey: text("field_key").notNull(),
  fieldLabel: text("field_label").notNull(),
  oldValueJson: text("old_value_json").notNull(),
  oldValueLabel: text("old_value_label"),
  newValueJson: text("new_value_json").notNull(),
  newValueLabel: text("new_value_label"),
  summary: text("summary").notNull()
});

export const journalEntryContexts = sqliteTable(
  "journal_entry_contexts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    journalEntryId: integer("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    objectType: text("object_type", { enum: JOURNAL_OBJECT_TYPES }).notNull(),
    objectId: integer("object_id").notNull(),
    objectLabel: text("object_label").notNull(),
    relation: text("relation", { enum: JOURNAL_CONTEXT_RELATIONS }).notNull()
  },
  (table) => ({
    journalContextEntryObjectRelationUnique: uniqueIndex("journal_context_entry_object_relation_unique").on(table.journalEntryId, table.objectType, table.objectId, table.relation),
    journalContextObjectIdx: index("journal_context_object_idx").on(table.objectType, table.objectId)
  })
);

export const settingsValues = sqliteTable(
  "settings_values",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    settingKey: text("setting_key").notNull(),
    scopeType: text("scope_type", { enum: SETTING_SCOPE_TYPES }).notNull(),
    scopeId: text("scope_id").notNull(),
    valueJson: text("value_json").notNull(),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    settingsValuesSettingScopeUnique: uniqueIndex("settings_values_setting_scope_unique").on(table.settingKey, table.scopeType, table.scopeId)
  })
);

export const dashboards = sqliteTable(
  "dashboards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    context: text("context", { enum: DASHBOARD_CONTEXTS }).notNull(),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    templateKey: text("template_key").unique(),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    dashboardsContextOwnerIdx: index("dashboards_context_owner_idx").on(table.context, table.ownerId),
    dashboardsTemplateKeyIdx: index("dashboards_template_key_idx").on(table.templateKey)
  })
);

export const dashboardWidgets = sqliteTable(
  "dashboard_widgets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dashboardId: integer("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    widgetId: text("widget_id").notNull(),
    col: integer("col").notNull().default(0),
    row: integer("row").notNull().default(0),
    colSpan: integer("col_span").notNull().default(2),
    paramsJson: text("params_json")
  },
  (table) => ({
    dashboardWidgetsDashboardIdx: index("dashboard_widgets_dashboard_idx").on(table.dashboardId),
    dashboardWidgetsDashboardWidgetUnique: uniqueIndex("dashboard_widgets_dashboard_widget_unique").on(table.dashboardId, table.widgetId)
  })
);

export const dashboardDefaults = sqliteTable(
  "dashboard_defaults",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scopeType: text("scope_type", { enum: DASHBOARD_DEFAULT_SCOPE_TYPES }).notNull(),
    scopeId: text("scope_id").notNull(),
    context: text("context", { enum: DASHBOARD_CONTEXTS }).notNull(),
    dashboardId: integer("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    dashboardDefaultsScopeContextUnique: uniqueIndex("dashboard_defaults_scope_context_unique").on(table.scopeType, table.scopeId, table.context),
    dashboardDefaultsDashboardIdx: index("dashboard_defaults_dashboard_idx").on(table.dashboardId)
  })
);

export const catalogEntries = sqliteTable(
  "catalog_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: CATALOG_KINDS }).notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    sortOrder: real("sort_order").notNull().default(0),
    isClosed: integer("is_closed", { mode: "boolean" }).notNull().default(false),
    color: text("color").notNull().default("var(--color-steel-700)"),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    catalogEntryKindKeyUnique: uniqueIndex("catalog_entries_kind_key_unique").on(table.kind, table.key)
  })
);

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  color: text("color").default("#6366f1"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  wikiPageId: integer("wiki_page_id").references((): AnySQLiteColumn => wikiPages.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const milestones = sqliteTable("milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  color: text("color").default("#6366f1"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
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
    status: text("status").notNull().default("todo"),
    priority: text("priority").notNull().default("medium"),
    responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: text("due_date"),
    importKey: text("import_key"),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  }
);

export const dayPlans = sqliteTable(
  "day_plans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: DAY_PLAN_STATUSES }).notNull().default("open"),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    dayPlansUserDateUnique: uniqueIndex("day_plans_user_date_unique").on(table.userId, table.date),
    dayPlansDateIdx: index("day_plans_date_idx").on(table.date)
  })
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

export const milestoneComments = sqliteTable(
  "milestone_comments",
  {
    milestoneId: integer("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    milestoneCommentUnique: uniqueIndex("milestone_comments_parent_comment_unique").on(table.milestoneId, table.commentId)
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

export const dayPlanComments = sqliteTable(
  "day_plan_comments",
  {
    dayPlanId: integer("day_plan_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    dayPlanCommentUnique: uniqueIndex("day_plan_comments_owner_comment_unique").on(table.dayPlanId, table.commentId)
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

export const wikiPageAttachments = sqliteTable(
  "wiki_page_attachments",
  {
    wikiPageId: integer("wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    attachmentId: integer("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    wikiPageAttachmentUnique: uniqueIndex("wiki_page_attachments_parent_attachment_unique").on(table.wikiPageId, table.attachmentId)
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

export const milestoneTags = sqliteTable("milestone_tags", {
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
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

export const milestoneNotes = sqliteTable("milestone_notes", {
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
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

export const dayPlanNotes = sqliteTable(
  "day_plan_notes",
  {
    dayPlanId: integer("day_plan_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    noteId: integer("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" })
  },
  (table) => ({
    dayPlanNoteUnique: uniqueIndex("day_plan_notes_owner_note_unique").on(table.dayPlanId, table.noteId)
  })
);

export const wikiPageNotes = sqliteTable(
  "wiki_page_notes",
  {
    wikiPageId: integer("wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    noteId: integer("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" })
  },
  (table) => ({
    wikiPageNoteUnique: uniqueIndex("wiki_page_notes_owner_note_unique").on(table.wikiPageId, table.noteId)
  })
);

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

export const milestoneAttachments = sqliteTable(
  "milestone_attachments",
  {
    milestoneId: integer("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    attachmentId: integer("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    milestoneAttachmentUnique: uniqueIndex("milestone_attachments_parent_attachment_unique").on(table.milestoneId, table.attachmentId)
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
  reminderMinutes: integer("reminder_minutes").notNull().default(60),
  responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const sentNotifications = sqliteTable(
  "sent_notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: NOTIFICATION_CHANNELS }).notNull(),
    reminderMinutes: integer("reminder_minutes").notNull(),
    sentAt: text("sent_at").notNull()
  },
  (table) => ({
    sentNotificationsUnique: uniqueIndex("sent_notifications_event_user_channel_reminder_unique").on(table.eventId, table.userId, table.channel, table.reminderMinutes),
    sentNotificationsEventIdx: index("sent_notifications_event_idx").on(table.eventId),
    sentNotificationsUserIdx: index("sent_notifications_user_idx").on(table.userId)
  })
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    pushSubscriptionsEndpointUnique: uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    pushSubscriptionsUserIdx: index("push_subscriptions_user_idx").on(table.userId)
  })
);

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

export const milestoneEvents = sqliteTable(
  "milestone_events",
  {
    milestoneId: integer("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" })
  },
  (table) => ({
    milestoneEventUnique: uniqueIndex("milestone_events_parent_event_unique").on(table.milestoneId, table.eventId)
  })
);

export const dayPlanEvents = sqliteTable(
  "day_plan_events",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    dayPlanEventUnique: uniqueIndex("day_plan_events_owner_event_unique").on(table.ownerId, table.eventId)
  })
);

export const features = sqliteTable("features", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  description: text("description"),
  content: text("content"),
  sortOrder: integer("sort_order").notNull().default(0),
  responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
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
  status: text("status").notNull().default("draft"),
  description: text("description"),
  content: text("content"),
  sortOrder: integer("sort_order").notNull().default(0),
  responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
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
  title: text("title").notNull(),
  content: text("content"),
  sortOrder: integer("sort_order").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

export const wikiPageRelations = sqliteTable(
  "wiki_page_relations",
  {
    sourceWikiPageId: integer("source_wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    targetWikiPageId: integer("target_wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    wikiPageRelationUnique: uniqueIndex("wiki_page_relations_source_target_unique").on(table.sourceWikiPageId, table.targetWikiPageId),
    noSelfRelation: check("wiki_page_relations_no_self_relation", sql`${table.sourceWikiPageId} <> ${table.targetWikiPageId}`)
  })
);

export const contentImages = sqliteTable(
  "content_images",
  {
    id: text("id").primaryKey(),
    mimeType: text("mime_type").notNull(),
    data: blob("data", { mode: "buffer" }).notNull(),
    size: integer("size").notNull(),
    version: integer("version").notNull().default(1),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    contentImagesCreatedAtIdx: index("content_images_created_at_idx").on(table.createdAt)
  })
);

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
    status: text("status").notNull().default("open"),
    importKey: text("import_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
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

export const milestoneFeatures = sqliteTable("milestone_features", {
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
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

export const milestoneTasks = sqliteTable(
  "milestone_tasks",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    milestoneTaskUnique: uniqueIndex("milestone_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const dayPlanTasks = sqliteTable(
  "day_plan_tasks",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    dayPlanTaskUnique: uniqueIndex("day_plan_tasks_owner_task_unique").on(table.ownerId, table.taskId)
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

export const wikiPageTasks = sqliteTable(
  "wiki_page_tasks",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    wikiPageTaskUnique: uniqueIndex("wiki_page_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => tickets.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("bug"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  resolution: text("resolution", { enum: TICKET_RESOLUTIONS }),
  reporterUserId: integer("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
  responsibleUserId: integer("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
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

export const milestoneTickets = sqliteTable(
  "milestone_tickets",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    milestoneTicketUnique: uniqueIndex("milestone_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
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

export const wikiPageTickets = sqliteTable(
  "wiki_page_tickets",
  {
    ownerId: integer("owner_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0)
  },
  (table) => ({
    wikiPageTicketUnique: uniqueIndex("wiki_page_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
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
