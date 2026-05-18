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
