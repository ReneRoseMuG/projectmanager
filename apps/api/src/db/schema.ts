import { sql } from "drizzle-orm";
import { ATTACHMENT_OWNER_TYPES } from "@taskmanager/shared-types";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { boolean, check, double, index, int, longblob, longtext, mysqlTable, primaryKey, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

function shortText<TEnum extends readonly [string, ...string[]]>(
  name: string,
  config?: { enum?: TEnum; length?: number }
) {
  return varchar(name, {
    length: config?.length ?? 191,
    ...(config?.enum ? { enum: config.enum } : {})
  });
}

function timestampText(name: string) {
  return varchar(name, { length: 32 }).notNull().$defaultFn(() => new Date().toISOString());
}

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
export const DASHBOARD_CONTEXTS = ["global", "project", "milestone", "task", "home", "calendar", "dayPlan", "dayPlanCalendar"] as const;
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
export const CALENDAR_PROVIDERS = ["google", "nextcloud"] as const;
export const CALENDAR_CONNECTION_STATUSES = ["active", "syncing", "error", "reauth_required"] as const;
export const EVENT_ORIGINS = ["local", "google", "nextcloud"] as const;
export const EVENT_MAPPING_DIRECTIONS = ["import", "export", "both"] as const;
export const CALENDAR_JOURNAL_EVENT_TYPES = ["connected", "disconnected", "sync_success", "sync_error", "conflict"] as const;

export const appSettings = mysqlTable("app_settings", {
  key: shortText("key").primaryKey(),
  value: longtext("value").notNull(),
  updatedAt: timestampText("updated_at")
});

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  key: shortText("key").notNull().unique(),
  label: shortText("label").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  version: int("version").notNull().default(1),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const permissions = mysqlTable(
  "permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    roleId: int("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    resource: shortText("resource").notNull(),
    action: shortText("action").notNull()
  },
  (table) => ({
    permissionsRoleResourceActionUnique: uniqueIndex("permissions_role_resource_action_unique").on(table.roleId, table.resource, table.action)
  })
);

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: shortText("name").notNull(),
  firstName: shortText("first_name").notNull().default(""),
  lastName: shortText("last_name").notNull().default(""),
  fullName: shortText("full_name").notNull().$defaultFn(() => ""),
  address: shortText("address"),
  phone: shortText("phone"),
  email: shortText("email").notNull().unique(),
  passwordHash: shortText("password_hash", { length: 255 }),
  roleId: int("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const journalEntries = mysqlTable(
  "journal_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    operation: shortText("operation", { enum: JOURNAL_OPERATIONS }).notNull(),
    objectType: shortText("object_type", { enum: JOURNAL_OBJECT_TYPES }).notNull(),
    objectId: int("object_id").notNull(),
    objectLabel: shortText("object_label").notNull(),
    summary: longtext("summary").notNull(),
    actorUserId: int("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorName: shortText("actor_name").notNull().default("System"),
    createdAt: timestampText("created_at")
  },
  (table) => ({
    journalEntriesCreatedAtIdx: index("journal_entries_created_at_idx").on(table.createdAt),
    journalEntriesObjectIdx: index("journal_entries_object_idx").on(table.objectType, table.objectId),
    journalEntriesActorIdx: index("journal_entries_actor_idx").on(table.actorUserId)
  })
);

