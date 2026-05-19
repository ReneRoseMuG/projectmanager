DROP TRIGGER IF EXISTS `backlog_item_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `feature_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `project_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `task_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `ticket_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `use_case_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `wiki_page_comments_delete_orphan_comment`;--> statement-breakpoint
CREATE TABLE `__new_attachments` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`original_name` text NOT NULL,
`filename` text NOT NULL,
`mimetype` text NOT NULL,
`size` integer NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer,
`updated_by` integer,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_attachments` (`id`, `original_name`, `filename`, `mimetype`, `size`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`) SELECT `id`, `original_name`, `filename`, `mimetype`, `size`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at` FROM `attachments`;--> statement-breakpoint
DROP TABLE `attachments`;--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;--> statement-breakpoint
CREATE TABLE `__new_backlog_item_comments` (
`backlog_item_id` integer NOT NULL,
`comment_id` integer NOT NULL,
FOREIGN KEY (`backlog_item_id`) REFERENCES `backlog_items`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_backlog_item_comments` (`backlog_item_id`, `comment_id`) SELECT `backlog_item_id`, `comment_id` FROM `backlog_item_comments`;--> statement-breakpoint
DROP TABLE `backlog_item_comments`;--> statement-breakpoint
ALTER TABLE `__new_backlog_item_comments` RENAME TO `backlog_item_comments`;--> statement-breakpoint
CREATE UNIQUE INDEX `backlog_item_comments_parent_comment_unique` ON `backlog_item_comments` (`backlog_item_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_backlog_items` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`project_id` integer NOT NULL,
`feature_id` integer,
`use_case_id` integer,
`title` text NOT NULL,
`description` text,
`status` text DEFAULT 'open' NOT NULL,
`priority` text DEFAULT 'medium' NOT NULL,
`sort_order` integer DEFAULT 0 NOT NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`import_key` text,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE set null,
FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_backlog_items` (`id`, `project_id`, `feature_id`, `use_case_id`, `title`, `description`, `status`, `priority`, `sort_order`, `created_at`, `updated_at`, `import_key`, `version`, `created_by`, `updated_by`) SELECT `id`, `project_id`, `feature_id`, `use_case_id`, `title`, `description`, `status`, `priority`, `sort_order`, `created_at`, `updated_at`, `import_key`, `version`, `created_by`, `updated_by` FROM `backlog_items`;--> statement-breakpoint
DROP TABLE `backlog_items`;--> statement-breakpoint
ALTER TABLE `__new_backlog_items` RENAME TO `backlog_items`;--> statement-breakpoint
CREATE UNIQUE INDEX `backlog_items_project_import_key_unique` ON `backlog_items` (`project_id`,`import_key`);--> statement-breakpoint
CREATE TABLE `__new_comments` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`body` text NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer,
`updated_by` integer,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_comments` (`id`, `body`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`) SELECT `id`, `body`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at` FROM `comments`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;--> statement-breakpoint
CREATE TABLE `__new_events` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`title` text NOT NULL,
`description` text,
`start_time` text NOT NULL,
`end_time` text NOT NULL,
`is_all_day` integer DEFAULT false NOT NULL,
`color` text DEFAULT '#6366f1',
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer,
`updated_by` integer,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_events` (`id`, `title`, `description`, `start_time`, `end_time`, `is_all_day`, `color`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`) SELECT `id`, `title`, `description`, `start_time`, `end_time`, `is_all_day`, `color`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at` FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
CREATE TABLE `__new_feature_attachments` (
`feature_id` integer NOT NULL,
`attachment_id` integer NOT NULL,
FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_feature_attachments` (`feature_id`, `attachment_id`) SELECT `feature_id`, `attachment_id` FROM `feature_attachments`;--> statement-breakpoint
DROP TABLE `feature_attachments`;--> statement-breakpoint
ALTER TABLE `__new_feature_attachments` RENAME TO `feature_attachments`;--> statement-breakpoint
CREATE UNIQUE INDEX `feature_attachments_parent_attachment_unique` ON `feature_attachments` (`feature_id`,`attachment_id`);--> statement-breakpoint
CREATE TABLE `__new_feature_comments` (
`feature_id` integer NOT NULL,
`comment_id` integer NOT NULL,
FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_feature_comments` (`feature_id`, `comment_id`) SELECT `feature_id`, `comment_id` FROM `feature_comments`;--> statement-breakpoint
DROP TABLE `feature_comments`;--> statement-breakpoint
ALTER TABLE `__new_feature_comments` RENAME TO `feature_comments`;--> statement-breakpoint
CREATE UNIQUE INDEX `feature_comments_parent_comment_unique` ON `feature_comments` (`feature_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_feature_relations` (
`source_feature_id` integer NOT NULL,
`target_feature_id` integer NOT NULL,
`relation_type` text DEFAULT 'related' NOT NULL,
`description` text,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
FOREIGN KEY (`source_feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`target_feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_feature_relations` (`source_feature_id`, `target_feature_id`, `relation_type`, `description`, `created_at`, `updated_at`) SELECT `source_feature_id`, `target_feature_id`, `relation_type`, `description`, `created_at`, `updated_at` FROM `feature_relations`;--> statement-breakpoint
DROP TABLE `feature_relations`;--> statement-breakpoint
ALTER TABLE `__new_feature_relations` RENAME TO `feature_relations`;--> statement-breakpoint
CREATE UNIQUE INDEX `feature_relations_source_target_type_unique` ON `feature_relations` (`source_feature_id`,`target_feature_id`,`relation_type`);--> statement-breakpoint
CREATE TABLE `__new_feature_tasks` (
`owner_id` integer NOT NULL,
`task_id` integer NOT NULL,
`position` real DEFAULT 0 NOT NULL,
FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_feature_tasks` (`owner_id`, `task_id`, `position`) SELECT `owner_id`, `task_id`, `position` FROM `feature_tasks`;--> statement-breakpoint
DROP TABLE `feature_tasks`;--> statement-breakpoint
ALTER TABLE `__new_feature_tasks` RENAME TO `feature_tasks`;--> statement-breakpoint
CREATE UNIQUE INDEX `feature_tasks_owner_task_unique` ON `feature_tasks` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `__new_feature_tickets` (
`owner_id` integer NOT NULL,
`ticket_id` integer NOT NULL,
`position` real DEFAULT 0 NOT NULL,
FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_feature_tickets` (`owner_id`, `ticket_id`, `position`) SELECT `owner_id`, `ticket_id`, `position` FROM `feature_tickets`;--> statement-breakpoint
DROP TABLE `feature_tickets`;--> statement-breakpoint
ALTER TABLE `__new_feature_tickets` RENAME TO `feature_tickets`;--> statement-breakpoint
CREATE UNIQUE INDEX `feature_tickets_owner_ticket_unique` ON `feature_tickets` (`owner_id`,`ticket_id`);--> statement-breakpoint
CREATE TABLE `__new_features` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`title` text NOT NULL,
`slug` text NOT NULL,
`status` text DEFAULT 'draft' NOT NULL,
`description` text,
`content_path` text,
`sort_order` integer DEFAULT 0 NOT NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL
);--> statement-breakpoint
INSERT INTO `__new_features` (`id`, `title`, `slug`, `status`, `description`, `content_path`, `sort_order`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by`) SELECT `id`, `title`, `slug`, `status`, `description`, `content_path`, `sort_order`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by` FROM `features`;--> statement-breakpoint
DROP TABLE `features`;--> statement-breakpoint
ALTER TABLE `__new_features` RENAME TO `features`;--> statement-breakpoint
CREATE UNIQUE INDEX `features_slug_unique` ON `features` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_notes` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`title` text DEFAULT 'Ohne Titel' NOT NULL,
`content_json` text DEFAULT '{}' NOT NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL
);--> statement-breakpoint
INSERT INTO `__new_notes` (`id`, `title`, `content_json`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by`) SELECT `id`, `title`, `content_json`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by` FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
CREATE TABLE `__new_project_attachments` (
`project_id` integer NOT NULL,
`attachment_id` integer NOT NULL,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_attachments` (`project_id`, `attachment_id`) SELECT `project_id`, `attachment_id` FROM `project_attachments`;--> statement-breakpoint
DROP TABLE `project_attachments`;--> statement-breakpoint
ALTER TABLE `__new_project_attachments` RENAME TO `project_attachments`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_attachments_parent_attachment_unique` ON `project_attachments` (`project_id`,`attachment_id`);--> statement-breakpoint
CREATE TABLE `__new_project_comments` (
`project_id` integer NOT NULL,
`comment_id` integer NOT NULL,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_comments` (`project_id`, `comment_id`) SELECT `project_id`, `comment_id` FROM `project_comments`;--> statement-breakpoint
DROP TABLE `project_comments`;--> statement-breakpoint
ALTER TABLE `__new_project_comments` RENAME TO `project_comments`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_comments_parent_comment_unique` ON `project_comments` (`project_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_project_events` (
`project_id` integer NOT NULL,
`event_id` integer NOT NULL,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_events` (`project_id`, `event_id`) SELECT `project_id`, `event_id` FROM `project_events`;--> statement-breakpoint
DROP TABLE `project_events`;--> statement-breakpoint
ALTER TABLE `__new_project_events` RENAME TO `project_events`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_events_parent_event_unique` ON `project_events` (`project_id`,`event_id`);--> statement-breakpoint
CREATE TABLE `__new_project_features` (
`project_id` integer NOT NULL,
`feature_id` integer NOT NULL,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_features` (`project_id`, `feature_id`) SELECT `project_id`, `feature_id` FROM `project_features`;--> statement-breakpoint
DROP TABLE `project_features`;--> statement-breakpoint
ALTER TABLE `__new_project_features` RENAME TO `project_features`;--> statement-breakpoint
CREATE TABLE `__new_project_notes` (
`project_id` integer NOT NULL,
`note_id` integer NOT NULL,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_notes` (`project_id`, `note_id`) SELECT `project_id`, `note_id` FROM `project_notes`;--> statement-breakpoint
DROP TABLE `project_notes`;--> statement-breakpoint
ALTER TABLE `__new_project_notes` RENAME TO `project_notes`;--> statement-breakpoint
CREATE TABLE `__new_project_tags` (
`project_id` integer NOT NULL,
`tag_id` integer NOT NULL,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_tags` (`project_id`, `tag_id`) SELECT `project_id`, `tag_id` FROM `project_tags`;--> statement-breakpoint
DROP TABLE `project_tags`;--> statement-breakpoint
ALTER TABLE `__new_project_tags` RENAME TO `project_tags`;--> statement-breakpoint
CREATE TABLE `__new_project_tasks` (
`owner_id` integer NOT NULL,
`task_id` integer NOT NULL,
`position` real DEFAULT 0 NOT NULL,
FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_tasks` (`owner_id`, `task_id`, `position`) SELECT `owner_id`, `task_id`, `position` FROM `project_tasks`;--> statement-breakpoint
DROP TABLE `project_tasks`;--> statement-breakpoint
ALTER TABLE `__new_project_tasks` RENAME TO `project_tasks`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_tasks_owner_task_unique` ON `project_tasks` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `__new_project_tickets` (
`owner_id` integer NOT NULL,
`ticket_id` integer NOT NULL,
`position` real DEFAULT 0 NOT NULL,
FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_project_tickets` (`owner_id`, `ticket_id`, `position`) SELECT `owner_id`, `ticket_id`, `position` FROM `project_tickets`;--> statement-breakpoint
DROP TABLE `project_tickets`;--> statement-breakpoint
ALTER TABLE `__new_project_tickets` RENAME TO `project_tickets`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_tickets_owner_ticket_unique` ON `project_tickets` (`owner_id`,`ticket_id`);--> statement-breakpoint
CREATE TABLE `__new_projects` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`name` text NOT NULL,
`description` text,
`status` text DEFAULT 'active' NOT NULL,
`color` text DEFAULT '#6366f1',
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`start_date` text,
`due_date` text,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL
);--> statement-breakpoint
INSERT INTO `__new_projects` (`id`, `name`, `description`, `status`, `color`, `created_at`, `updated_at`, `start_date`, `due_date`, `version`, `created_by`, `updated_by`) SELECT `id`, `name`, `description`, `status`, `color`, `created_at`, `updated_at`, `start_date`, `due_date`, `version`, `created_by`, `updated_by` FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE TABLE `__new_tags` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`name` text NOT NULL,
`color` text DEFAULT '#94a3b8' NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_tags` (`id`, `name`, `color`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`) SELECT `id`, `name`, `color`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at` FROM `tags`;--> statement-breakpoint
DROP TABLE `tags`;--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `__new_task_attachments` (
`task_id` integer NOT NULL,
`attachment_id` integer NOT NULL,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_task_attachments` (`task_id`, `attachment_id`) SELECT `task_id`, `attachment_id` FROM `task_attachments`;--> statement-breakpoint
DROP TABLE `task_attachments`;--> statement-breakpoint
ALTER TABLE `__new_task_attachments` RENAME TO `task_attachments`;--> statement-breakpoint
CREATE UNIQUE INDEX `task_attachments_parent_attachment_unique` ON `task_attachments` (`task_id`,`attachment_id`);--> statement-breakpoint
CREATE TABLE `__new_task_comments` (
`task_id` integer NOT NULL,
`comment_id` integer NOT NULL,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_task_comments` (`task_id`, `comment_id`) SELECT `task_id`, `comment_id` FROM `task_comments`;--> statement-breakpoint
DROP TABLE `task_comments`;--> statement-breakpoint
ALTER TABLE `__new_task_comments` RENAME TO `task_comments`;--> statement-breakpoint
CREATE UNIQUE INDEX `task_comments_parent_comment_unique` ON `task_comments` (`task_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_task_events` (
`task_id` integer NOT NULL,
`event_id` integer NOT NULL,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_task_events` (`task_id`, `event_id`) SELECT `task_id`, `event_id` FROM `task_events`;--> statement-breakpoint
DROP TABLE `task_events`;--> statement-breakpoint
ALTER TABLE `__new_task_events` RENAME TO `task_events`;--> statement-breakpoint
CREATE UNIQUE INDEX `task_events_parent_event_unique` ON `task_events` (`task_id`,`event_id`);--> statement-breakpoint
CREATE TABLE `__new_task_notes` (
`task_id` integer NOT NULL,
`note_id` integer NOT NULL,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_task_notes` (`task_id`, `note_id`) SELECT `task_id`, `note_id` FROM `task_notes`;--> statement-breakpoint
DROP TABLE `task_notes`;--> statement-breakpoint
ALTER TABLE `__new_task_notes` RENAME TO `task_notes`;--> statement-breakpoint
CREATE TABLE `__new_task_tags` (
`task_id` integer NOT NULL,
`tag_id` integer NOT NULL,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_task_tags` (`task_id`, `tag_id`) SELECT `task_id`, `tag_id` FROM `task_tags`;--> statement-breakpoint
DROP TABLE `task_tags`;--> statement-breakpoint
ALTER TABLE `__new_task_tags` RENAME TO `task_tags`;--> statement-breakpoint
CREATE TABLE `__new_task_tickets` (
`owner_id` integer NOT NULL,
`ticket_id` integer NOT NULL,
`position` real DEFAULT 0 NOT NULL,
FOREIGN KEY (`owner_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_task_tickets` (`owner_id`, `ticket_id`, `position`) SELECT `owner_id`, `ticket_id`, `position` FROM `task_tickets`;--> statement-breakpoint
DROP TABLE `task_tickets`;--> statement-breakpoint
ALTER TABLE `__new_task_tickets` RENAME TO `task_tickets`;--> statement-breakpoint
CREATE UNIQUE INDEX `task_tickets_owner_ticket_unique` ON `task_tickets` (`owner_id`,`ticket_id`);--> statement-breakpoint
CREATE TABLE `__new_tasks` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`parent_id` integer,
`title` text NOT NULL,
`description` text,
`status` text DEFAULT 'todo' NOT NULL,
`priority` text DEFAULT 'medium' NOT NULL,
`assignee` text,
`due_date` text,
`import_key` text,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_tasks` (`id`, `parent_id`, `title`, `description`, `status`, `priority`, `assignee`, `due_date`, `import_key`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by`) SELECT `id`, `parent_id`, `title`, `description`, `status`, `priority`, `assignee`, `due_date`, `import_key`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by` FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
CREATE TABLE `__new_ticket_attachments` (
`ticket_id` integer NOT NULL,
`attachment_id` integer NOT NULL,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_ticket_attachments` (`ticket_id`, `attachment_id`) SELECT `ticket_id`, `attachment_id` FROM `ticket_attachments`;--> statement-breakpoint
DROP TABLE `ticket_attachments`;--> statement-breakpoint
ALTER TABLE `__new_ticket_attachments` RENAME TO `ticket_attachments`;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_attachments_parent_attachment_unique` ON `ticket_attachments` (`ticket_id`,`attachment_id`);--> statement-breakpoint
CREATE TABLE `__new_ticket_comments` (
`ticket_id` integer NOT NULL,
`comment_id` integer NOT NULL,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_ticket_comments` (`ticket_id`, `comment_id`) SELECT `ticket_id`, `comment_id` FROM `ticket_comments`;--> statement-breakpoint
DROP TABLE `ticket_comments`;--> statement-breakpoint
ALTER TABLE `__new_ticket_comments` RENAME TO `ticket_comments`;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_comments_parent_comment_unique` ON `ticket_comments` (`ticket_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_ticket_notes` (
`ticket_id` integer NOT NULL,
`note_id` integer NOT NULL,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_ticket_notes` (`ticket_id`, `note_id`) SELECT `ticket_id`, `note_id` FROM `ticket_notes`;--> statement-breakpoint
DROP TABLE `ticket_notes`;--> statement-breakpoint
ALTER TABLE `__new_ticket_notes` RENAME TO `ticket_notes`;--> statement-breakpoint
CREATE TABLE `__new_ticket_relations` (
`source_ticket_id` integer NOT NULL,
`target_ticket_id` integer NOT NULL,
`relation_type` text DEFAULT 'related' NOT NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
CONSTRAINT `ticket_relations_no_self_relation` CHECK (`source_ticket_id` <> `target_ticket_id`),
FOREIGN KEY (`source_ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`target_ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_ticket_relations` (`source_ticket_id`, `target_ticket_id`, `relation_type`, `created_at`) SELECT `source_ticket_id`, `target_ticket_id`, `relation_type`, `created_at` FROM `ticket_relations`;--> statement-breakpoint
DROP TABLE `ticket_relations`;--> statement-breakpoint
ALTER TABLE `__new_ticket_relations` RENAME TO `ticket_relations`;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_relations_source_target_type_unique` ON `ticket_relations` (`source_ticket_id`,`target_ticket_id`,`relation_type`);--> statement-breakpoint
CREATE TABLE `__new_ticket_tags` (
`ticket_id` integer NOT NULL,
`tag_id` integer NOT NULL,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_ticket_tags` (`ticket_id`, `tag_id`) SELECT `ticket_id`, `tag_id` FROM `ticket_tags`;--> statement-breakpoint
DROP TABLE `ticket_tags`;--> statement-breakpoint
ALTER TABLE `__new_ticket_tags` RENAME TO `ticket_tags`;--> statement-breakpoint
CREATE TABLE `__new_tickets` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`parent_id` integer,
`type` text DEFAULT 'bug' NOT NULL,
`title` text NOT NULL,
`description` text,
`status` text DEFAULT 'open' NOT NULL,
`priority` text DEFAULT 'medium' NOT NULL,
`resolution` text,
`reporter` text,
`assignee` text,
`environment` text,
`affected_version` text,
`due_date` text,
`resolved_at` text,
`position` real DEFAULT 0 NOT NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
FOREIGN KEY (`parent_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_tickets` (`id`, `parent_id`, `type`, `title`, `description`, `status`, `priority`, `resolution`, `reporter`, `assignee`, `environment`, `affected_version`, `due_date`, `resolved_at`, `position`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by`) SELECT `id`, `parent_id`, `type`, `title`, `description`, `status`, `priority`, `resolution`, `reporter`, `assignee`, `environment`, `affected_version`, `due_date`, `resolved_at`, `position`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by` FROM `tickets`;--> statement-breakpoint
DROP TABLE `tickets`;--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;--> statement-breakpoint
CREATE TABLE `__new_use_case_comments` (
`use_case_id` integer NOT NULL,
`comment_id` integer NOT NULL,
FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_use_case_comments` (`use_case_id`, `comment_id`) SELECT `use_case_id`, `comment_id` FROM `use_case_comments`;--> statement-breakpoint
DROP TABLE `use_case_comments`;--> statement-breakpoint
ALTER TABLE `__new_use_case_comments` RENAME TO `use_case_comments`;--> statement-breakpoint
CREATE UNIQUE INDEX `use_case_comments_parent_comment_unique` ON `use_case_comments` (`use_case_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_use_case_tasks` (
`owner_id` integer NOT NULL,
`task_id` integer NOT NULL,
`position` real DEFAULT 0 NOT NULL,
FOREIGN KEY (`owner_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_use_case_tasks` (`owner_id`, `task_id`, `position`) SELECT `owner_id`, `task_id`, `position` FROM `use_case_tasks`;--> statement-breakpoint
DROP TABLE `use_case_tasks`;--> statement-breakpoint
ALTER TABLE `__new_use_case_tasks` RENAME TO `use_case_tasks`;--> statement-breakpoint
CREATE UNIQUE INDEX `use_case_tasks_owner_task_unique` ON `use_case_tasks` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `__new_use_case_tickets` (
`owner_id` integer NOT NULL,
`ticket_id` integer NOT NULL,
`position` real DEFAULT 0 NOT NULL,
FOREIGN KEY (`owner_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_use_case_tickets` (`owner_id`, `ticket_id`, `position`) SELECT `owner_id`, `ticket_id`, `position` FROM `use_case_tickets`;--> statement-breakpoint
DROP TABLE `use_case_tickets`;--> statement-breakpoint
ALTER TABLE `__new_use_case_tickets` RENAME TO `use_case_tickets`;--> statement-breakpoint
CREATE UNIQUE INDEX `use_case_tickets_owner_ticket_unique` ON `use_case_tickets` (`owner_id`,`ticket_id`);--> statement-breakpoint
CREATE TABLE `__new_use_cases` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`feature_id` integer NOT NULL,
`title` text NOT NULL,
`slug` text NOT NULL,
`status` text DEFAULT 'draft' NOT NULL,
`description` text,
`content_path` text,
`sort_order` integer DEFAULT 0 NOT NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_use_cases` (`id`, `feature_id`, `title`, `slug`, `status`, `description`, `content_path`, `sort_order`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by`) SELECT `id`, `feature_id`, `title`, `slug`, `status`, `description`, `content_path`, `sort_order`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by` FROM `use_cases`;--> statement-breakpoint
DROP TABLE `use_cases`;--> statement-breakpoint
ALTER TABLE `__new_use_cases` RENAME TO `use_cases`;--> statement-breakpoint
CREATE UNIQUE INDEX `use_cases_slug_unique` ON `use_cases` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_wiki_page_comments` (
`wiki_page_id` integer NOT NULL,
`comment_id` integer NOT NULL,
FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_wiki_page_comments` (`wiki_page_id`, `comment_id`) SELECT `wiki_page_id`, `comment_id` FROM `wiki_page_comments`;--> statement-breakpoint
DROP TABLE `wiki_page_comments`;--> statement-breakpoint
ALTER TABLE `__new_wiki_page_comments` RENAME TO `wiki_page_comments`;--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_comments_parent_comment_unique` ON `wiki_page_comments` (`wiki_page_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `__new_wiki_pages` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`parent_id` integer,
`project_id` integer,
`title` text NOT NULL,
`slug` text NOT NULL,
`content_path` text,
`sort_order` integer DEFAULT 0 NOT NULL,
`created_at` text DEFAULT (datetime('now')) NOT NULL,
`updated_at` text DEFAULT (datetime('now')) NOT NULL,
`version` integer DEFAULT 1 NOT NULL,
`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
FOREIGN KEY (`parent_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE restrict,
FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_wiki_pages` (`id`, `parent_id`, `project_id`, `title`, `slug`, `content_path`, `sort_order`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by`) SELECT `id`, `parent_id`, `project_id`, `title`, `slug`, `content_path`, `sort_order`, `created_at`, `updated_at`, `version`, `created_by`, `updated_by` FROM `wiki_pages`;--> statement-breakpoint
DROP TABLE `wiki_pages`;--> statement-breakpoint
ALTER TABLE `__new_wiki_pages` RENAME TO `wiki_pages`;--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_pages_slug_unique` ON `wiki_pages` (`slug`);--> statement-breakpoint
DROP TABLE `seed_run_items`;--> statement-breakpoint
DROP TABLE `seed_runs`;--> statement-breakpoint
CREATE TRIGGER `backlog_item_comments_delete_orphan_comment` AFTER DELETE ON `backlog_item_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `feature_comments_delete_orphan_comment` AFTER DELETE ON `feature_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `project_comments_delete_orphan_comment` AFTER DELETE ON `project_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `task_comments_delete_orphan_comment` AFTER DELETE ON `task_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `ticket_comments_delete_orphan_comment` AFTER DELETE ON `ticket_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `use_case_comments_delete_orphan_comment` AFTER DELETE ON `use_case_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `wiki_page_comments_delete_orphan_comment` AFTER DELETE ON `wiki_page_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
