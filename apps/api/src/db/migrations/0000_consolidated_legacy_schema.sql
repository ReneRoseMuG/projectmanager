-- Consolidated legacy baseline from migrations 0000 through 0027.
-- Existing databases skip this entry through the original 0000 migration timestamp.

-- Source migration: 0000_special_shaman.sql
CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`task_id` integer,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`color` text DEFAULT '#0f766e',
	`project_id` integer,
	`task_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text DEFAULT 'Ohne Titel' NOT NULL,
	`content_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_notes` (
	`project_id` integer NOT NULL,
	`note_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_tags` (
	`project_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`color` text DEFAULT '#0f766e',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#64748b' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_notes` (
	`task_id` integer NOT NULL,
	`note_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_tags` (
	`task_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`parent_id` integer,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`assignee` text,
	`due_date` text,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);
--> statement-breakpoint

-- Source migration: 0001_wakeful_the_call.sql
PRAGMA defer_foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`task_id` integer,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `attachments_exactly_one_owner` CHECK ((`project_id` is not null and `task_id` is null) or (`project_id` is null and `task_id` is not null)),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attachments` (`id`, `project_id`, `task_id`, `original_name`, `filename`, `mimetype`, `size`, `created_at`)
SELECT `id`, `project_id`, `task_id`, `original_name`, `filename`, `mimetype`, `size`, `created_at` FROM `attachments`;
--> statement-breakpoint
DROP TABLE `attachments`;
--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;
--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`color` text DEFAULT '#6366f1',
	`project_id` integer,
	`task_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_events` (`id`, `title`, `description`, `start_time`, `end_time`, `is_all_day`, `color`, `project_id`, `task_id`, `created_at`, `updated_at`)
SELECT `id`, `title`, `description`, `start_time`, `end_time`, `is_all_day`, `color`, `project_id`, `task_id`, `created_at`, `updated_at` FROM `events`;
--> statement-breakpoint
DROP TABLE `events`;
--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;
--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`color` text DEFAULT '#6366f1',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_projects` (`id`, `name`, `description`, `status`, `color`, `created_at`, `updated_at`)
SELECT `id`, `name`, `description`, `status`, `color`, `created_at`, `updated_at` FROM `projects`;
--> statement-breakpoint
DROP TABLE `projects`;
--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;
--> statement-breakpoint
CREATE TABLE `__new_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#94a3b8' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tags` (`id`, `name`, `color`)
SELECT `id`, `name`, `color` FROM `tags`;
--> statement-breakpoint
DROP TABLE `tags`;
--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);
--> statement-breakpoint

