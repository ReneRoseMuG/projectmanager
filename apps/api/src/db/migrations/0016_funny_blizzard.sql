INSERT OR IGNORE INTO `task_comments` (`seed_run_id`, `task_id`, `comment_id`)
SELECT `seed_run_id`, `task_id`, `id` FROM `comments` WHERE `task_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_comments` (`seed_run_id`, `task_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'task';
--> statement-breakpoint
INSERT OR IGNORE INTO `project_comments` (`seed_run_id`, `project_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'project';
--> statement-breakpoint
INSERT OR IGNORE INTO `feature_comments` (`seed_run_id`, `feature_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'feature';
--> statement-breakpoint
INSERT OR IGNORE INTO `use_case_comments` (`seed_run_id`, `use_case_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'useCase';
--> statement-breakpoint
INSERT OR IGNORE INTO `backlog_item_comments` (`seed_run_id`, `backlog_item_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'backlogItem';
--> statement-breakpoint
INSERT OR IGNORE INTO `wiki_page_comments` (`seed_run_id`, `wiki_page_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'wikiPage';
--> statement-breakpoint
INSERT OR IGNORE INTO `ticket_comments` (`seed_run_id`, `ticket_id`, `comment_id`)
SELECT `seed_run_id`, `entity_id`, `id` FROM `comments` WHERE `entity_type` = 'ticket';
--> statement-breakpoint
INSERT OR IGNORE INTO `project_attachments` (`seed_run_id`, `project_id`, `attachment_id`)
SELECT `seed_run_id`, `project_id`, `id` FROM `attachments` WHERE `project_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `task_attachments` (`seed_run_id`, `task_id`, `attachment_id`)
SELECT `seed_run_id`, `task_id`, `id` FROM `attachments` WHERE `task_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `feature_attachments` (`seed_run_id`, `feature_id`, `attachment_id`)
SELECT `seed_run_id`, `feature_id`, `id` FROM `attachments` WHERE `feature_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `ticket_attachments` (`seed_run_id`, `ticket_id`, `attachment_id`)
SELECT `seed_run_id`, `ticket_id`, `id` FROM `attachments` WHERE `ticket_id` IS NOT NULL;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `project_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `task_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `feature_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `use_case_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `backlog_item_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `wiki_page_comments_delete_orphan_comment`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS `ticket_comments_delete_orphan_comment`;
--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
	`body` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_comments` (
	`id`,
	`seed_run_id`,
	`body`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`body`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
FROM `comments`;
--> statement-breakpoint
DROP TABLE `comments`;
--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;
--> statement-breakpoint
CREATE TRIGGER `project_comments_delete_orphan_comment` AFTER DELETE ON `project_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `task_comments_delete_orphan_comment` AFTER DELETE ON `task_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `feature_comments_delete_orphan_comment` AFTER DELETE ON `feature_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `use_case_comments_delete_orphan_comment` AFTER DELETE ON `use_case_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `backlog_item_comments_delete_orphan_comment` AFTER DELETE ON `backlog_item_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `wiki_page_comments_delete_orphan_comment` AFTER DELETE ON `wiki_page_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `ticket_comments_delete_orphan_comment` AFTER DELETE ON `ticket_comments`
BEGIN
  DELETE FROM `comments`
  WHERE `id` = OLD.`comment_id`
    AND NOT EXISTS (SELECT 1 FROM `project_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `task_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `feature_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `use_case_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `backlog_item_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `wiki_page_comments` WHERE `comment_id` = OLD.`comment_id`)
    AND NOT EXISTS (SELECT 1 FROM `ticket_comments` WHERE `comment_id` = OLD.`comment_id`);
END;
--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_run_id` text,
	`original_name` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`size` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_attachments` (
	`id`,
	`seed_run_id`,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`seed_run_id`,
	`original_name`,
	`filename`,
	`mimetype`,
	`size`,
	`version`,
	`created_by`,
	`updated_by`,
	`created_at`,
	`updated_at`
FROM `attachments`;
--> statement-breakpoint
DROP TABLE `attachments`;
--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;
