CREATE TABLE `backlog_item_comments` (
	`seed_run_id` text,
	`backlog_item_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`backlog_item_id`) REFERENCES `backlog_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feature_comments` (
	`seed_run_id` text,
	`feature_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_comments` (
	`seed_run_id` text,
	`project_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`seed_run_id` text,
	`task_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`seed_run_id` text,
	`ticket_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `use_case_comments` (
	`seed_run_id` text,
	`use_case_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wiki_page_comments` (
	`seed_run_id` text,
	`wiki_page_id` integer NOT NULL,
	`comment_id` integer NOT NULL,
	FOREIGN KEY (`seed_run_id`) REFERENCES `seed_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE UNIQUE INDEX `backlog_item_comments_parent_comment_unique` ON `backlog_item_comments` (`backlog_item_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `feature_comments_parent_comment_unique` ON `feature_comments` (`feature_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_comments_parent_comment_unique` ON `project_comments` (`project_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_comments_parent_comment_unique` ON `task_comments` (`task_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_comments_parent_comment_unique` ON `ticket_comments` (`ticket_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `use_case_comments_parent_comment_unique` ON `use_case_comments` (`use_case_id`,`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_comments_parent_comment_unique` ON `wiki_page_comments` (`wiki_page_id`,`comment_id`);--> statement-breakpoint
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
END;--> statement-breakpoint
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
END;--> statement-breakpoint
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
END;--> statement-breakpoint
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
END;--> statement-breakpoint
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
END;--> statement-breakpoint
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
END;--> statement-breakpoint
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
