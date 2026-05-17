CREATE TABLE `feature_relations` (
	`seed_run_id` text,
	`source_feature_id` integer NOT NULL,
	`target_feature_id` integer NOT NULL,
	`relation_type` text DEFAULT 'related' NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE backlog_items ADD `import_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `feature_relations_source_target_type_unique` ON `feature_relations` (`source_feature_id`,`target_feature_id`,`relation_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `backlog_items_project_import_key_unique` ON `backlog_items` (`project_id`,`import_key`);