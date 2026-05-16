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