-- Source migration: 0002_minor_sinister_six.sql
CREATE TABLE `backlog_items` (
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
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`description` text,
	`content_path` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_features` (
	`project_id` integer NOT NULL,
	`feature_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_features` (
	`task_id` integer NOT NULL,
	`feature_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_use_cases` (
	`task_id` integer NOT NULL,
	`use_case_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `use_cases` (
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
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wiki_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`project_id` integer,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content_path` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `features_slug_unique` ON `features` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `use_cases_slug_unique` ON `use_cases` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_pages_slug_unique` ON `wiki_pages` (`slug`);
--> statement-breakpoint

-- Source migration: 0003_swift_the_initiative.sql
ALTER TABLE tasks ADD `import_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_import_key_unique` ON `tasks` (`project_id`,`import_key`);
--> statement-breakpoint

-- Source migration: 0004_even_skin.sql
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `comments_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `task_id` integer,
  `entity_type` text DEFAULT 'task' NOT NULL,
  `entity_id` integer NOT NULL,
  `body` text NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `comments_new` (`id`, `task_id`, `entity_type`, `entity_id`, `body`, `created_at`)
SELECT `id`, `task_id`, 'task', `task_id`, `body`, `created_at`
FROM `comments`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `comments_new` RENAME TO `comments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint

-- Source migration: 0005_orange_korg.sql
ALTER TABLE projects ADD `start_date` text;--> statement-breakpoint
ALTER TABLE projects ADD `due_date` text;
--> statement-breakpoint

-- Source migration: 0006_dear_kitty_pryde.sql
PRAGMA defer_foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`task_id` integer,
	`feature_id` integer,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `attachments_exactly_one_owner` CHECK ((`project_id` is not null and `task_id` is null and `feature_id` is null) or (`project_id` is null and `task_id` is not null and `feature_id` is null) or (`project_id` is null and `task_id` is null and `feature_id` is not null)),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attachments` (`id`, `project_id`, `task_id`, `feature_id`, `original_name`, `filename`, `mimetype`, `size`, `created_at`)
SELECT `id`, `project_id`, `task_id`, NULL, `original_name`, `filename`, `mimetype`, `size`, `created_at` FROM `attachments`;
--> statement-breakpoint
DROP TABLE `attachments`;
--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;
--> statement-breakpoint

-- Source migration: 0007_careful_vin_gonzales.sql
CREATE TABLE `seed_run_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text NOT NULL,
	`table_name` text NOT NULL,
	`record_key` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `seed_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`scenario` text DEFAULT 'visual' NOT NULL,
	`summary_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE attachments ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE backlog_items ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE comments ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE events ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE features ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE notes ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE project_features ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE project_notes ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE project_tags ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE projects ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE tags ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE task_features ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE task_notes ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE task_tags ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE task_use_cases ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE tasks ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE use_cases ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
ALTER TABLE wiki_pages ADD `seed_run_id` text REFERENCES seed_runs(id);--> statement-breakpoint
CREATE UNIQUE INDEX `seed_run_items_run_table_record_unique` ON `seed_run_items` (`seed_run_id`,`table_name`,`record_key`);
--> statement-breakpoint

-- Source migration: 0008_broken_the_order.sql
CREATE TABLE `feature_relations` (
	`seed_run_id` text,
	`source_feature_id` integer NOT NULL,
	`target_feature_id` integer NOT NULL,
	`relation_type` text DEFAULT 'related' NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE backlog_items ADD `import_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `feature_relations_source_target_type_unique` ON `feature_relations` (`source_feature_id`,`target_feature_id`,`relation_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `backlog_items_project_import_key_unique` ON `backlog_items` (`project_id`,`import_key`);
--> statement-breakpoint

-- Source migration: 0009_little_korath.sql
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint

-- Source migration: 0010_crazy_zuras.sql
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
	`project_id` integer NOT NULL,
	`parent_id` integer,
	`type` text DEFAULT 'bug' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`severity` text,
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
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ticket_relations` (
	`seed_run_id` text,
	`source_ticket_id` integer NOT NULL,
	`target_ticket_id` integer NOT NULL,
	`relation_type` text DEFAULT 'related' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `ticket_relations_no_self_relation` CHECK (`source_ticket_id` <> `target_ticket_id`),
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ticket_tags` (
	`seed_run_id` text,
	`ticket_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ticket_notes` (
	`seed_run_id` text,
	`ticket_id` integer NOT NULL,
	`note_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_relations_source_target_type_unique` ON `ticket_relations` (`source_ticket_id`,`target_ticket_id`,`relation_type`);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
	`project_id` integer,
	`task_id` integer,
	`feature_id` integer,
	`ticket_id` integer,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `attachments_exactly_one_owner` CHECK (
		(`project_id` is not null and `task_id` is null and `feature_id` is null and `ticket_id` is null)
		or (`project_id` is null and `task_id` is not null and `feature_id` is null and `ticket_id` is null)
		or (`project_id` is null and `task_id` is null and `feature_id` is not null and `ticket_id` is null)
		or (`project_id` is null and `task_id` is null and `feature_id` is null and `ticket_id` is not null)
	),
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attachments` (
	`id`,
	`seed_run_id`,
	`project_id`,
	`task_id`,
	`feature_id`,
	`ticket_id`,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	`created_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`project_id`,
	`task_id`,
	`feature_id`,
	NULL,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	`created_at`
FROM `attachments`;
--> statement-breakpoint
DROP TABLE `attachments`;
--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint

-- Source migration: 0011_warm_the_hunter.sql
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `project_tasks` (
	`seed_run_id` text,
	`owner_id` integer NOT NULL,
	`task_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feature_tasks` (
	`seed_run_id` text,
	`owner_id` integer NOT NULL,
	`task_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `use_case_tasks` (
	`seed_run_id` text,
	`owner_id` integer NOT NULL,
	`task_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `project_tasks` (`seed_run_id`, `owner_id`, `task_id`, `position`)
SELECT `seed_run_id`, `project_id`, `id`, `position`
FROM `tasks`
WHERE `parent_id` IS NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `feature_tasks` (`seed_run_id`, `owner_id`, `task_id`, `position`)
SELECT `task_features`.`seed_run_id`, `task_features`.`feature_id`, `task_features`.`task_id`, COALESCE(`tasks`.`position`, 0)
FROM `task_features`
LEFT JOIN `tasks` ON `tasks`.`id` = `task_features`.`task_id`;
--> statement-breakpoint
INSERT OR IGNORE INTO `use_case_tasks` (`seed_run_id`, `owner_id`, `task_id`, `position`)
SELECT `task_use_cases`.`seed_run_id`, `task_use_cases`.`use_case_id`, `task_use_cases`.`task_id`, COALESCE(`tasks`.`position`, 0)
FROM `task_use_cases`
LEFT JOIN `tasks` ON `tasks`.`id` = `task_use_cases`.`task_id`;
--> statement-breakpoint
CREATE UNIQUE INDEX `project_tasks_owner_task_unique` ON `project_tasks` (`owner_id`,`task_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_tasks_owner_task_unique` ON `feature_tasks` (`owner_id`,`task_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `use_case_tasks_owner_task_unique` ON `use_case_tasks` (`owner_id`,`task_id`);
--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
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
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tasks` (`id`, `seed_run_id`, `parent_id`, `title`, `description`, `status`, `priority`, `assignee`, `due_date`, `import_key`, `created_at`, `updated_at`)
SELECT `id`, `seed_run_id`, `parent_id`, `title`, `description`, `status`, `priority`, `assignee`, `due_date`, `import_key`, `created_at`, `updated_at`
FROM `tasks`;
--> statement-breakpoint
DROP TABLE `task_features`;
--> statement-breakpoint
DROP TABLE `task_use_cases`;
--> statement-breakpoint
DROP INDEX IF EXISTS `tasks_project_import_key_unique`;
--> statement-breakpoint
DROP TABLE `tasks`;
--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint

-- Source migration: 0012_ticket_owner_joins.sql
CREATE TABLE `project_tickets` (
	`seed_run_id` text,
	`owner_id` integer NOT NULL,
	`ticket_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_tickets` (
	`seed_run_id` text,
	`owner_id` integer NOT NULL,
	`ticket_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feature_tickets` (
	`seed_run_id` text,
	`owner_id` integer NOT NULL,
	`ticket_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `use_case_tickets` (
	`seed_run_id` text,
	`owner_id` integer NOT NULL,
	`ticket_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `project_tickets` (`seed_run_id`, `owner_id`, `ticket_id`, `position`)
SELECT `seed_run_id`, `project_id`, `id`, `position`
FROM `tickets`
WHERE `project_id` IS NOT NULL AND `parent_id` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `project_tickets_owner_ticket_unique` ON `project_tickets` (`owner_id`,`ticket_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_tickets_owner_ticket_unique` ON `task_tickets` (`owner_id`,`ticket_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_tickets_owner_ticket_unique` ON `feature_tickets` (`owner_id`,`ticket_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `use_case_tickets_owner_ticket_unique` ON `use_case_tickets` (`owner_id`,`ticket_id`);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
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
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tickets` (
	`id`,
	`seed_run_id`,
	`parent_id`,
	`type`,
	`title`,
	`description`,
	`status`,
	`priority`,
	`resolution`,
	`reporter`,
	`assignee`,
	`environment`,
	`affected_version`,
	`due_date`,
	`resolved_at`,
	`position`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`parent_id`,
	`type`,
	`title`,
	`description`,
	`status`,
	`priority`,
	`resolution`,
	`reporter`,
	`assignee`,
	`environment`,
	`affected_version`,
	`due_date`,
	`resolved_at`,
	`position`,
	`created_at`,
	`updated_at`
FROM `tickets`;
--> statement-breakpoint
DROP TABLE `tickets`;
--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint

-- Source migration: 0013_lame_microbe.sql
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text REFERENCES seed_runs(id),
	`project_id` integer REFERENCES projects(id) ON DELETE cascade,
	`task_id` integer REFERENCES tasks(id) ON DELETE cascade,
	`feature_id` integer REFERENCES features(id) ON DELETE cascade,
	`ticket_id` integer REFERENCES tickets(id) ON DELETE cascade,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
	`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "attachments_exactly_one_owner" CHECK((`project_id` is not null and `task_id` is null and `feature_id` is null and `ticket_id` is null)
       or (`project_id` is null and `task_id` is not null and `feature_id` is null and `ticket_id` is null)
       or (`project_id` is null and `task_id` is null and `feature_id` is not null and `ticket_id` is null)
       or (`project_id` is null and `task_id` is null and `feature_id` is null and `ticket_id` is not null))
);
--> statement-breakpoint
INSERT INTO `__new_attachments` (
	`id`,
	`seed_run_id`,
	`project_id`,
	`task_id`,
	`feature_id`,
	`ticket_id`,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`project_id`,
	`task_id`,
	`feature_id`,
	`ticket_id`,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	1,
	NULL,
	NULL,
	`created_at`,
	`created_at`
FROM `attachments`;
--> statement-breakpoint
DROP TABLE `attachments`;
--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;
--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text REFERENCES seed_runs(id),
	`task_id` integer REFERENCES tasks(id) ON DELETE cascade,
	`entity_type` text DEFAULT 'task' NOT NULL,
	`entity_id` integer NOT NULL,
	`body` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
	`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_comments` (
	`id`,
	`seed_run_id`,
	`task_id`,
	`entity_type`,
	`entity_id`,
	`body`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`task_id`,
	`entity_type`,
	`entity_id`,
	`body`,
	1,
	NULL,
	NULL,
	`created_at`,
	`created_at`
FROM `comments`;
--> statement-breakpoint
DROP TABLE `comments`;
--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;
--> statement-breakpoint
CREATE TABLE `__new_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text REFERENCES seed_runs(id),
	`name` text NOT NULL,
	`color` text DEFAULT '#94a3b8' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer REFERENCES users(id) ON DELETE SET NULL,
	`updated_by` integer REFERENCES users(id) ON DELETE SET NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tags` (
	`id`,
	`seed_run_id`,
	`name`,
	`color`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`name`,
	`color`,
	1,
	NULL,
	NULL,
	datetime('now'),
	datetime('now')
FROM `tags`;
--> statement-breakpoint
DROP TABLE `tags`;
--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;
--> statement-breakpoint
ALTER TABLE backlog_items ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE backlog_items ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE backlog_items ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE features ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE features ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE features ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE notes ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE notes ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE notes ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE projects ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE projects ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE projects ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE tasks ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE tasks ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE tasks ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE tickets ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE tickets ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE tickets ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE use_cases ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE use_cases ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE use_cases ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE wiki_pages ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE wiki_pages ADD `created_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE wiki_pages ADD `updated_by` integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);
--> statement-breakpoint

-- Source migration: 0014_dry_vermin.sql
CREATE TABLE `backlog_item_comments` (
	`seed_run_id` text,
	`backlog_item_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`backlog_item_id`) REFERENCES `backlog_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feature_comments` (
	`seed_run_id` text,
	`feature_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_comments` (
	`seed_run_id` text,
	`project_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`seed_run_id` text,
	`task_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`seed_run_id` text,
	`ticket_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `use_case_comments` (
	`seed_run_id` text,
	`use_case_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wiki_page_comments` (
	`seed_run_id` text,
	`wiki_page_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `task_comments` (`seed_run_id`, `task_id`, `comment_id`)
SELECT `seed_run_id`, `task_id`, `id` FROM `comments` WHERE `task_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_comments` (`seed_run_id`, `task_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'task';
--> statement-breakpoint
INSERT OR IGNORE INTO `project_comments` (`seed_run_id`, `project_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'project';
--> statement-breakpoint
INSERT OR IGNORE INTO `feature_comments` (`seed_run_id`, `feature_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'feature';
--> statement-breakpoint
INSERT OR IGNORE INTO `use_case_comments` (`seed_run_id`, `use_case_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'useCase';
--> statement-breakpoint
INSERT OR IGNORE INTO `backlog_item_comments` (`seed_run_id`, `backlog_item_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'backlogItem';
--> statement-breakpoint
INSERT OR IGNORE INTO `wiki_page_comments` (`seed_run_id`, `wiki_page_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'wikiPage';
--> statement-breakpoint
INSERT OR IGNORE INTO `ticket_comments` (`seed_run_id`, `ticket_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'ticket';
--> statement-breakpoint
CREATE UNIQUE INDEX `backlog_item_comments_parent_comment_unique` ON `backlog_item_comments` (`backlog_item_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `feature_comments_parent_comment_unique` ON `feature_comments` (`feature_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_comments_parent_comment_unique` ON `project_comments` (`project_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_comments_parent_comment_unique` ON `task_comments` (`task_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_comments_parent_comment_unique` ON `ticket_comments` (`ticket_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `use_case_comments_parent_comment_unique` ON `use_case_comments` (`use_case_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_comments_parent_comment_unique` ON `wiki_page_comments` (`wiki_page_id`,`comment_id`);--> statement-breakpoint
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
END;
--> statement-breakpoint

-- Source migration: 0015_workable_invisible_woman.sql
CREATE TABLE `feature_attachments` (
	`seed_run_id` text,
	`feature_id` integer NOT NULL,
	`attachment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_attachments` (
	`seed_run_id` text,
	`project_id` integer NOT NULL,
	`attachment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_attachments` (
	`seed_run_id` text,
	`task_id` integer NOT NULL,
	`attachment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ticket_attachments` (
	`seed_run_id` text,
	`ticket_id` integer NOT NULL,
	`attachment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `project_attachments` (`seed_run_id`, `project_id`, `attachment_id`)
SELECT `seed_run_id`, `project_id`, `id` FROM `attachments` WHERE `project_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_attachments` (`seed_run_id`, `task_id`, `attachment_id`)
SELECT `seed_run_id`, `task_id`, `id` FROM `attachments` WHERE `task_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `feature_attachments` (`seed_run_id`, `feature_id`, `attachment_id`)
SELECT `seed_run_id`, `feature_id`, `id` FROM `attachments` WHERE `feature_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `ticket_attachments` (`seed_run_id`, `ticket_id`, `attachment_id`)
SELECT `seed_run_id`, `ticket_id`, `id` FROM `attachments` WHERE `ticket_id` IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_attachments_parent_attachment_unique` ON `feature_attachments` (`feature_id`,`attachment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_attachments_parent_attachment_unique` ON `project_attachments` (`project_id`,`attachment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_attachments_parent_attachment_unique` ON `task_attachments` (`task_id`,`attachment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_attachments_parent_attachment_unique` ON `ticket_attachments` (`ticket_id`,`attachment_id`);
--> statement-breakpoint

-- Source migration: 0016_funny_blizzard.sql
INSERT OR IGNORE INTO `task_comments` (`seed_run_id`, `task_id`, `comment_id`)
SELECT `seed_run_id`, `task_id`, `id` FROM `comments` WHERE `task_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_comments` (`seed_run_id`, `task_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'task';
--> statement-breakpoint
INSERT OR IGNORE INTO `project_comments` (`seed_run_id`, `project_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'project';
--> statement-breakpoint
INSERT OR IGNORE INTO `feature_comments` (`seed_run_id`, `feature_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'feature';
--> statement-breakpoint
INSERT OR IGNORE INTO `use_case_comments` (`seed_run_id`, `use_case_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'useCase';
--> statement-breakpoint
INSERT OR IGNORE INTO `backlog_item_comments` (`seed_run_id`, `backlog_item_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'backlogItem';
--> statement-breakpoint
INSERT OR IGNORE INTO `wiki_page_comments` (`seed_run_id`, `wiki_page_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'wikiPage';
--> statement-breakpoint
INSERT OR IGNORE INTO `ticket_comments` (`seed_run_id`, `ticket_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'ticket';
--> statement-breakpoint
INSERT OR IGNORE INTO `project_attachments` (`seed_run_id`, `project_id`, `attachment_id`)
SELECT `seed_run_id`, `project_id`, `id` FROM `attachments` WHERE `project_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_attachments` (`seed_run_id`, `task_id`, `attachment_id`)
SELECT `seed_run_id`, `task_id`, `id` FROM `attachments` WHERE `task_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `feature_attachments` (`seed_run_id`, `feature_id`, `attachment_id`)
SELECT `seed_run_id`, `feature_id`, `id` FROM `attachments` WHERE `feature_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `ticket_attachments` (`seed_run_id`, `ticket_id`, `attachment_id`)
SELECT `seed_run_id`, `ticket_id`, `id` FROM `attachments` WHERE `ticket_id` IS NOT NULL;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `project_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `task_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `feature_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `use_case_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `backlog_item_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `wiki_page_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `ticket_comments_delete_orphan_comment`;
--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
	`body` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_comments` (
	`id`,
	`seed_run_id`,
	`body`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`body`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
FROM `comments`;
--> statement-breakpoint
DROP TABLE `comments`;
--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
--> statement-breakpoint
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
END;
--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_attachments` (
	`id`,
	`seed_run_id`,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
FROM `attachments`;
--> statement-breakpoint
DROP TABLE `attachments`;
--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;
--> statement-breakpoint

-- Source migration: 0017_steep_gambit.sql
CREATE TABLE `project_events` (
	`seed_run_id` text,
	`project_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_events` (
	`seed_run_id` text,
	`task_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE events ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE events ADD `created_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE events ADD `updated_by` integer REFERENCES users(id);--> statement-breakpoint
CREATE UNIQUE INDEX `project_events_parent_event_unique` ON `project_events` (`project_id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_events_parent_event_unique` ON `task_events` (`task_id`,`event_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `project_events` (`seed_run_id`, `project_id`, `event_id`)
SELECT `seed_run_id`, `project_id`, `id` FROM `events` WHERE `project_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_events` (`seed_run_id`, `task_id`, `event_id`)
SELECT `seed_run_id`, `task_id`, `id` FROM `events` WHERE `task_id` IS NOT NULL;
--> statement-breakpoint

-- Source migration: 0018_eager_riptide.sql
CREATE TABLE `__new_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
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
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_events` (
	`id`,
	`seed_run_id`,
	`title`,
	`description`,
	`start_time`,
	`end_time`,
	`is_all_day`,
	`color`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`title`,
	`description`,
	`start_time`,
	`end_time`,
	`is_all_day`,
	`color`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
FROM `events`;
--> statement-breakpoint
DROP TABLE `events`;
--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;
--> statement-breakpoint

-- Source migration: 0019_common_bloodscream.sql
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
--> statement-breakpoint

-- Source migration: 0020_fuzzy_deathbird.sql
DROP TRIGGER IF EXISTS `backlog_item_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `feature_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `project_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `task_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `ticket_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `use_case_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `wiki_page_comments_delete_orphan_comment`;--> statement-breakpoint
CREATE TABLE `milestone_attachments` (
	`milestone_id` integer NOT NULL,
	`attachment_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_comments` (
	`milestone_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_events` (
	`milestone_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_features` (
	`milestone_id` integer NOT NULL,
	`feature_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_notes` (
	`milestone_id` integer NOT NULL,
	`note_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_tags` (
	`milestone_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_tasks` (
	`owner_id` integer NOT NULL,
	`task_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_tickets` (
	`owner_id` integer NOT NULL,
	`ticket_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`color` text DEFAULT '#6366f1',
	`start_date` text,
	`due_date` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_attachments_parent_attachment_unique` ON `milestone_attachments` (`milestone_id`,`attachment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_comments_parent_comment_unique` ON `milestone_comments` (`milestone_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_events_parent_event_unique` ON `milestone_events` (`milestone_id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_tasks_owner_task_unique` ON `milestone_tasks` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_tickets_owner_ticket_unique` ON `milestone_tickets` (`owner_id`,`ticket_id`);--> statement-breakpoint
CREATE TRIGGER `backlog_item_comments_delete_orphan_comment` AFTER DELETE ON `backlog_item_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
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
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `milestone_comments_delete_orphan_comment` AFTER DELETE ON `milestone_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
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
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
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
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
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
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
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
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
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
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint

-- Source migration: 0021_eager_moon_knight.sql
CREATE TABLE `catalog_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_entries_kind_key_unique` ON `catalog_entries` (`kind`,`key`);--> statement-breakpoint
INSERT INTO `catalog_entries` (`kind`, `key`, `label`, `sort_order`, `is_closed`, `version`, `created_at`, `updated_at`) VALUES
	('workStatus', 'active', 'Aktiv', 100, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'on_hold', 'Pausiert', 200, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'completed', 'Abgeschlossen', 300, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'archived', 'Archiviert', 400, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'todo', 'Offen', 500, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'open', 'Offen', 600, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'in_progress', 'In Arbeit', 700, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'in_review', 'In Prüfung', 800, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'done', 'Erledigt', 900, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'resolved', 'Gelöst', 1000, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'closed', 'Geschlossen', 1100, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'rejected', 'Verworfen', 1200, 1, 1, datetime('now'), datetime('now')),
	('featureStatus', 'draft', 'Entwurf', 100, 0, 1, datetime('now'), datetime('now')),
	('featureStatus', 'active', 'Aktiv', 200, 0, 1, datetime('now'), datetime('now')),
	('featureStatus', 'done', 'Erledigt', 300, 1, 1, datetime('now'), datetime('now')),
	('featureStatus', 'archived', 'Archiviert', 400, 1, 1, datetime('now'), datetime('now')),
	('priority', 'low', 'Niedrig', 100, 0, 1, datetime('now'), datetime('now')),
	('priority', 'medium', 'Mittel', 200, 0, 1, datetime('now'), datetime('now')),
	('priority', 'high', 'Hoch', 300, 0, 1, datetime('now'), datetime('now')),
	('priority', 'urgent', 'Dringend', 400, 0, 1, datetime('now'), datetime('now'));--> statement-breakpoint
ALTER TABLE `backlog_items` DROP COLUMN `priority`;
--> statement-breakpoint

-- Source migration: 0022_hot_pretty_boy.sql
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_key_unique` ON `roles` (`key`);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_id` integer NOT NULL,
	`resource` text NOT NULL,
	`action` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_role_resource_action_unique` ON `permissions` (`role_id`,`resource`,`action`);
--> statement-breakpoint
INSERT OR IGNORE INTO `roles` (`key`, `label`, `is_system`, `version`, `created_at`, `updated_at`) VALUES
	('admin', 'Administrator', 1, 1, datetime('now'), datetime('now')),
	('editor', 'Editor', 1, 1, datetime('now'), datetime('now')),
	('reader', 'Leser', 1, 1, datetime('now'), datetime('now'));
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', '*' FROM `roles` WHERE `key` = 'admin';
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', 'read' FROM `roles` WHERE `key` = 'editor';
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', 'write' FROM `roles` WHERE `key` = 'editor';
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', 'read' FROM `roles` WHERE `key` = 'reader';
--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`first_name` text DEFAULT '' NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`full_name` text GENERATED ALWAYS AS (`last_name` || ', ' || `first_name`) STORED NOT NULL,
	`address` text,
	`phone` text,
	`email` text NOT NULL,
	`password_hash` text,
	`role_id` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_users` (
	`id`,
	`name`,
	`first_name`,
	`last_name`,
	`address`,
	`phone`,
	`email`,
	`password_hash`,
	`role_id`,
	`is_active`,
	`version`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	'',
	'',
	NULL,
	NULL,
	`email`,
	NULL,
	(SELECT `id` FROM `roles` WHERE `key` = 'reader'),
	0,
	`version`,
	`created_at`,
	`updated_at`
FROM `users`;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint

-- Source migration: 0023_settings_values.sql
CREATE TABLE `settings_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`setting_key` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`value_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_values_setting_scope_unique` ON `settings_values` (`setting_key`,`scope_type`,`scope_id`);
--> statement-breakpoint

-- Source migration: 0024_parallel_sleeper.sql
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation` text NOT NULL,
	`object_type` text NOT NULL,
	`object_id` integer NOT NULL,
	`object_label` text NOT NULL,
	`summary` text NOT NULL,
	`actor_user_id` integer,
	`actor_name` text DEFAULT 'System' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `journal_entry_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`field_key` text NOT NULL,
	`field_label` text NOT NULL,
	`old_value_json` text NOT NULL,
	`old_value_label` text,
	`new_value_json` text NOT NULL,
	`new_value_label` text,
	`summary` text NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journal_entry_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`object_type` text NOT NULL,
	`object_id` integer NOT NULL,
	`object_label` text NOT NULL,
	`relation` text NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_context_entry_object_relation_unique` ON `journal_entry_contexts` (`journal_entry_id`,`object_type`,`object_id`,`relation`);
--> statement-breakpoint

-- Source migration: 0025_spicy_slipstream.sql
CREATE INDEX `journal_entries_created_at_idx` ON `journal_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `journal_entries_object_idx` ON `journal_entries` (`object_type`,`object_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_actor_idx` ON `journal_entries` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `journal_context_object_idx` ON `journal_entry_contexts` (`object_type`,`object_id`);
--> statement-breakpoint

-- Source migration: 0026_ticket_type_catalog_colors.sql
ALTER TABLE `catalog_entries` ADD `color` text DEFAULT 'var(--color-steel-700)' NOT NULL;--> statement-breakpoint
UPDATE `catalog_entries`
SET `color` = CASE
  WHEN `kind` = 'workStatus' AND `key` IN ('active', 'todo', 'open') THEN 'var(--color-fern)'
  WHEN `kind` = 'workStatus' AND `key` = 'in_progress' THEN 'var(--color-tangerine)'
  WHEN `kind` = 'workStatus' AND `key` = 'in_review' THEN 'var(--color-mustard)'
  WHEN `kind` = 'workStatus' AND `key` IN ('on_hold', 'completed', 'archived', 'done', 'resolved', 'closed', 'rejected') THEN 'var(--color-steel-500)'
  WHEN `kind` = 'featureStatus' AND `key` = 'draft' THEN 'var(--color-violet)'
  WHEN `kind` = 'featureStatus' AND `key` = 'active' THEN 'var(--color-tangerine)'
  WHEN `kind` = 'featureStatus' AND `key` IN ('done', 'archived') THEN 'var(--color-steel-500)'
  WHEN `kind` = 'priority' AND `key` = 'low' THEN 'var(--color-steel-400)'
  WHEN `kind` = 'priority' AND `key` = 'medium' THEN 'var(--color-mustard)'
  WHEN `kind` = 'priority' AND `key` = 'high' THEN 'var(--color-tangerine)'
  WHEN `kind` = 'priority' AND `key` = 'urgent' THEN 'var(--color-crimson)'
  ELSE `color`
END;--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_entries` (`kind`, `key`, `label`, `sort_order`, `is_closed`, `color`, `version`, `created_at`, `updated_at`) VALUES
  ('ticketType', 'bug', 'Bug', 100, 0, 'var(--color-crimson)', 1, datetime('now'), datetime('now')),
  ('ticketType', 'improvement', 'Verbesserung', 200, 0, 'var(--color-teal)', 1, datetime('now'), datetime('now')),
  ('ticketType', 'question', 'Frage', 300, 0, 'var(--color-violet)', 1, datetime('now'), datetime('now')),
  ('ticketType', 'task', 'Aufgabe', 400, 0, 'var(--color-steel-500)', 1, datetime('now'), datetime('now'));
--> statement-breakpoint

-- Source migration: 0027_remove_document_slugs.sql
DROP INDEX IF EXISTS `features_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `use_cases_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `wiki_pages_slug_unique`;--> statement-breakpoint
ALTER TABLE `features` DROP COLUMN `slug`;--> statement-breakpoint
ALTER TABLE `use_cases` DROP COLUMN `slug`;--> statement-breakpoint
ALTER TABLE `wiki_pages` DROP COLUMN `slug`;
--> statement-breakpoint
