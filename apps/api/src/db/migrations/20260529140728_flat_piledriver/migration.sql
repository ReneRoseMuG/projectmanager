CREATE TABLE `app_settings` (
	`key` varchar(191) PRIMARY KEY,
	`value` longtext NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`original_name` varchar(191) NOT NULL,
	`filename` varchar(191) NOT NULL,
	`mimetype` varchar(191) NOT NULL,
	`size` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `backlog_item_comments` (
	`backlog_item_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `backlog_item_comments_parent_comment_unique` UNIQUE INDEX(`backlog_item_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `backlog_items` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`project_id` int NOT NULL,
	`feature_id` int,
	`use_case_id` int,
	`title` varchar(191) NOT NULL,
	`description` longtext,
	`status` varchar(191) NOT NULL DEFAULT 'open',
	`import_key` varchar(191),
	`sort_order` int NOT NULL DEFAULT 0,
	`responsible_user_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `backlog_items_project_import_key_unique` UNIQUE INDEX(`project_id`,`import_key`)
);
--> statement-breakpoint
CREATE TABLE `catalog_entries` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`kind` varchar(191) NOT NULL,
	`key` varchar(191) NOT NULL,
	`label` varchar(191) NOT NULL,
	`sort_order` double NOT NULL DEFAULT 0,
	`is_closed` boolean NOT NULL DEFAULT false,
	`color` varchar(191) NOT NULL DEFAULT 'var(--color-steel-700)',
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `catalog_entries_kind_key_unique` UNIQUE INDEX(`kind`,`key`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`body` longtext NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_images` (
	`id` varchar(191) PRIMARY KEY,
	`mime_type` varchar(191) NOT NULL,
	`data` longblob NOT NULL,
	`size` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dashboard_defaults` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`scope_type` varchar(191) NOT NULL,
	`scope_id` varchar(191) NOT NULL,
	`context` varchar(191) NOT NULL,
	`dashboard_id` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `dashboard_defaults_scope_context_unique` UNIQUE INDEX(`scope_type`,`scope_id`,`context`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_widgets` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`dashboard_id` int NOT NULL,
	`widget_id` varchar(191) NOT NULL,
	`col` int NOT NULL DEFAULT 0,
	`row` int NOT NULL DEFAULT 0,
	`col_span` int NOT NULL DEFAULT 2,
	`params_json` longtext,
	CONSTRAINT `dashboard_widgets_dashboard_widget_unique` UNIQUE INDEX(`dashboard_id`,`widget_id`)
);
--> statement-breakpoint
CREATE TABLE `dashboards` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(191) NOT NULL,
	`context` varchar(191) NOT NULL,
	`is_system` boolean NOT NULL DEFAULT false,
	`template_key` varchar(191),
	`owner_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `template_key_unique` UNIQUE INDEX(`template_key`)
);
--> statement-breakpoint
CREATE TABLE `day_plan_comments` (
	`day_plan_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `day_plan_comments_owner_comment_unique` UNIQUE INDEX(`day_plan_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `day_plan_events` (
	`owner_id` int NOT NULL,
	`event_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `day_plan_events_owner_event_unique` UNIQUE INDEX(`owner_id`,`event_id`)
);
--> statement-breakpoint
CREATE TABLE `day_plan_notes` (
	`day_plan_id` int NOT NULL,
	`note_id` int NOT NULL,
	CONSTRAINT `day_plan_notes_owner_note_unique` UNIQUE INDEX(`day_plan_id`,`note_id`)
);
--> statement-breakpoint
CREATE TABLE `day_plan_tasks` (
	`owner_id` int NOT NULL,
	`task_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `day_plan_tasks_owner_task_unique` UNIQUE INDEX(`owner_id`,`task_id`)
);
--> statement-breakpoint
CREATE TABLE `day_plans` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`date` varchar(191) NOT NULL,
	`user_id` int NOT NULL,
	`status` varchar(191) NOT NULL DEFAULT 'open',
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `day_plans_user_date_unique` UNIQUE INDEX(`user_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`title` varchar(191) NOT NULL,
	`description` longtext,
	`start_time` varchar(191) NOT NULL,
	`end_time` varchar(191) NOT NULL,
	`is_all_day` boolean NOT NULL DEFAULT false,
	`color` varchar(191) DEFAULT '#6366f1',
	`reminder_minutes` int NOT NULL DEFAULT 60,
	`responsible_user_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feature_attachments` (
	`feature_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `feature_attachments_parent_attachment_unique` UNIQUE INDEX(`feature_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `feature_comments` (
	`feature_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `feature_comments_parent_comment_unique` UNIQUE INDEX(`feature_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `feature_relations` (
	`source_feature_id` int NOT NULL,
	`target_feature_id` int NOT NULL,
	`relation_type` varchar(191) NOT NULL DEFAULT 'related',
	`description` longtext,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `feature_relations_source_target_type_unique` UNIQUE INDEX(`source_feature_id`,`target_feature_id`,`relation_type`),
	CONSTRAINT `feature_relations_no_self_relation` CHECK(`feature_relations`.`source_feature_id` <> `feature_relations`.`target_feature_id`)
);
--> statement-breakpoint
CREATE TABLE `feature_tasks` (
	`owner_id` int NOT NULL,
	`task_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `feature_tasks_owner_task_unique` UNIQUE INDEX(`owner_id`,`task_id`)
);
--> statement-breakpoint
CREATE TABLE `feature_tickets` (
	`owner_id` int NOT NULL,
	`ticket_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `feature_tickets_owner_ticket_unique` UNIQUE INDEX(`owner_id`,`ticket_id`)
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`title` varchar(191) NOT NULL,
	`status` varchar(191) NOT NULL DEFAULT 'draft',
	`description` longtext,
	`content` longtext,
	`sort_order` int NOT NULL DEFAULT 0,
	`responsible_user_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`operation` varchar(191) NOT NULL,
	`object_type` varchar(191) NOT NULL,
	`object_id` int NOT NULL,
	`object_label` varchar(191) NOT NULL,
	`summary` longtext NOT NULL,
	`actor_user_id` int,
	`actor_name` varchar(191) NOT NULL DEFAULT 'System',
	`created_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entry_changes` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`journal_entry_id` int NOT NULL,
	`field_key` varchar(191) NOT NULL,
	`field_label` varchar(191) NOT NULL,
	`old_value_json` longtext NOT NULL,
	`old_value_label` longtext,
	`new_value_json` longtext NOT NULL,
	`new_value_label` longtext,
	`summary` longtext NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entry_contexts` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`journal_entry_id` int NOT NULL,
	`object_type` varchar(191) NOT NULL,
	`object_id` int NOT NULL,
	`object_label` varchar(191) NOT NULL,
	`relation` varchar(191) NOT NULL,
	CONSTRAINT `journal_context_entry_object_relation_unique` UNIQUE INDEX(`journal_entry_id`,`object_type`,`object_id`,`relation`)
);
--> statement-breakpoint
CREATE TABLE `milestone_attachments` (
	`milestone_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `milestone_attachments_parent_attachment_unique` UNIQUE INDEX(`milestone_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_comments` (
	`milestone_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `milestone_comments_parent_comment_unique` UNIQUE INDEX(`milestone_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_events` (
	`milestone_id` int NOT NULL,
	`event_id` int NOT NULL,
	CONSTRAINT `milestone_events_parent_event_unique` UNIQUE INDEX(`milestone_id`,`event_id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_features` (
	`milestone_id` int NOT NULL,
	`feature_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `milestone_notes` (
	`milestone_id` int NOT NULL,
	`note_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `milestone_tags` (
	`milestone_id` int NOT NULL,
	`tag_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `milestone_tasks` (
	`owner_id` int NOT NULL,
	`task_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `milestone_tasks_owner_task_unique` UNIQUE INDEX(`owner_id`,`task_id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_tickets` (
	`owner_id` int NOT NULL,
	`ticket_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `milestone_tickets_owner_ticket_unique` UNIQUE INDEX(`owner_id`,`ticket_id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`project_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` longtext,
	`status` varchar(191) NOT NULL DEFAULT 'active',
	`color` varchar(191) DEFAULT '#6366f1',
	`start_date` varchar(191),
	`due_date` varchar(191),
	`responsible_user_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`title` varchar(191) NOT NULL DEFAULT 'Ohne Titel',
	`content_json` longtext NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`role_id` int NOT NULL,
	`resource` varchar(191) NOT NULL,
	`action` varchar(191) NOT NULL,
	CONSTRAINT `permissions_role_resource_action_unique` UNIQUE INDEX(`role_id`,`resource`,`action`)
);
--> statement-breakpoint
CREATE TABLE `project_attachments` (
	`project_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `project_attachments_parent_attachment_unique` UNIQUE INDEX(`project_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `project_comments` (
	`project_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `project_comments_parent_comment_unique` UNIQUE INDEX(`project_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `project_events` (
	`project_id` int NOT NULL,
	`event_id` int NOT NULL,
	CONSTRAINT `project_events_parent_event_unique` UNIQUE INDEX(`project_id`,`event_id`)
);
--> statement-breakpoint
CREATE TABLE `project_features` (
	`project_id` int NOT NULL,
	`feature_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_notes` (
	`project_id` int NOT NULL,
	`note_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_tags` (
	`project_id` int NOT NULL,
	`tag_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_tasks` (
	`owner_id` int NOT NULL,
	`task_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `project_tasks_owner_task_unique` UNIQUE INDEX(`owner_id`,`task_id`)
);
--> statement-breakpoint
CREATE TABLE `project_tickets` (
	`owner_id` int NOT NULL,
	`ticket_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `project_tickets_owner_ticket_unique` UNIQUE INDEX(`owner_id`,`ticket_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(191) NOT NULL,
	`description` longtext,
	`status` varchar(191) NOT NULL DEFAULT 'active',
	`color` varchar(191) DEFAULT '#6366f1',
	`start_date` varchar(191),
	`due_date` varchar(191),
	`responsible_user_id` int,
	`wiki_page_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`user_id` int NOT NULL,
	`endpoint` varchar(512) NOT NULL,
	`p256dh` varchar(191) NOT NULL,
	`auth` varchar(191) NOT NULL,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `push_subscriptions_endpoint_unique` UNIQUE INDEX(`endpoint`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`key` varchar(191) NOT NULL,
	`label` varchar(191) NOT NULL,
	`is_system` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `key_unique` UNIQUE INDEX(`key`)
);
--> statement-breakpoint
CREATE TABLE `sent_notifications` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`event_id` int NOT NULL,
	`user_id` int NOT NULL,
	`channel` varchar(191) NOT NULL,
	`reminder_minutes` int NOT NULL,
	`sent_at` varchar(32) NOT NULL,
	CONSTRAINT `sent_notifications_event_user_channel_reminder_unique` UNIQUE INDEX(`event_id`,`user_id`,`channel`,`reminder_minutes`)
);
--> statement-breakpoint
CREATE TABLE `settings_values` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`setting_key` varchar(191) NOT NULL,
	`scope_type` varchar(191) NOT NULL,
	`scope_id` varchar(191) NOT NULL,
	`value_json` longtext NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `settings_values_setting_scope_unique` UNIQUE INDEX(`setting_key`,`scope_type`,`scope_id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(191) NOT NULL,
	`color` varchar(191) NOT NULL DEFAULT '#94a3b8',
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `name_unique` UNIQUE INDEX(`name`)
);
--> statement-breakpoint
CREATE TABLE `task_attachments` (
	`task_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `task_attachments_parent_attachment_unique` UNIQUE INDEX(`task_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`task_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `task_comments_parent_comment_unique` UNIQUE INDEX(`task_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `task_events` (
	`task_id` int NOT NULL,
	`event_id` int NOT NULL,
	CONSTRAINT `task_events_parent_event_unique` UNIQUE INDEX(`task_id`,`event_id`)
);
--> statement-breakpoint
CREATE TABLE `task_notes` (
	`task_id` int NOT NULL,
	`note_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_tags` (
	`task_id` int NOT NULL,
	`tag_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_tickets` (
	`owner_id` int NOT NULL,
	`ticket_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `task_tickets_owner_ticket_unique` UNIQUE INDEX(`owner_id`,`ticket_id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`parent_id` int,
	`title` varchar(191) NOT NULL,
	`description` longtext,
	`status` varchar(191) NOT NULL DEFAULT 'todo',
	`priority` varchar(191) NOT NULL DEFAULT 'medium',
	`responsible_user_id` int,
	`due_date` varchar(191),
	`import_key` varchar(191),
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ticket_attachments` (
	`ticket_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `ticket_attachments_parent_attachment_unique` UNIQUE INDEX(`ticket_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`ticket_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `ticket_comments_parent_comment_unique` UNIQUE INDEX(`ticket_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_notes` (
	`ticket_id` int NOT NULL,
	`note_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ticket_relations` (
	`source_ticket_id` int NOT NULL,
	`target_ticket_id` int NOT NULL,
	`relation_type` varchar(191) NOT NULL DEFAULT 'related',
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `ticket_relations_source_target_type_unique` UNIQUE INDEX(`source_ticket_id`,`target_ticket_id`,`relation_type`),
	CONSTRAINT `ticket_relations_no_self_relation` CHECK(`ticket_relations`.`source_ticket_id` <> `ticket_relations`.`target_ticket_id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_tags` (
	`ticket_id` int NOT NULL,
	`tag_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`parent_id` int,
	`type` varchar(191) NOT NULL DEFAULT 'bug',
	`title` varchar(191) NOT NULL,
	`description` longtext,
	`status` varchar(191) NOT NULL DEFAULT 'open',
	`priority` varchar(191) NOT NULL DEFAULT 'medium',
	`resolution` varchar(191),
	`reporter_user_id` int,
	`responsible_user_id` int,
	`environment` varchar(191),
	`affected_version` varchar(191),
	`due_date` varchar(191),
	`resolved_at` varchar(191),
	`position` double NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `use_case_comments` (
	`use_case_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `use_case_comments_parent_comment_unique` UNIQUE INDEX(`use_case_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `use_case_tasks` (
	`owner_id` int NOT NULL,
	`task_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `use_case_tasks_owner_task_unique` UNIQUE INDEX(`owner_id`,`task_id`)
);
--> statement-breakpoint
CREATE TABLE `use_case_tickets` (
	`owner_id` int NOT NULL,
	`ticket_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `use_case_tickets_owner_ticket_unique` UNIQUE INDEX(`owner_id`,`ticket_id`)
);
--> statement-breakpoint
CREATE TABLE `use_cases` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`feature_id` int NOT NULL,
	`title` varchar(191) NOT NULL,
	`status` varchar(191) NOT NULL DEFAULT 'draft',
	`description` longtext,
	`content` longtext,
	`sort_order` int NOT NULL DEFAULT 0,
	`responsible_user_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(191) NOT NULL,
	`first_name` varchar(191) NOT NULL DEFAULT '',
	`last_name` varchar(191) NOT NULL DEFAULT '',
	`full_name` varchar(191) NOT NULL,
	`address` varchar(191),
	`phone` varchar(191),
	`email` varchar(191) NOT NULL,
	`password_hash` varchar(255),
	`role_id` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `email_unique` UNIQUE INDEX(`email`)
);
--> statement-breakpoint
CREATE TABLE `wiki_page_attachments` (
	`wiki_page_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `wiki_page_attachments_parent_attachment_unique` UNIQUE INDEX(`wiki_page_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_page_comments` (
	`wiki_page_id` int NOT NULL,
	`comment_id` int NOT NULL,
	CONSTRAINT `wiki_page_comments_parent_comment_unique` UNIQUE INDEX(`wiki_page_id`,`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_page_notes` (
	`wiki_page_id` int NOT NULL,
	`note_id` int NOT NULL,
	CONSTRAINT `wiki_page_notes_owner_note_unique` UNIQUE INDEX(`wiki_page_id`,`note_id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_page_relations` (
	`source_wiki_page_id` int NOT NULL,
	`target_wiki_page_id` int NOT NULL,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `wiki_page_relations_source_target_unique` UNIQUE INDEX(`source_wiki_page_id`,`target_wiki_page_id`),
	CONSTRAINT `wiki_page_relations_no_self_relation` CHECK(`wiki_page_relations`.`source_wiki_page_id` <> `wiki_page_relations`.`target_wiki_page_id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_page_tasks` (
	`owner_id` int NOT NULL,
	`task_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `wiki_page_tasks_owner_task_unique` UNIQUE INDEX(`owner_id`,`task_id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_page_tickets` (
	`owner_id` int NOT NULL,
	`ticket_id` int NOT NULL,
	`position` double NOT NULL DEFAULT 0,
	CONSTRAINT `wiki_page_tickets_owner_ticket_unique` UNIQUE INDEX(`owner_id`,`ticket_id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_pages` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`parent_id` int,
	`title` varchar(191) NOT NULL,
	`content` longtext,
	`sort_order` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_images_created_at_idx` ON `content_images` (`created_at`);--> statement-breakpoint
CREATE INDEX `dashboard_defaults_dashboard_idx` ON `dashboard_defaults` (`dashboard_id`);--> statement-breakpoint
CREATE INDEX `dashboard_widgets_dashboard_idx` ON `dashboard_widgets` (`dashboard_id`);--> statement-breakpoint
CREATE INDEX `dashboards_context_owner_idx` ON `dashboards` (`context`,`owner_id`);--> statement-breakpoint
CREATE INDEX `dashboards_template_key_idx` ON `dashboards` (`template_key`);--> statement-breakpoint
CREATE INDEX `day_plans_date_idx` ON `day_plans` (`date`);--> statement-breakpoint
CREATE INDEX `journal_entries_created_at_idx` ON `journal_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `journal_entries_object_idx` ON `journal_entries` (`object_type`,`object_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_actor_idx` ON `journal_entries` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `journal_context_object_idx` ON `journal_entry_contexts` (`object_type`,`object_id`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sent_notifications_event_idx` ON `sent_notifications` (`event_id`);--> statement-breakpoint
CREATE INDEX `sent_notifications_user_idx` ON `sent_notifications` (`user_id`);--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `backlog_item_comments` ADD CONSTRAINT `backlog_item_comments_backlog_item_id_backlog_items_id_fkey` FOREIGN KEY (`backlog_item_id`) REFERENCES `backlog_items`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `backlog_item_comments` ADD CONSTRAINT `backlog_item_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `backlog_items` ADD CONSTRAINT `backlog_items_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `backlog_items` ADD CONSTRAINT `backlog_items_feature_id_features_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `backlog_items` ADD CONSTRAINT `backlog_items_use_case_id_use_cases_id_fkey` FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `backlog_items` ADD CONSTRAINT `backlog_items_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `backlog_items` ADD CONSTRAINT `backlog_items_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `backlog_items` ADD CONSTRAINT `backlog_items_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `catalog_entries` ADD CONSTRAINT `catalog_entries_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `catalog_entries` ADD CONSTRAINT `catalog_entries_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `content_images` ADD CONSTRAINT `content_images_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `content_images` ADD CONSTRAINT `content_images_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `dashboard_defaults` ADD CONSTRAINT `dashboard_defaults_dashboard_id_dashboards_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `dashboard_defaults` ADD CONSTRAINT `dashboard_defaults_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `dashboard_defaults` ADD CONSTRAINT `dashboard_defaults_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `dashboard_widgets` ADD CONSTRAINT `dashboard_widgets_dashboard_id_dashboards_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_owner_id_users_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `day_plan_comments` ADD CONSTRAINT `day_plan_comments_day_plan_id_day_plans_id_fkey` FOREIGN KEY (`day_plan_id`) REFERENCES `day_plans`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plan_comments` ADD CONSTRAINT `day_plan_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plan_events` ADD CONSTRAINT `day_plan_events_owner_id_day_plans_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `day_plans`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plan_events` ADD CONSTRAINT `day_plan_events_event_id_events_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plan_notes` ADD CONSTRAINT `day_plan_notes_day_plan_id_day_plans_id_fkey` FOREIGN KEY (`day_plan_id`) REFERENCES `day_plans`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plan_notes` ADD CONSTRAINT `day_plan_notes_note_id_notes_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plan_tasks` ADD CONSTRAINT `day_plan_tasks_owner_id_day_plans_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `day_plans`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plan_tasks` ADD CONSTRAINT `day_plan_tasks_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plans` ADD CONSTRAINT `day_plans_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `day_plans` ADD CONSTRAINT `day_plans_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `day_plans` ADD CONSTRAINT `day_plans_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `feature_attachments` ADD CONSTRAINT `feature_attachments_feature_id_features_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_attachments` ADD CONSTRAINT `feature_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_comments` ADD CONSTRAINT `feature_comments_feature_id_features_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_comments` ADD CONSTRAINT `feature_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_relations` ADD CONSTRAINT `feature_relations_source_feature_id_features_id_fkey` FOREIGN KEY (`source_feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_relations` ADD CONSTRAINT `feature_relations_target_feature_id_features_id_fkey` FOREIGN KEY (`target_feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_tasks` ADD CONSTRAINT `feature_tasks_owner_id_features_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_tasks` ADD CONSTRAINT `feature_tasks_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_tickets` ADD CONSTRAINT `feature_tickets_owner_id_features_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `feature_tickets` ADD CONSTRAINT `feature_tickets_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `features` ADD CONSTRAINT `features_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `features` ADD CONSTRAINT `features_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `features` ADD CONSTRAINT `features_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_actor_user_id_users_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `journal_entry_changes` ADD CONSTRAINT `journal_entry_changes_journal_entry_id_journal_entries_id_fkey` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `journal_entry_contexts` ADD CONSTRAINT `journal_entry_contexts_journal_entry_id_journal_entries_id_fkey` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_attachments` ADD CONSTRAINT `milestone_attachments_milestone_id_milestones_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_attachments` ADD CONSTRAINT `milestone_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_comments` ADD CONSTRAINT `milestone_comments_milestone_id_milestones_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_comments` ADD CONSTRAINT `milestone_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_events` ADD CONSTRAINT `milestone_events_milestone_id_milestones_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_events` ADD CONSTRAINT `milestone_events_event_id_events_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_features` ADD CONSTRAINT `milestone_features_milestone_id_milestones_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_features` ADD CONSTRAINT `milestone_features_feature_id_features_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_notes` ADD CONSTRAINT `milestone_notes_milestone_id_milestones_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_notes` ADD CONSTRAINT `milestone_notes_note_id_notes_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_tags` ADD CONSTRAINT `milestone_tags_milestone_id_milestones_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_tags` ADD CONSTRAINT `milestone_tags_tag_id_tags_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_tasks` ADD CONSTRAINT `milestone_tasks_owner_id_milestones_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_tasks` ADD CONSTRAINT `milestone_tasks_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_tickets` ADD CONSTRAINT `milestone_tickets_owner_id_milestones_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestone_tickets` ADD CONSTRAINT `milestone_tickets_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_role_id_roles_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_attachments` ADD CONSTRAINT `project_attachments_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_attachments` ADD CONSTRAINT `project_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_comments` ADD CONSTRAINT `project_comments_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_comments` ADD CONSTRAINT `project_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_events` ADD CONSTRAINT `project_events_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_events` ADD CONSTRAINT `project_events_event_id_events_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_features` ADD CONSTRAINT `project_features_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_features` ADD CONSTRAINT `project_features_feature_id_features_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_notes` ADD CONSTRAINT `project_notes_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_notes` ADD CONSTRAINT `project_notes_note_id_notes_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_tags` ADD CONSTRAINT `project_tags_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_tags` ADD CONSTRAINT `project_tags_tag_id_tags_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_owner_id_projects_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_tickets` ADD CONSTRAINT `project_tickets_owner_id_projects_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `project_tickets` ADD CONSTRAINT `project_tickets_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_wiki_page_id_wiki_pages_id_fkey` FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sent_notifications` ADD CONSTRAINT `sent_notifications_event_id_events_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sent_notifications` ADD CONSTRAINT `sent_notifications_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `settings_values` ADD CONSTRAINT `settings_values_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `settings_values` ADD CONSTRAINT `settings_values_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_events` ADD CONSTRAINT `task_events_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_events` ADD CONSTRAINT `task_events_event_id_events_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_notes` ADD CONSTRAINT `task_notes_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_notes` ADD CONSTRAINT `task_notes_note_id_notes_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_tags` ADD CONSTRAINT `task_tags_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_tags` ADD CONSTRAINT `task_tags_tag_id_tags_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_tickets` ADD CONSTRAINT `task_tickets_owner_id_tasks_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `task_tickets` ADD CONSTRAINT `task_tickets_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_parent_id_tasks_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `ticket_attachments` ADD CONSTRAINT `ticket_attachments_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_attachments` ADD CONSTRAINT `ticket_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_comments` ADD CONSTRAINT `ticket_comments_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_comments` ADD CONSTRAINT `ticket_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_notes` ADD CONSTRAINT `ticket_notes_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_notes` ADD CONSTRAINT `ticket_notes_note_id_notes_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_relations` ADD CONSTRAINT `ticket_relations_source_ticket_id_tickets_id_fkey` FOREIGN KEY (`source_ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_relations` ADD CONSTRAINT `ticket_relations_target_ticket_id_tickets_id_fkey` FOREIGN KEY (`target_ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_tags` ADD CONSTRAINT `ticket_tags_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ticket_tags` ADD CONSTRAINT `ticket_tags_tag_id_tags_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_parent_id_tickets_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_reporter_user_id_users_id_fkey` FOREIGN KEY (`reporter_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `use_case_comments` ADD CONSTRAINT `use_case_comments_use_case_id_use_cases_id_fkey` FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `use_case_comments` ADD CONSTRAINT `use_case_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `use_case_tasks` ADD CONSTRAINT `use_case_tasks_owner_id_use_cases_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `use_cases`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `use_case_tasks` ADD CONSTRAINT `use_case_tasks_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `use_case_tickets` ADD CONSTRAINT `use_case_tickets_owner_id_use_cases_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `use_cases`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `use_case_tickets` ADD CONSTRAINT `use_case_tickets_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `use_cases` ADD CONSTRAINT `use_cases_feature_id_features_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `use_cases` ADD CONSTRAINT `use_cases_responsible_user_id_users_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `use_cases` ADD CONSTRAINT `use_cases_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `use_cases` ADD CONSTRAINT `use_cases_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE `wiki_page_attachments` ADD CONSTRAINT `wiki_page_attachments_wiki_page_id_wiki_pages_id_fkey` FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_attachments` ADD CONSTRAINT `wiki_page_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_comments` ADD CONSTRAINT `wiki_page_comments_wiki_page_id_wiki_pages_id_fkey` FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_comments` ADD CONSTRAINT `wiki_page_comments_comment_id_comments_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_notes` ADD CONSTRAINT `wiki_page_notes_wiki_page_id_wiki_pages_id_fkey` FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_notes` ADD CONSTRAINT `wiki_page_notes_note_id_notes_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_relations` ADD CONSTRAINT `wiki_page_relations_source_wiki_page_id_wiki_pages_id_fkey` FOREIGN KEY (`source_wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_relations` ADD CONSTRAINT `wiki_page_relations_target_wiki_page_id_wiki_pages_id_fkey` FOREIGN KEY (`target_wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_tasks` ADD CONSTRAINT `wiki_page_tasks_owner_id_wiki_pages_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_tasks` ADD CONSTRAINT `wiki_page_tasks_task_id_tasks_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_tickets` ADD CONSTRAINT `wiki_page_tickets_owner_id_wiki_pages_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_page_tickets` ADD CONSTRAINT `wiki_page_tickets_ticket_id_tickets_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD CONSTRAINT `wiki_pages_parent_id_wiki_pages_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `wiki_pages`(`id`) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD CONSTRAINT `wiki_pages_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD CONSTRAINT `wiki_pages_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;