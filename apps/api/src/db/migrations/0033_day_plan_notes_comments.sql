CREATE TABLE `day_plan_comments` (
  `day_plan_id` integer NOT NULL,
  `comment_id` integer NOT NULL,
  FOREIGN KEY (`day_plan_id`) REFERENCES `day_plans`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `day_plan_comments_owner_comment_unique` ON `day_plan_comments` (`day_plan_id`,`comment_id`);--> statement-breakpoint
CREATE TABLE `day_plan_notes` (
  `day_plan_id` integer NOT NULL,
  `note_id` integer NOT NULL,
  FOREIGN KEY (`day_plan_id`) REFERENCES `day_plans`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `day_plan_notes_owner_note_unique` ON `day_plan_notes` (`day_plan_id`,`note_id`);--> statement-breakpoint
CREATE TEMP TABLE `__day_plan_notes_to_migrate` AS
SELECT
  row_number() OVER (ORDER BY `id`) AS `rn`,
  `id` AS `day_plan_id`,
  'Tagesnotiz ' || substr(`date`, 9, 2) || '.' || substr(`date`, 6, 2) || '.' || substr(`date`, 3, 2) AS `title`,
  json_object(
    'type', 'doc',
    'content', json_array(json_object(
      'type', 'paragraph',
      'content', json_array(json_object('type', 'text', 'text', trim(`notes`)))
    ))
  ) AS `content_json`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
FROM `day_plans`
WHERE `notes` IS NOT NULL AND trim(`notes`) <> '';--> statement-breakpoint
CREATE TEMP TABLE `__day_plan_note_id_base` AS
SELECT COALESCE((SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'notes'), (SELECT max(`id`) FROM `notes`), 0) AS `base_id`;--> statement-breakpoint
INSERT INTO `notes` (`title`, `content_json`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT `title`, `content_json`, 1, `created_by`, `updated_by`, `created_at`, `updated_at`
FROM `__day_plan_notes_to_migrate`
ORDER BY `rn`;--> statement-breakpoint
INSERT INTO `day_plan_notes` (`day_plan_id`, `note_id`)
SELECT `day_plan_id`, (SELECT `base_id` FROM `__day_plan_note_id_base`) + `rn`
FROM `__day_plan_notes_to_migrate`;--> statement-breakpoint
DROP TABLE `__day_plan_note_id_base`;--> statement-breakpoint
DROP TABLE `__day_plan_notes_to_migrate`;--> statement-breakpoint
CREATE TABLE `__new_day_plans` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` text NOT NULL,
  `user_id` integer NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `created_by` integer,
  `updated_by` integer,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_day_plans` (`id`, `date`, `user_id`, `status`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT `id`, `date`, `user_id`, `status`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`
FROM `day_plans`;--> statement-breakpoint
DROP TABLE `day_plans`;--> statement-breakpoint
ALTER TABLE `__new_day_plans` RENAME TO `day_plans`;--> statement-breakpoint
CREATE UNIQUE INDEX `day_plans_user_date_unique` ON `day_plans` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `day_plans_date_idx` ON `day_plans` (`date`);
