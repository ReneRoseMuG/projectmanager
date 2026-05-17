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
