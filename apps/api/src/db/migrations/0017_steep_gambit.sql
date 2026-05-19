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
