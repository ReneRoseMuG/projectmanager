CREATE TABLE `day_plans` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` text NOT NULL,
  `user_id` integer NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `notes` text,
  `version` integer DEFAULT 1 NOT NULL,
  `created_by` integer,
  `updated_by` integer,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE UNIQUE INDEX `day_plans_user_date_unique` ON `day_plans` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `day_plans_date_idx` ON `day_plans` (`date`);--> statement-breakpoint
CREATE TABLE `day_plan_tasks` (
  `owner_id` integer NOT NULL,
  `task_id` integer NOT NULL,
  `position` real DEFAULT 0 NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `day_plans`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `day_plan_tasks_owner_task_unique` ON `day_plan_tasks` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `day_plan_events` (
  `owner_id` integer NOT NULL,
  `event_id` integer NOT NULL,
  `position` real DEFAULT 0 NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `day_plans`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `day_plan_events_owner_event_unique` ON `day_plan_events` (`owner_id`,`event_id`);
