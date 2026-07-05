CREATE TABLE IF NOT EXISTS `attachment_categories` (
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
CREATE TABLE IF NOT EXISTS `attachment_category_links` (
	`category_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `attachment_category_links_category_id_attachment_id_pk` PRIMARY KEY(`category_id`,`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attachment_folders` (
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
CREATE TABLE IF NOT EXISTS `attachment_tags` (
	`attachment_id` int NOT NULL,
	`tag_id` int NOT NULL,
	CONSTRAINT `attachment_tags_attachment_id_tag_id_pk` PRIMARY KEY(`attachment_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `folder_attachments` (
	`folder_id` int NOT NULL,
	`attachment_id` int NOT NULL,
	CONSTRAINT `folder_attachments_folder_id_attachment_id_pk` PRIMARY KEY(`folder_id`,`attachment_id`)
);
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms75_dms_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `ms75_dms_apply_missing`()
BEGIN
	-- MySQL DDL is not transactional and the production DB is remote: every step
	-- below re-checks its own precondition so the migration can resume from any
	-- partially applied state (e.g. after a dropped connection).
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'display_name') THEN
		ALTER TABLE `attachments` ADD `display_name` varchar(191);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'description') THEN
		ALTER TABLE `attachments` ADD `description` longtext;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags' AND COLUMN_NAME = 'is_system') THEN
		ALTER TABLE `tags` ADD `is_system` boolean DEFAULT false NOT NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_categories' AND CONSTRAINT_NAME = 'attachment_categories_created_by_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_categories` ADD CONSTRAINT `attachment_categories_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_categories' AND CONSTRAINT_NAME = 'attachment_categories_updated_by_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_categories` ADD CONSTRAINT `attachment_categories_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_category_links' AND CONSTRAINT_NAME = 'attachment_category_links_XJMR6CXAiK6C_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_category_links` ADD CONSTRAINT `attachment_category_links_XJMR6CXAiK6C_fkey` FOREIGN KEY (`category_id`) REFERENCES `attachment_categories`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_category_links' AND CONSTRAINT_NAME = 'attachment_category_links_attachment_id_attachments_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_category_links` ADD CONSTRAINT `attachment_category_links_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_folders' AND CONSTRAINT_NAME = 'attachment_folders_parent_id_attachment_folders_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_parent_id_attachment_folders_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `attachment_folders`(`id`) ON DELETE RESTRICT;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_folders' AND CONSTRAINT_NAME = 'attachment_folders_project_id_projects_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_folders' AND CONSTRAINT_NAME = 'attachment_folders_created_by_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_folders' AND CONSTRAINT_NAME = 'attachment_folders_updated_by_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_folders` ADD CONSTRAINT `attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_tags' AND CONSTRAINT_NAME = 'attachment_tags_attachment_id_attachments_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_tags` ADD CONSTRAINT `attachment_tags_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_tags' AND CONSTRAINT_NAME = 'attachment_tags_tag_id_tags_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `attachment_tags` ADD CONSTRAINT `attachment_tags_tag_id_tags_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'folder_attachments' AND CONSTRAINT_NAME = 'folder_attachments_folder_id_attachment_folders_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `folder_attachments` ADD CONSTRAINT `folder_attachments_folder_id_attachment_folders_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `attachment_folders`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'folder_attachments' AND CONSTRAINT_NAME = 'folder_attachments_attachment_id_attachments_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `folder_attachments` ADD CONSTRAINT `folder_attachments_attachment_id_attachments_id_fkey` FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;
END;
--> statement-breakpoint
CALL `ms75_dms_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms75_dms_apply_missing`;
