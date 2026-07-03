CREATE TABLE `attachment_categories` (
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
CREATE TABLE `attachment_category_links` (
	`category_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `attachment_category_links_category_attachment_unique` UNIQUE INDEX(`category_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `attachment_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`parent_id` int,
	`project_id` int,
	`name` varchar(191) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attachment_tags` (
	`attachment_id` int NOT NULL,
	`tag_id` int NOT NULL,
	CONSTRAINT `attachment_tags_attachment_tag_unique` UNIQUE INDEX(`attachment_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `folder_attachments` (
	`folder_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `folder_attachments_folder_attachment_unique` UNIQUE INDEX(`folder_id`,`attachment_id`)
);
--> statement-breakpoint
ALTER TABLE `attachments` ADD `display_name` varchar(191);--> statement-breakpoint
ALTER TABLE `attachments` ADD `description` longtext;--> statement-breakpoint
ALTER TABLE `tags` ADD `is_system` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `attachment_categories` ADD CONSTRAINT `attachment_categories_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `attachment_categories` ADD CONSTRAINT `attachment_categories_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `attachment_category_links` ADD CONSTRAINT `attachment_category_links_XJMR6CXAiK6C_fkey` FOREIGN KEY (`category_id`) REFERENCES `attachment_categories`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `attachment_category_links` ADD CONSTRAINT `attachment_category_links_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_parent_id_attachment_folders_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `attachment_folders`(`id`) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `attachment_tags` ADD CONSTRAINT `attachment_tags_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `attachment_tags` ADD CONSTRAINT `attachment_tags_tag_id_tags_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `folder_attachments` ADD CONSTRAINT `folder_attachments_folder_id_attachment_folders_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `attachment_folders`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `folder_attachments` ADD CONSTRAINT `folder_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;