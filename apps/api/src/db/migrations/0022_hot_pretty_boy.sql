CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_key_unique` ON `roles` (`key`);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_id` integer NOT NULL,
	`resource` text NOT NULL,
	`action` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_role_resource_action_unique` ON `permissions` (`role_id`,`resource`,`action`);
--> statement-breakpoint
INSERT OR IGNORE INTO `roles` (`key`, `label`, `is_system`, `version`, `created_at`, `updated_at`) VALUES
	('admin', 'Administrator', 1, 1, datetime('now'), datetime('now')),
	('editor', 'Editor', 1, 1, datetime('now'), datetime('now')),
	('reader', 'Leser', 1, 1, datetime('now'), datetime('now'));
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', '*' FROM `roles` WHERE `key` = 'admin';
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', 'read' FROM `roles` WHERE `key` = 'editor';
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', 'write' FROM `roles` WHERE `key` = 'editor';
--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`role_id`, `resource`, `action`)
SELECT `id`, '*', 'read' FROM `roles` WHERE `key` = 'reader';
--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`first_name` text DEFAULT '' NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`full_name` text GENERATED ALWAYS AS (`last_name` || ', ' || `first_name`) STORED NOT NULL,
	`address` text,
	`phone` text,
	`email` text NOT NULL,
	`password_hash` text,
	`role_id` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_users` (
	`id`,
	`name`,
	`first_name`,
	`last_name`,
	`address`,
	`phone`,
	`email`,
	`password_hash`,
	`role_id`,
	`is_active`,
	`version`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	'',
	'',
	NULL,
	NULL,
	`email`,
	NULL,
	(SELECT `id` FROM `roles` WHERE `key` = 'reader'),
	0,
	`version`,
	`created_at`,
	`updated_at`
FROM `users`;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