export const journalEntryChanges = mysqlTable("journal_entry_changes", {
  id: int("id").autoincrement().primaryKey(),
  journalEntryId: int("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id, { onDelete: "cascade" }),
  fieldKey: shortText("field_key").notNull(),
  fieldLabel: shortText("field_label").notNull(),
  oldValueJson: longtext("old_value_json").notNull(),
  oldValueLabel: longtext("old_value_label"),
  newValueJson: longtext("new_value_json").notNull(),
  newValueLabel: longtext("new_value_label"),
  summary: longtext("summary").notNull()
});

export const journalEntryContexts = mysqlTable(
  "journal_entry_contexts",
  {
    id: int("id").autoincrement().primaryKey(),
    journalEntryId: int("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    objectType: shortText("object_type", { enum: JOURNAL_OBJECT_TYPES }).notNull(),
    objectId: int("object_id").notNull(),
    objectLabel: shortText("object_label").notNull(),
    relation: shortText("relation", { enum: JOURNAL_CONTEXT_RELATIONS }).notNull()
  },
  (table) => ({
    journalContextEntryObjectRelationUnique: uniqueIndex("journal_context_entry_object_relation_unique").on(table.journalEntryId, table.objectType, table.objectId, table.relation),
    journalContextObjectIdx: index("journal_context_object_idx").on(table.objectType, table.objectId)
  })
);

export const settingsValues = mysqlTable(
  "settings_values",
  {
    id: int("id").autoincrement().primaryKey(),
    settingKey: shortText("setting_key").notNull(),
    scopeType: shortText("scope_type", { enum: SETTING_SCOPE_TYPES }).notNull(),
    scopeId: shortText("scope_id").notNull(),
    valueJson: longtext("value_json").notNull(),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    settingsValuesSettingScopeUnique: uniqueIndex("settings_values_setting_scope_unique").on(table.settingKey, table.scopeType, table.scopeId)
  })
);

export const dashboards = mysqlTable(
  "dashboards",
  {
    id: int("id").autoincrement().primaryKey(),
    name: shortText("name").notNull(),
    context: shortText("context", { enum: DASHBOARD_CONTEXTS }).notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    templateKey: shortText("template_key").unique(),
    ownerId: int("owner_id").references(() => users.id, { onDelete: "cascade" }),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    dashboardsContextOwnerIdx: index("dashboards_context_owner_idx").on(table.context, table.ownerId),
    dashboardsTemplateKeyIdx: index("dashboards_template_key_idx").on(table.templateKey)
  })
);

export const dashboardWidgets = mysqlTable(
  "dashboard_widgets",
  {
    id: int("id").autoincrement().primaryKey(),
    dashboardId: int("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    widgetId: shortText("widget_id").notNull(),
    col: int("col").notNull().default(0),
    row: int("row").notNull().default(0),
    colSpan: int("col_span").notNull().default(2),
    paramsJson: longtext("params_json")
  },
  (table) => ({
    dashboardWidgetsDashboardIdx: index("dashboard_widgets_dashboard_idx").on(table.dashboardId),
    dashboardWidgetsDashboardWidgetUnique: uniqueIndex("dashboard_widgets_dashboard_widget_unique").on(table.dashboardId, table.widgetId)
  })
);

export const dashboardDefaults = mysqlTable(
  "dashboard_defaults",
  {
    id: int("id").autoincrement().primaryKey(),
    scopeType: shortText("scope_type", { enum: DASHBOARD_DEFAULT_SCOPE_TYPES }).notNull(),
    scopeId: shortText("scope_id").notNull(),
    context: shortText("context", { enum: DASHBOARD_CONTEXTS }).notNull(),
    dashboardId: int("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    dashboardDefaultsScopeContextUnique: uniqueIndex("dashboard_defaults_scope_context_unique").on(table.scopeType, table.scopeId, table.context),
    dashboardDefaultsDashboardIdx: index("dashboard_defaults_dashboard_idx").on(table.dashboardId)
  })
);

export const catalogEntries = mysqlTable(
  "catalog_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    kind: shortText("kind", { enum: CATALOG_KINDS }).notNull(),
    key: shortText("key").notNull(),
    label: shortText("label").notNull(),
    sortOrder: double("sort_order").notNull().default(0),
    isClosed: boolean("is_closed").notNull().default(false),
    color: shortText("color").notNull().default("var(--color-steel-700)"),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    catalogEntryKindKeyUnique: uniqueIndex("catalog_entries_kind_key_unique").on(table.kind, table.key)
  })
);

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: shortText("name").notNull(),
  description: longtext("description"),
  status: shortText("status").notNull().default("active"),
  color: shortText("color").default("#6366f1"),
  startDate: shortText("start_date"),
  dueDate: shortText("due_date"),
  responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  wikiPageId: int("wiki_page_id").references((): AnyMySqlColumn => wikiPages.id, { onDelete: "set null" }),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: shortText("name").notNull(),
  description: longtext("description"),
  status: shortText("status").notNull().default("active"),
  color: shortText("color").default("#6366f1"),
  startDate: shortText("start_date"),
  dueDate: shortText("due_date"),
  responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    parentId: int("parent_id").references((): AnyMySqlColumn => tasks.id, { onDelete: "cascade" }),
    title: shortText("title").notNull(),
    description: longtext("description"),
    status: shortText("status").notNull().default("todo"),
    priority: shortText("priority").notNull().default("medium"),
    responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: shortText("due_date"),
    importKey: shortText("import_key"),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    statusUpdatedAtIdx: index("tasks_status_updated_at_idx").on(table.status, table.updatedAt),
    parentStatusIdx: index("tasks_parent_status_idx").on(table.parentId, table.status)
  })
);

