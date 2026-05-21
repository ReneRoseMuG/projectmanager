CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation` text NOT NULL,
	`object_type` text NOT NULL,
	`object_id` integer NOT NULL,
	`object_label` text NOT NULL,
	`summary` text NOT NULL,
	`actor_user_id` integer,
	`actor_name` text DEFAULT 'System' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `journal_entry_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`field_key` text NOT NULL,
	`field_label` text NOT NULL,
	`old_value_json` text NOT NULL,
	`old_value_label` text,
	`new_value_json` text NOT NULL,
	`new_value_label` text,
	`summary` text NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journal_entry_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`object_type` text NOT NULL,
	`object_id` integer NOT NULL,
	`object_label` text NOT NULL,
	`relation` text NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_context_entry_object_relation_unique` ON `journal_entry_contexts` (`journal_entry_id`,`object_type`,`object_id`,`relation`);