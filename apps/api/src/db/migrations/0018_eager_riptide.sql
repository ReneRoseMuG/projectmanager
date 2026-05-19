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
