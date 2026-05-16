CREATE TABLE `backlog_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`feature_id` integer,
	`use_case_id` integer,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`description` text,
	`content_path` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_features` (
	`project_id` integer NOT NULL,
	`feature_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_features` (
	`task_id` integer NOT NULL,
	`feature_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_use_cases` (
	`task_id` integer NOT NULL,
	`use_case_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `use_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feature_id` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`description` text,
	`content_path` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wiki_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`project_id` integer,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content_path` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `features_slug_unique` ON `features` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `use_cases_slug_unique` ON `use_cases` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_pages_slug_unique` ON `wiki_pages` (`slug`);