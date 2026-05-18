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