export const dayPlans = mysqlTable(
  "day_plans",
  {
    id: int("id").autoincrement().primaryKey(),
    date: shortText("date").notNull(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: shortText("status", { enum: DAY_PLAN_STATUSES }).notNull().default("open"),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    dayPlansUserDateUnique: uniqueIndex("day_plans_user_date_unique").on(table.userId, table.date),
    dayPlansDateIdx: index("day_plans_date_idx").on(table.date)
  })
);

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  body: longtext("body").notNull(),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const projectComments = mysqlTable(
  "project_comments",
  {
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    projectCommentUnique: uniqueIndex("project_comments_parent_comment_unique").on(table.projectId, table.commentId)
  })
);

export const milestoneComments = mysqlTable(
  "milestone_comments",
  {
    milestoneId: int("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    milestoneCommentUnique: uniqueIndex("milestone_comments_parent_comment_unique").on(table.milestoneId, table.commentId)
  })
);

export const taskComments = mysqlTable(
  "task_comments",
  {
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    taskCommentUnique: uniqueIndex("task_comments_parent_comment_unique").on(table.taskId, table.commentId)
  })
);

export const dayPlanComments = mysqlTable(
  "day_plan_comments",
  {
    dayPlanId: int("day_plan_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    dayPlanCommentUnique: uniqueIndex("day_plan_comments_owner_comment_unique").on(table.dayPlanId, table.commentId)
  })
);

export const featureComments = mysqlTable(
  "feature_comments",
  {
    featureId: int("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    featureCommentUnique: uniqueIndex("feature_comments_parent_comment_unique").on(table.featureId, table.commentId)
  })
);

export const useCaseComments = mysqlTable(
  "use_case_comments",
  {
    useCaseId: int("use_case_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    useCaseCommentUnique: uniqueIndex("use_case_comments_parent_comment_unique").on(table.useCaseId, table.commentId)
  })
);

export const backlogItemComments = mysqlTable(
  "backlog_item_comments",
  {
    backlogItemId: int("backlog_item_id")
      .notNull()
      .references(() => backlogItems.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    backlogItemCommentUnique: uniqueIndex("backlog_item_comments_parent_comment_unique").on(table.backlogItemId, table.commentId)
  })
);

export const wikiPageComments = mysqlTable(
  "wiki_page_comments",
  {
    wikiPageId: int("wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    wikiPageCommentUnique: uniqueIndex("wiki_page_comments_parent_comment_unique").on(table.wikiPageId, table.commentId)
  })
);

export const wikiPageAttachments = mysqlTable(
  "wiki_page_attachments",
  {
    wikiPageId: int("wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    wikiPageAttachmentUnique: uniqueIndex("wiki_page_attachments_parent_attachment_unique").on(table.wikiPageId, table.attachmentId)
  })
);

export const tags = mysqlTable(
  "tags",
  {
    id: int("id").autoincrement().primaryKey(),
    name: shortText("name").notNull(),
    color: shortText("color").notNull().default("#94a3b8"),
    isSystem: boolean("is_system").notNull().default(false),
    domain: shortText("domain").notNull().default("pm"),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    domainNameUnique: uniqueIndex("tags_domain_name_unique").on(table.domain, table.name)
  })
);

