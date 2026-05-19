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
