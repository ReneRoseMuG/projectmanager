ALTER TABLE `features` ADD `content` text;--> statement-breakpoint
ALTER TABLE `use_cases` ADD `content` text;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD `content` text;--> statement-breakpoint
CREATE TABLE `content_images` (
	`id` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob NOT NULL,
	`size` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `content_images_created_at_idx` ON `content_images` (`created_at`);