export const projectTags = mysqlTable("project_tags", {
  projectId: int("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  tagId: int("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const milestoneTags = mysqlTable("milestone_tags", {
  milestoneId: int("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  tagId: int("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const taskTags = mysqlTable("task_tags", {
  taskId: int("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  tagId: int("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  title: shortText("title").notNull().default("Ohne Titel"),
  contentJson: longtext("content_json").notNull().$defaultFn(() => "{}"),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const projectNotes = mysqlTable("project_notes", {
  projectId: int("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  noteId: int("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const milestoneNotes = mysqlTable("milestone_notes", {
  milestoneId: int("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  noteId: int("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const taskNotes = mysqlTable("task_notes", {
  taskId: int("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  noteId: int("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const dayPlanNotes = mysqlTable(
  "day_plan_notes",
  {
    dayPlanId: int("day_plan_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    noteId: int("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" })
  },
  (table) => ({
    dayPlanNoteUnique: uniqueIndex("day_plan_notes_owner_note_unique").on(table.dayPlanId, table.noteId)
  })
);

export const wikiPageNotes = mysqlTable(
  "wiki_page_notes",
  {
    wikiPageId: int("wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    noteId: int("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" })
  },
  (table) => ({
    wikiPageNoteUnique: uniqueIndex("wiki_page_notes_owner_note_unique").on(table.wikiPageId, table.noteId)
  })
);

export const attachments = mysqlTable(
  "attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    originalName: shortText("original_name").notNull(),
    filename: shortText("filename").notNull(),
    mimetype: shortText("mimetype").notNull(),
    size: int("size").notNull(),
    displayName: shortText("display_name"),
    description: longtext("description"),
    contentHash: varchar("content_hash", { length: 64 }),
    isInDocumentLibrary: boolean("is_in_document_library").notNull().default(true),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    contentHashIndex: index("attachments_content_hash_idx").on(table.contentHash),
    libraryCreatedAtIndex: index("attachments_library_created_at_idx").on(table.isInDocumentLibrary, table.createdAt),
    libraryMimetypeCreatedAtIndex: index("attachments_library_mimetype_created_at_idx").on(
      table.isInDocumentLibrary,
      table.mimetype,
      table.createdAt
    )
  })
);

export const projectAttachments = mysqlTable(
  "project_attachments",
  {
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    projectAttachmentUnique: uniqueIndex("project_attachments_parent_attachment_unique").on(table.projectId, table.attachmentId)
  })
);

export const milestoneAttachments = mysqlTable(
  "milestone_attachments",
  {
    milestoneId: int("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    milestoneAttachmentUnique: uniqueIndex("milestone_attachments_parent_attachment_unique").on(table.milestoneId, table.attachmentId)
  })
);

export const taskAttachments = mysqlTable(
  "task_attachments",
  {
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    taskAttachmentUnique: uniqueIndex("task_attachments_parent_attachment_unique").on(table.taskId, table.attachmentId)
  })
);

export const featureAttachments = mysqlTable(
  "feature_attachments",
  {
    featureId: int("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    featureAttachmentUnique: uniqueIndex("feature_attachments_parent_attachment_unique").on(table.featureId, table.attachmentId)
  })
);

export const ticketAttachments = mysqlTable(
  "ticket_attachments",
  {
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    ticketAttachmentUnique: uniqueIndex("ticket_attachments_parent_attachment_unique").on(table.ticketId, table.attachmentId)
  })
);

// Virtuelle Sammlung ("Ordner"): hierarchisch (Selbst-FK parent_id, restrict — kein
// DB-Kaskadenlöschen, der Service steuert die Löschung mit Bestätigung), optional an
// ein Projekt gebunden (project_id nullable, set null — Sammlung bleibt als globale).
export const attachmentFolders = mysqlTable("attachment_folders", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parent_id").references((): AnyMySqlColumn => attachmentFolders.id, { onDelete: "restrict" }),
  projectId: int("project_id").references(() => projects.id, { onDelete: "set null" }),
  name: shortText("name").notNull(),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const attachmentLocalFolders = mysqlTable(
  "attachment_local_folders",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerType: shortText("owner_type", { enum: ATTACHMENT_OWNER_TYPES }).notNull(),
    ownerId: int("owner_id").notNull(),
    name: shortText("name").notNull(),
    rootPath: longtext("root_path").notNull(),
    rootPathHash: varchar("root_path_hash", { length: 64 }).notNull(),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    ownerIndex: index("attachment_local_folders_owner_idx").on(table.ownerType, table.ownerId),
    ownerPathUnique: uniqueIndex("attachment_local_folders_owner_path_unique").on(
      table.ownerType,
      table.ownerId,
      table.rootPathHash
    )
  })
);

export const attachmentTags = mysqlTable(
  "attachment_tags",
  {
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" }),
    tagId: int("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.attachmentId, table.tagId] }),
    tagAttachmentIndex: index("attachment_tags_tag_attachment_idx").on(table.tagId, table.attachmentId)
  })
);

export const folderAttachments = mysqlTable(
  "folder_attachments",
  {
    folderId: int("folder_id")
      .notNull()
      .references(() => attachmentFolders.id, { onDelete: "cascade" }),
    attachmentId: int("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.folderId, table.attachmentId] }),
    oneDirectFolderPerAttachment: uniqueIndex("folder_attachments_attachment_unique").on(table.attachmentId)
  })
);

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: shortText("title").notNull(),
  description: longtext("description"),
  startTime: shortText("start_time").notNull(),
  endTime: shortText("end_time").notNull(),
  isAllDay: boolean("is_all_day").notNull().default(false),
  origin: shortText("origin", { enum: EVENT_ORIGINS }).notNull().default("local"),
  readonly: boolean("readonly").notNull().default(false),
  color: shortText("color").default("#6366f1"),
  reminderMinutes: int("reminder_minutes").notNull().default(60),
  responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const sentNotifications = mysqlTable(
  "sent_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: shortText("channel", { enum: NOTIFICATION_CHANNELS }).notNull(),
    reminderMinutes: int("reminder_minutes").notNull(),
    sentAt: timestampText("sent_at")
  },
  (table) => ({
    sentNotificationsUnique: uniqueIndex("sent_notifications_event_user_channel_reminder_unique").on(table.eventId, table.userId, table.channel, table.reminderMinutes),
    sentNotificationsEventIdx: index("sent_notifications_event_idx").on(table.eventId),
    sentNotificationsUserIdx: index("sent_notifications_user_idx").on(table.userId)
  })
);

export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: shortText("endpoint", { length: 512 }).notNull(),
    p256dh: shortText("p256dh").notNull(),
    auth: shortText("auth").notNull(),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    pushSubscriptionsEndpointUnique: uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    pushSubscriptionsUserIdx: index("push_subscriptions_user_idx").on(table.userId)
  })
);

export const projectEvents = mysqlTable(
  "project_events",
  {
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" })
  },
  (table) => ({
    projectEventUnique: uniqueIndex("project_events_parent_event_unique").on(table.projectId, table.eventId)
  })
);

export const taskEvents = mysqlTable(
  "task_events",
  {
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" })
  },
  (table) => ({
    taskEventUnique: uniqueIndex("task_events_parent_event_unique").on(table.taskId, table.eventId)
  })
);

export const milestoneEvents = mysqlTable(
  "milestone_events",
  {
    milestoneId: int("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" })
  },
  (table) => ({
    milestoneEventUnique: uniqueIndex("milestone_events_parent_event_unique").on(table.milestoneId, table.eventId)
  })
);

export const dayPlanEvents = mysqlTable(
  "day_plan_events",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    eventId: int("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    dayPlanEventUnique: uniqueIndex("day_plan_events_owner_event_unique").on(table.ownerId, table.eventId)
  })
);

// ---------------------------------------------------------------------------
// Kalender-Synchronisation (MS-79): Verbindungen zu externen Kalenderdiensten
// (Google bidirektional, NextCloud read-only via CalDAV), deren Sync-Zustand,
// die ausgewaehlten externen Kalender und das Mapping lokaler Termine auf
// externe Ereignisse. Credentials liegen verschluesselt in
// calendar_connections.encrypted_credentials (Krypto-Service in AP-0.2).
// ---------------------------------------------------------------------------
export const calendarConnections = mysqlTable(
  "calendar_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: shortText("provider", { enum: CALENDAR_PROVIDERS }).notNull(),
    displayName: shortText("display_name").notNull(),
    // Chiffrat der Zugangsdaten (Google Refresh Token bzw. NextCloud App-Passwort + URL/User);
    // nur ueber den Krypto-Service (AP-0.2) les-/schreibbar, nie im Klartext.
    encryptedCredentials: longtext("encrypted_credentials"),
    status: shortText("status", { enum: CALENDAR_CONNECTION_STATUSES }).notNull().default("active"),
    lastSyncAt: varchar("last_sync_at", { length: 32 }),
    lastError: longtext("last_error"),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    calendarConnectionsUserIdx: index("calendar_connections_user_idx").on(table.userId)
  })
);

export const externalCalendars = mysqlTable(
  "external_calendars",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionId: int("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    // Google: calendarId; NextCloud: CalDAV-href des Kalenders.
    externalId: shortText("external_id", { length: 512 }).notNull(),
    name: shortText("name"),
    color: shortText("color"),
    imported: boolean("imported").notNull().default(false),
    readonly: boolean("readonly").notNull().default(false),
    // Google-Push-Kanal (MS-79 AP-4.2): events.watch-Registrierung je Zielkalender. resourceId +
    // channelId werden für channels.stop benötigt, expiration (ms since epoch) für das Renewal.
    pushChannelId: shortText("push_channel_id"),
    pushResourceId: shortText("push_resource_id", { length: 512 }),
    pushExpiration: varchar("push_expiration", { length: 32 }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    externalCalendarsConnectionExternalUnique: uniqueIndex("external_calendars_connection_external_unique").on(table.connectionId, table.externalId),
    externalCalendarsConnectionIdx: index("external_calendars_connection_idx").on(table.connectionId)
  })
);

export const calendarSyncStates = mysqlTable(
  "calendar_sync_states",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionId: int("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    externalCalendarId: int("external_calendar_id")
      .notNull()
      .references(() => externalCalendars.id, { onDelete: "cascade" }),
    // Google nextSyncToken bzw. NextCloud sync-token (RFC 6578) – kann lang werden.
    syncToken: longtext("sync_token"),
    ctag: shortText("ctag"),
    lastSuccessAt: varchar("last_success_at", { length: 32 }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    calendarSyncStatesConnectionCalendarUnique: uniqueIndex("calendar_sync_states_connection_calendar_unique").on(table.connectionId, table.externalCalendarId)
  })
);

export const eventMappings = mysqlTable(
  "event_mappings",
  {
    id: int("id").autoincrement().primaryKey(),
    connectionId: int("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    externalCalendarId: int("external_calendar_id")
      .notNull()
      .references(() => externalCalendars.id, { onDelete: "cascade" }),
    localEventId: int("local_event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    // Google: event.id; NextCloud: CalDAV-href des Ereignisses.
    externalId: shortText("external_id", { length: 512 }).notNull(),
    iCalUid: shortText("ical_uid", { length: 512 }),
    etag: shortText("etag", { length: 255 }),
    // Zuletzt nach extern synchronisierte lokale version – Basis fuer Echo-/Konflikterkennung (AP-3.2).
    seenVersion: int("seen_version"),
    origin: shortText("origin", { enum: EVENT_ORIGINS }).notNull(),
    direction: shortText("direction", { enum: EVENT_MAPPING_DIRECTIONS }).notNull().default("import"),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    eventMappingsConnectionExternalUnique: uniqueIndex("event_mappings_connection_external_unique").on(table.connectionId, table.externalId),
    eventMappingsLocalEventIdx: index("event_mappings_local_event_idx").on(table.localEventId),
    eventMappingsExternalCalendarIdx: index("event_mappings_external_calendar_idx").on(table.externalCalendarId)
  })
);

/**
 * Sync-Journal (MS-79 AP-4.3, FT(10)): protokolliert Verbindungs-Anlage/-Trennung, Sync-Läufe,
 * Fehler und Konflikte. connectionId ist ON DELETE SET NULL, damit die Historie eine Trennung
 * überlebt; connectionLabel hält den Verbindungsnamen für die Anzeige unabhängig fest.
 */
export const calendarSyncJournal = mysqlTable(
  "calendar_sync_journal",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: int("connection_id").references(() => calendarConnections.id, { onDelete: "set null" }),
    connectionLabel: shortText("connection_label").notNull(),
    eventType: shortText("event_type", { enum: CALENDAR_JOURNAL_EVENT_TYPES }).notNull(),
    message: longtext("message"),
    createdAt: timestampText("created_at")
  },
  (table) => ({
    calendarSyncJournalUserIdx: index("calendar_sync_journal_user_idx").on(table.userId, table.id),
    calendarSyncJournalConnectionIdx: index("calendar_sync_journal_connection_idx").on(table.connectionId)
  })
);

export const features = mysqlTable(
  "features",
  {
    id: int("id").autoincrement().primaryKey(),
    title: shortText("title").notNull(),
    status: shortText("status").notNull().default("draft"),
    description: longtext("description"),
    content: longtext("content"),
    sortOrder: int("sort_order").notNull().default(0),
    responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    sortOrderStatusIdx: index("features_sort_order_status_idx").on(table.sortOrder, table.status)
  })
);

export const useCases = mysqlTable(
  "use_cases",
  {
    id: int("id").autoincrement().primaryKey(),
    featureId: int("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    title: shortText("title").notNull(),
    status: shortText("status").notNull().default("draft"),
    description: longtext("description"),
    content: longtext("content"),
    sortOrder: int("sort_order").notNull().default(0),
    responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    featureSortOrderIdx: index("use_cases_feature_sort_order_idx").on(table.featureId, table.sortOrder)
  })
);

export const featureRelations = mysqlTable(
  "feature_relations",
  {
    sourceFeatureId: int("source_feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    targetFeatureId: int("target_feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    relationType: shortText("relation_type", { enum: FEATURE_RELATION_TYPES }).notNull().default("related"),
    description: longtext("description"),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    featureRelationUnique: uniqueIndex("feature_relations_source_target_type_unique").on(table.sourceFeatureId, table.targetFeatureId, table.relationType),
    noSelfRelation: check("feature_relations_no_self_relation", sql`${table.sourceFeatureId} <> ${table.targetFeatureId}`)
  })
);

export const wikiPages = mysqlTable("wiki_pages", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parent_id").references((): AnyMySqlColumn => wikiPages.id, { onDelete: "restrict" }),
  title: shortText("title").notNull(),
  content: longtext("content"),
  sortOrder: int("sort_order").notNull().default(0),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

// Tagebuch: eine lebende, versionierte Erzählung je Projekt. Bewusst ein direkter
// projectId-FK statt eines polymorphen Owner-Joins (wie bei Kommentaren/Anhängen),
// da ein Tagebuch-Strang strikt zu genau einem Projekt gehört (FT(16)/MS-70).
export const diaryEntries = mysqlTable(
  "diary_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: shortText("title").notNull(),
    content: longtext("content"),
    coveredUntil: varchar("covered_until", { length: 32 }),
    sourceCount: int("source_count").notNull().default(0),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    diaryEntriesProjectUnique: uniqueIndex("diary_entries_project_unique").on(table.projectId)
  })
);

export const wikiPageRelations = mysqlTable(
  "wiki_page_relations",
  {
    sourceWikiPageId: int("source_wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    targetWikiPageId: int("target_wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    wikiPageRelationUnique: uniqueIndex("wiki_page_relations_source_target_unique").on(table.sourceWikiPageId, table.targetWikiPageId),
    noSelfRelation: check("wiki_page_relations_no_self_relation", sql`${table.sourceWikiPageId} <> ${table.targetWikiPageId}`)
  })
);

export const contentImages = mysqlTable(
  "content_images",
  {
    id: shortText("id").primaryKey(),
    mimeType: shortText("mime_type").notNull(),
    data: longblob("data", { mode: "buffer" }).notNull(),
    size: int("size").notNull(),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    contentImagesCreatedAtIdx: index("content_images_created_at_idx").on(table.createdAt)
  })
);

export const backlogItems = mysqlTable(
  "backlog_items",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    featureId: int("feature_id").references(() => features.id, { onDelete: "set null" }),
    useCaseId: int("use_case_id").references(() => useCases.id, { onDelete: "set null" }),
    title: shortText("title").notNull(),
    description: longtext("description"),
    status: shortText("status").notNull().default("open"),
    importKey: shortText("import_key"),
    sortOrder: int("sort_order").notNull().default(0),
    responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
    version: int("version").notNull().default(1),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestampText("created_at"),
    updatedAt: timestampText("updated_at")
  },
  (table) => ({
    projectImportKeyUnique: uniqueIndex("backlog_items_project_import_key_unique").on(table.projectId, table.importKey),
    projectStatusIdx: index("backlog_items_project_status_idx").on(table.projectId, table.status)
  })
);

export const projectFeatures = mysqlTable("project_features", {
  projectId: int("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  featureId: int("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" })
});

export const milestoneFeatures = mysqlTable("milestone_features", {
  milestoneId: int("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  featureId: int("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" })
});

export const projectTasks = mysqlTable(
  "project_tasks",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    projectTaskUnique: uniqueIndex("project_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const milestoneTasks = mysqlTable(
  "milestone_tasks",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    milestoneTaskUnique: uniqueIndex("milestone_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const dayPlanTasks = mysqlTable(
  "day_plan_tasks",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => dayPlans.id, { onDelete: "cascade" }),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    dayPlanTaskUnique: uniqueIndex("day_plan_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const featureTasks = mysqlTable(
  "feature_tasks",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    featureTaskUnique: uniqueIndex("feature_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const useCaseTasks = mysqlTable(
  "use_case_tasks",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    useCaseTaskUnique: uniqueIndex("use_case_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const wikiPageTasks = mysqlTable(
  "wiki_page_tasks",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    wikiPageTaskUnique: uniqueIndex("wiki_page_tasks_owner_task_unique").on(table.ownerId, table.taskId)
  })
);

export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parent_id").references((): AnyMySqlColumn => tickets.id, { onDelete: "cascade" }),
  type: shortText("type").notNull().default("bug"),
  title: shortText("title").notNull(),
  description: longtext("description"),
  status: shortText("status").notNull().default("open"),
  priority: shortText("priority").notNull().default("medium"),
  resolution: shortText("resolution", { enum: TICKET_RESOLUTIONS }),
  reporterUserId: int("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
  responsibleUserId: int("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  environment: shortText("environment"),
  affectedVersion: shortText("affected_version"),
  dueDate: shortText("due_date"),
  resolvedAt: shortText("resolved_at"),
  position: double("position").notNull().default(0),
  version: int("version").notNull().default(1),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestampText("created_at"),
  updatedAt: timestampText("updated_at")
});

export const projectTickets = mysqlTable(
  "project_tickets",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    projectTicketUnique: uniqueIndex("project_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const milestoneTickets = mysqlTable(
  "milestone_tickets",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    milestoneTicketUnique: uniqueIndex("milestone_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const taskTickets = mysqlTable(
  "task_tickets",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    taskTicketUnique: uniqueIndex("task_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const featureTickets = mysqlTable(
  "feature_tickets",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    featureTicketUnique: uniqueIndex("feature_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const useCaseTickets = mysqlTable(
  "use_case_tickets",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => useCases.id, { onDelete: "cascade" }),
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    useCaseTicketUnique: uniqueIndex("use_case_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const wikiPageTickets = mysqlTable(
  "wiki_page_tickets",
  {
    ownerId: int("owner_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    position: double("position").notNull().default(0)
  },
  (table) => ({
    wikiPageTicketUnique: uniqueIndex("wiki_page_tickets_owner_ticket_unique").on(table.ownerId, table.ticketId)
  })
);

export const ticketRelations = mysqlTable(
  "ticket_relations",
  {
    sourceTicketId: int("source_ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    targetTicketId: int("target_ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    relationType: shortText("relation_type", { enum: TICKET_RELATION_TYPES }).notNull().default("related"),
    createdAt: timestampText("created_at")
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

export const ticketTags = mysqlTable("ticket_tags", {
  ticketId: int("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  tagId: int("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const ticketNotes = mysqlTable("ticket_notes", {
  ticketId: int("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  noteId: int("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});

export const ticketComments = mysqlTable(
  "ticket_comments",
  {
    ticketId: int("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    ticketCommentUnique: uniqueIndex("ticket_comments_parent_comment_unique").on(table.ticketId, table.commentId)
  })
);

