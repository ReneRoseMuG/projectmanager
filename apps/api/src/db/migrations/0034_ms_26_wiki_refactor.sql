CREATE TABLE `wiki_page_attachments` (
  `wiki_page_id` integer NOT NULL,
  `attachment_id` integer NOT NULL,
  FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_attachments_parent_attachment_unique` ON `wiki_page_attachments` (`wiki_page_id`,`attachment_id`);
--> statement-breakpoint
CREATE TABLE `wiki_page_relations` (
  `source_wiki_page_id` integer NOT NULL,
  `target_wiki_page_id` integer NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`source_wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`target_wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `wiki_page_relations_no_self_relation` CHECK (`source_wiki_page_id` <> `target_wiki_page_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_relations_source_target_unique` ON `wiki_page_relations` (`source_wiki_page_id`,`target_wiki_page_id`);
--> statement-breakpoint
CREATE TABLE `wiki_page_tasks` (
  `owner_id` integer NOT NULL,
  `task_id` integer NOT NULL,
  `position` real DEFAULT 0 NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_tasks_owner_task_unique` ON `wiki_page_tasks` (`owner_id`,`task_id`);
--> statement-breakpoint
CREATE TABLE `wiki_page_tickets` (
  `owner_id` integer NOT NULL,
  `ticket_id` integer NOT NULL,
  `position` real DEFAULT 0 NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_tickets_owner_ticket_unique` ON `wiki_page_tickets` (`owner_id`,`ticket_id`);
--> statement-breakpoint
ALTER TABLE `features` DROP COLUMN `content_path`;
--> statement-breakpoint
ALTER TABLE `use_cases` DROP COLUMN `content_path`;
--> statement-breakpoint
ALTER TABLE `wiki_pages` DROP COLUMN `content_path`;
