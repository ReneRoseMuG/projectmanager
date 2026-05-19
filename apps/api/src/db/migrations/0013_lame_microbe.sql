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
