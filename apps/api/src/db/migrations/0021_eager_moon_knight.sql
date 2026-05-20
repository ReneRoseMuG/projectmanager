CREATE TABLE `catalog_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_entries_kind_key_unique` ON `catalog_entries` (`kind`,`key`);--> statement-breakpoint
INSERT INTO `catalog_entries` (`kind`, `key`, `label`, `sort_order`, `is_closed`, `version`, `created_at`, `updated_at`) VALUES
	('workStatus', 'active', 'Aktiv', 100, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'on_hold', 'Pausiert', 200, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'completed', 'Abgeschlossen', 300, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'archived', 'Archiviert', 400, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'todo', 'Offen', 500, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'open', 'Offen', 600, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'in_progress', 'In Arbeit', 700, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'in_review', 'In Prüfung', 800, 0, 1, datetime('now'), datetime('now')),
	('workStatus', 'done', 'Erledigt', 900, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'resolved', 'Gelöst', 1000, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'closed', 'Geschlossen', 1100, 1, 1, datetime('now'), datetime('now')),
	('workStatus', 'rejected', 'Verworfen', 1200, 1, 1, datetime('now'), datetime('now')),
	('featureStatus', 'draft', 'Entwurf', 100, 0, 1, datetime('now'), datetime('now')),
	('featureStatus', 'active', 'Aktiv', 200, 0, 1, datetime('now'), datetime('now')),
	('featureStatus', 'done', 'Erledigt', 300, 1, 1, datetime('now'), datetime('now')),
	('featureStatus', 'archived', 'Archiviert', 400, 1, 1, datetime('now'), datetime('now')),
	('priority', 'low', 'Niedrig', 100, 0, 1, datetime('now'), datetime('now')),
	('priority', 'medium', 'Mittel', 200, 0, 1, datetime('now'), datetime('now')),
	('priority', 'high', 'Hoch', 300, 0, 1, datetime('now'), datetime('now')),
	('priority', 'urgent', 'Dringend', 400, 0, 1, datetime('now'), datetime('now'));--> statement-breakpoint
ALTER TABLE `backlog_items` DROP COLUMN `priority`;
