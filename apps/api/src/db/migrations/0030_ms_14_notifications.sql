ALTER TABLE `events` ADD `reminder_minutes` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
CREATE TABLE `sent_notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `event_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `channel` text NOT NULL,
  `reminder_minutes` integer NOT NULL,
  `sent_at` text NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `sent_notifications_event_user_channel_reminder_unique` ON `sent_notifications` (`event_id`,`user_id`,`channel`,`reminder_minutes`);--> statement-breakpoint
CREATE INDEX `sent_notifications_event_idx` ON `sent_notifications` (`event_id`);--> statement-breakpoint
CREATE INDEX `sent_notifications_user_idx` ON `sent_notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);
