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
