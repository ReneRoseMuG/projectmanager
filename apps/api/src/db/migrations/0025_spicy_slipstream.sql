CREATE INDEX `journal_entries_created_at_idx` ON `journal_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `journal_entries_object_idx` ON `journal_entries` (`object_type`,`object_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_actor_idx` ON `journal_entries` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `journal_context_object_idx` ON `journal_entry_contexts` (`object_type`,`object_id`);