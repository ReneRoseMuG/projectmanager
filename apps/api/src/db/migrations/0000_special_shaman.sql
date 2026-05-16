CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`task_id` integer,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`color` text DEFAULT '#0f766e',
	`project_id` integer,
	`task_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text DEFAULT 'Ohne Titel' NOT NULL,
	`content_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_notes` (
	`project_id` integer NOT NULL,
	`note_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_tags` (
	`project_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`color` text DEFAULT '#0f766e',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#64748b' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_notes` (
	`task_id` integer NOT NULL,
	`note_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_tags` (
	`task_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`parent_id` integer,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`assignee` text,
	`due_date` text,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);