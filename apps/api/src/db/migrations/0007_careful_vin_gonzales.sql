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
