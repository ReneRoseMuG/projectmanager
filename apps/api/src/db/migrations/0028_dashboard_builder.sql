CREATE TABLE `dashboards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`context` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`template_key` text,
	`owner_id` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboards_template_key_unique` ON `dashboards` (`template_key`);
--> statement-breakpoint
CREATE INDEX `dashboards_context_owner_idx` ON `dashboards` (`context`,`owner_id`);
--> statement-breakpoint
CREATE INDEX `dashboards_template_key_idx` ON `dashboards` (`template_key`);
--> statement-breakpoint
CREATE TABLE `dashboard_widgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dashboard_id` integer NOT NULL,
	`widget_id` text NOT NULL,
	`col` integer DEFAULT 0 NOT NULL,
	`row` integer DEFAULT 0 NOT NULL,
	`col_span` integer DEFAULT 2 NOT NULL,
	`params_json` text,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dashboard_widgets_dashboard_idx` ON `dashboard_widgets` (`dashboard_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_widgets_dashboard_widget_unique` ON `dashboard_widgets` (`dashboard_id`,`widget_id`);
--> statement-breakpoint
CREATE TABLE `dashboard_defaults` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`context` text NOT NULL,
	`dashboard_id` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_defaults_scope_context_unique` ON `dashboard_defaults` (`scope_type`,`scope_id`,`context`);
--> statement-breakpoint
CREATE INDEX `dashboard_defaults_dashboard_idx` ON `dashboard_defaults` (`dashboard_id`);
