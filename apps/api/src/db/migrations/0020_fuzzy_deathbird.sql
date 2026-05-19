DROP TRIGGER IF EXISTS `backlog_item_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `feature_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `project_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `task_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `ticket_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `use_case_comments_delete_orphan_comment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `wiki_page_comments_delete_orphan_comment`;--> statement-breakpoint
CREATE TABLE `milestone_attachments` (
	`milestone_id` integer NOT NULL,
	`attachment_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_comments` (
	`milestone_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_events` (
	`milestone_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_features` (
	`milestone_id` integer NOT NULL,
	`feature_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_notes` (
	`milestone_id` integer NOT NULL,
	`note_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_tags` (
	`milestone_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_tasks` (
	`owner_id` integer NOT NULL,
	`task_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestone_tickets` (
	`owner_id` integer NOT NULL,
	`ticket_id` integer NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`color` text DEFAULT '#6366f1',
	`start_date` text,
	`due_date` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_attachments_parent_attachment_unique` ON `milestone_attachments` (`milestone_id`,`attachment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_comments_parent_comment_unique` ON `milestone_comments` (`milestone_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_events_parent_event_unique` ON `milestone_events` (`milestone_id`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_tasks_owner_task_unique` ON `milestone_tasks` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_tickets_owner_ticket_unique` ON `milestone_tickets` (`owner_id`,`ticket_id`);--> statement-breakpoint
CREATE TRIGGER `backlog_item_comments_delete_orphan_comment` AFTER DELETE ON `backlog_item_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `feature_comments_delete_orphan_comment` AFTER DELETE ON `feature_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `milestone_comments_delete_orphan_comment` AFTER DELETE ON `milestone_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `project_comments_delete_orphan_comment` AFTER DELETE ON `project_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `task_comments_delete_orphan_comment` AFTER DELETE ON `task_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `ticket_comments_delete_orphan_comment` AFTER DELETE ON `ticket_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `use_case_comments_delete_orphan_comment` AFTER DELETE ON `use_case_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;--> statement-breakpoint
CREATE TRIGGER `wiki_page_comments_delete_orphan_comment` AFTER DELETE ON `wiki_page_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `milestone_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
