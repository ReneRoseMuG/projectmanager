CREATE TABLE IF NOT EXISTS `project_attachment_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	`parent_id` int,
	INDEX `project_attachment_folders_owner_parent_idx` (`owner_id`,`parent_id`),
	CONSTRAINT `project_attachment_folders_owner_id_projects_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `project_attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `project_attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `project_attachment_folders_UVNuqEfl6xJS_fkey` FOREIGN KEY (`parent_id`) REFERENCES `project_attachment_folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `milestone_attachment_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	`parent_id` int,
	INDEX `milestone_attachment_folders_owner_parent_idx` (`owner_id`,`parent_id`),
	CONSTRAINT `milestone_attachment_folders_owner_id_milestones_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE,
	CONSTRAINT `milestone_attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `milestone_attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `milestone_attachment_folders_YxNiM2sS4tqe_fkey` FOREIGN KEY (`parent_id`) REFERENCES `milestone_attachment_folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `task_attachment_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	`parent_id` int,
	INDEX `task_attachment_folders_owner_parent_idx` (`owner_id`,`parent_id`),
	CONSTRAINT `task_attachment_folders_owner_id_tasks_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `task_attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `task_attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `task_attachment_folders_Tr4ocaclQlwM_fkey` FOREIGN KEY (`parent_id`) REFERENCES `task_attachment_folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `feature_attachment_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	`parent_id` int,
	INDEX `feature_attachment_folders_owner_parent_idx` (`owner_id`,`parent_id`),
	CONSTRAINT `feature_attachment_folders_owner_id_features_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON DELETE CASCADE,
	CONSTRAINT `feature_attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `feature_attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `feature_attachment_folders_fAT9VqMPCenA_fkey` FOREIGN KEY (`parent_id`) REFERENCES `feature_attachment_folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wiki_page_attachment_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	`parent_id` int,
	INDEX `wiki_page_attachment_folders_owner_parent_idx` (`owner_id`,`parent_id`),
	CONSTRAINT `wiki_page_attachment_folders_owner_id_wiki_pages_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE,
	CONSTRAINT `wiki_page_attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `wiki_page_attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `wiki_page_attachment_folders_uXBF6JMGkh8O_fkey` FOREIGN KEY (`parent_id`) REFERENCES `wiki_page_attachment_folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ticket_attachment_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	`parent_id` int,
	INDEX `ticket_attachment_folders_owner_parent_idx` (`owner_id`,`parent_id`),
	CONSTRAINT `ticket_attachment_folders_owner_id_tickets_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
	CONSTRAINT `ticket_attachment_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `ticket_attachment_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `ticket_attachment_folders_9pdztpLYmyke_fkey` FOREIGN KEY (`parent_id`) REFERENCES `ticket_attachment_folders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `project_document_links` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`document_id` int NOT NULL,
	`folder_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `project_document_links_owner_document_unique` UNIQUE INDEX (`owner_id`,`document_id`),
	INDEX `project_document_links_document_idx` (`document_id`),
	INDEX `project_document_links_folder_idx` (`folder_id`),
	CONSTRAINT `project_document_links_owner_id_projects_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `project_document_links_document_id_attachments_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `project_document_links_Ns7XoqN7WoSq_fkey` FOREIGN KEY (`folder_id`) REFERENCES `project_attachment_folders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `project_document_links_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `project_document_links_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `milestone_document_links` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`document_id` int NOT NULL,
	`folder_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `milestone_document_links_owner_document_unique` UNIQUE INDEX (`owner_id`,`document_id`),
	INDEX `milestone_document_links_document_idx` (`document_id`),
	INDEX `milestone_document_links_folder_idx` (`folder_id`),
	CONSTRAINT `milestone_document_links_owner_id_milestones_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE,
	CONSTRAINT `milestone_document_links_document_id_attachments_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `milestone_document_links_Fjh8hyQauva4_fkey` FOREIGN KEY (`folder_id`) REFERENCES `milestone_attachment_folders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `milestone_document_links_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `milestone_document_links_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `task_document_links` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`document_id` int NOT NULL,
	`folder_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `task_document_links_owner_document_unique` UNIQUE INDEX (`owner_id`,`document_id`),
	INDEX `task_document_links_document_idx` (`document_id`),
	INDEX `task_document_links_folder_idx` (`folder_id`),
	CONSTRAINT `task_document_links_owner_id_tasks_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `task_document_links_document_id_attachments_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `task_document_links_folder_id_task_attachment_folders_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `task_attachment_folders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `task_document_links_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `task_document_links_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `feature_document_links` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`document_id` int NOT NULL,
	`folder_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `feature_document_links_owner_document_unique` UNIQUE INDEX (`owner_id`,`document_id`),
	INDEX `feature_document_links_document_idx` (`document_id`),
	INDEX `feature_document_links_folder_idx` (`folder_id`),
	CONSTRAINT `feature_document_links_owner_id_features_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `features`(`id`) ON DELETE CASCADE,
	CONSTRAINT `feature_document_links_document_id_attachments_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `feature_document_links_jfIEhG4DrfNW_fkey` FOREIGN KEY (`folder_id`) REFERENCES `feature_attachment_folders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `feature_document_links_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `feature_document_links_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `wiki_page_document_links` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`document_id` int NOT NULL,
	`folder_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `wiki_page_document_links_owner_document_unique` UNIQUE INDEX (`owner_id`,`document_id`),
	INDEX `wiki_page_document_links_document_idx` (`document_id`),
	INDEX `wiki_page_document_links_folder_idx` (`folder_id`),
	CONSTRAINT `wiki_page_document_links_owner_id_wiki_pages_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE,
	CONSTRAINT `wiki_page_document_links_document_id_attachments_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `wiki_page_document_links_5KaQA60xxdWI_fkey` FOREIGN KEY (`folder_id`) REFERENCES `wiki_page_attachment_folders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `wiki_page_document_links_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `wiki_page_document_links_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ticket_document_links` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_id` int NOT NULL,
	`document_id` int NOT NULL,
	`folder_id` int,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `ticket_document_links_owner_document_unique` UNIQUE INDEX (`owner_id`,`document_id`),
	INDEX `ticket_document_links_document_idx` (`document_id`),
	INDEX `ticket_document_links_folder_idx` (`folder_id`),
	CONSTRAINT `ticket_document_links_owner_id_tickets_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
	CONSTRAINT `ticket_document_links_document_id_attachments_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `ticket_document_links_qgaW3Hycle8A_fkey` FOREIGN KEY (`folder_id`) REFERENCES `ticket_attachment_folders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `ticket_document_links_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `ticket_document_links_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `separate_parent_attachments_and_documents`;
--> statement-breakpoint
CREATE PROCEDURE `separate_parent_attachments_and_documents`()
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'kind'
	) THEN
		ALTER TABLE `attachments` ADD `kind` varchar(191) NULL;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'is_in_document_library'
	) THEN
		SET @attachment_separation_ambiguous = 0;
		SET @attachment_separation_sql = '
			WITH owner_links AS (
				SELECT attachment_id FROM project_attachments
				UNION ALL SELECT attachment_id FROM milestone_attachments
				UNION ALL SELECT attachment_id FROM task_attachments
				UNION ALL SELECT attachment_id FROM feature_attachments
				UNION ALL SELECT attachment_id FROM wiki_page_attachments
				UNION ALL SELECT attachment_id FROM ticket_attachments
			), owner_counts AS (
				SELECT attachment_id, COUNT(*) owner_count FROM owner_links GROUP BY attachment_id
			)
			SELECT COUNT(*) INTO @attachment_separation_ambiguous
			FROM attachments a
			LEFT JOIN owner_counts o ON o.attachment_id = a.id
			WHERE a.is_in_document_library = 0 AND COALESCE(o.owner_count, 0) <> 1';
		PREPARE attachment_separation_statement FROM @attachment_separation_sql;
		EXECUTE attachment_separation_statement;
		DEALLOCATE PREPARE attachment_separation_statement;
		IF @attachment_separation_ambiguous > 0 THEN
			SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attachment separation blocked: parent attachment candidates must have exactly one owner';
		END IF;

		SET @attachment_separation_folder_links = 0;
		SET @attachment_separation_sql = '
			SELECT COUNT(*) INTO @attachment_separation_folder_links
			FROM folder_attachments fa
			INNER JOIN attachments a ON a.id = fa.attachment_id
			WHERE a.is_in_document_library = 0';
		PREPARE attachment_separation_statement FROM @attachment_separation_sql;
		EXECUTE attachment_separation_statement;
		DEALLOCATE PREPARE attachment_separation_statement;
		IF @attachment_separation_folder_links > 0 THEN
			SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attachment separation blocked: parent attachment candidates still use DMS collections';
		END IF;

		SET @attachment_separation_sql = 'UPDATE attachments SET kind = IF(is_in_document_library = 1, ''document'', ''parent_attachment'') WHERE kind IS NULL';
		PREPARE attachment_separation_statement FROM @attachment_separation_sql;
		EXECUTE attachment_separation_statement;
		DEALLOCATE PREPARE attachment_separation_statement;
	END IF;

	IF EXISTS (SELECT 1 FROM `attachments` WHERE `kind` IS NULL LIMIT 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attachment separation blocked: attachment kind could not be derived';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_attachments' AND COLUMN_NAME = 'folder_id') THEN
		ALTER TABLE `project_attachments` ADD `folder_id` int;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'milestone_attachments' AND COLUMN_NAME = 'folder_id') THEN
		ALTER TABLE `milestone_attachments` ADD `folder_id` int;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'task_attachments' AND COLUMN_NAME = 'folder_id') THEN
		ALTER TABLE `task_attachments` ADD `folder_id` int;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feature_attachments' AND COLUMN_NAME = 'folder_id') THEN
		ALTER TABLE `feature_attachments` ADD `folder_id` int;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wiki_page_attachments' AND COLUMN_NAME = 'folder_id') THEN
		ALTER TABLE `wiki_page_attachments` ADD `folder_id` int;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticket_attachments' AND COLUMN_NAME = 'folder_id') THEN
		ALTER TABLE `ticket_attachments` ADD `folder_id` int;
	END IF;

	INSERT IGNORE INTO `project_document_links` (`owner_id`,`document_id`,`version`,`created_by`,`updated_by`,`created_at`,`updated_at`)
		SELECT pa.project_id, pa.attachment_id, 1, a.created_by, a.updated_by, a.created_at, a.updated_at
		FROM `project_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	INSERT IGNORE INTO `milestone_document_links` (`owner_id`,`document_id`,`version`,`created_by`,`updated_by`,`created_at`,`updated_at`)
		SELECT pa.milestone_id, pa.attachment_id, 1, a.created_by, a.updated_by, a.created_at, a.updated_at
		FROM `milestone_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	INSERT IGNORE INTO `task_document_links` (`owner_id`,`document_id`,`version`,`created_by`,`updated_by`,`created_at`,`updated_at`)
		SELECT pa.task_id, pa.attachment_id, 1, a.created_by, a.updated_by, a.created_at, a.updated_at
		FROM `task_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	INSERT IGNORE INTO `feature_document_links` (`owner_id`,`document_id`,`version`,`created_by`,`updated_by`,`created_at`,`updated_at`)
		SELECT pa.feature_id, pa.attachment_id, 1, a.created_by, a.updated_by, a.created_at, a.updated_at
		FROM `feature_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	INSERT IGNORE INTO `wiki_page_document_links` (`owner_id`,`document_id`,`version`,`created_by`,`updated_by`,`created_at`,`updated_at`)
		SELECT pa.wiki_page_id, pa.attachment_id, 1, a.created_by, a.updated_by, a.created_at, a.updated_at
		FROM `wiki_page_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	INSERT IGNORE INTO `ticket_document_links` (`owner_id`,`document_id`,`version`,`created_by`,`updated_by`,`created_at`,`updated_at`)
		SELECT pa.ticket_id, pa.attachment_id, 1, a.created_by, a.updated_by, a.created_at, a.updated_at
		FROM `ticket_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';

	DELETE pa FROM `project_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	DELETE pa FROM `milestone_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	DELETE pa FROM `task_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	DELETE pa FROM `feature_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	DELETE pa FROM `wiki_page_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';
	DELETE pa FROM `ticket_attachments` pa INNER JOIN `attachments` a ON a.id = pa.attachment_id WHERE a.kind = 'document';

	INSERT IGNORE INTO `permissions` (`role_id`,`resource`,`action`)
		SELECT `role_id`, 'documents', `action` FROM `permissions` WHERE `resource` = 'attachments';

	IF EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_library_created_at_idx') THEN
		DROP INDEX `attachments_library_created_at_idx` ON `attachments`;
	END IF;
	IF EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_library_mimetype_created_at_idx') THEN
		DROP INDEX `attachments_library_mimetype_created_at_idx` ON `attachments`;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_kind_created_at_idx') THEN
		CREATE INDEX `attachments_kind_created_at_idx` ON `attachments` (`kind`,`created_at`);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_kind_mimetype_created_at_idx') THEN
		CREATE INDEX `attachments_kind_mimetype_created_at_idx` ON `attachments` (`kind`,`mimetype`,`created_at`);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_attachments' AND INDEX_NAME = 'project_attachments_folder_idx') THEN
		CREATE INDEX `project_attachments_folder_idx` ON `project_attachments` (`folder_id`);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'milestone_attachments' AND INDEX_NAME = 'milestone_attachments_folder_idx') THEN
		CREATE INDEX `milestone_attachments_folder_idx` ON `milestone_attachments` (`folder_id`);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'task_attachments' AND INDEX_NAME = 'task_attachments_folder_idx') THEN
		CREATE INDEX `task_attachments_folder_idx` ON `task_attachments` (`folder_id`);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feature_attachments' AND INDEX_NAME = 'feature_attachments_folder_idx') THEN
		CREATE INDEX `feature_attachments_folder_idx` ON `feature_attachments` (`folder_id`);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wiki_page_attachments' AND INDEX_NAME = 'wiki_page_attachments_folder_idx') THEN
		CREATE INDEX `wiki_page_attachments_folder_idx` ON `wiki_page_attachments` (`folder_id`);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticket_attachments' AND INDEX_NAME = 'ticket_attachments_folder_idx') THEN
		CREATE INDEX `ticket_attachments_folder_idx` ON `ticket_attachments` (`folder_id`);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_attachments' AND CONSTRAINT_NAME = 'project_attachments_DY3IZqjYouLJ_fkey') THEN
		ALTER TABLE `project_attachments` ADD CONSTRAINT `project_attachments_DY3IZqjYouLJ_fkey` FOREIGN KEY (`folder_id`) REFERENCES `project_attachment_folders`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'milestone_attachments' AND CONSTRAINT_NAME = 'milestone_attachments_Xl5cW7tTbDyx_fkey') THEN
		ALTER TABLE `milestone_attachments` ADD CONSTRAINT `milestone_attachments_Xl5cW7tTbDyx_fkey` FOREIGN KEY (`folder_id`) REFERENCES `milestone_attachment_folders`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'task_attachments' AND CONSTRAINT_NAME = 'task_attachments_folder_id_task_attachment_folders_id_fkey') THEN
		ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_folder_id_task_attachment_folders_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `task_attachment_folders`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'feature_attachments' AND CONSTRAINT_NAME = 'feature_attachments_zT0Jj37YIAsN_fkey') THEN
		ALTER TABLE `feature_attachments` ADD CONSTRAINT `feature_attachments_zT0Jj37YIAsN_fkey` FOREIGN KEY (`folder_id`) REFERENCES `feature_attachment_folders`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'wiki_page_attachments' AND CONSTRAINT_NAME = 'wiki_page_attachments_RESR34nE1AsF_fkey') THEN
		ALTER TABLE `wiki_page_attachments` ADD CONSTRAINT `wiki_page_attachments_RESR34nE1AsF_fkey` FOREIGN KEY (`folder_id`) REFERENCES `wiki_page_attachment_folders`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ticket_attachments' AND CONSTRAINT_NAME = 'ticket_attachments_folder_id_ticket_attachment_folders_id_fkey') THEN
		ALTER TABLE `ticket_attachments` ADD CONSTRAINT `ticket_attachments_folder_id_ticket_attachment_folders_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `ticket_attachment_folders`(`id`) ON DELETE SET NULL;
	END IF;

	ALTER TABLE `attachments` MODIFY `kind` varchar(191) NOT NULL DEFAULT 'document';

	IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'is_in_document_library') THEN
		ALTER TABLE `attachments` DROP COLUMN `is_in_document_library`;
	END IF;
	IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_folders' AND COLUMN_NAME = 'project_id') THEN
		IF EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_folders' AND CONSTRAINT_NAME = 'attachment_folders_project_id_projects_id_fkey') THEN
			ALTER TABLE `attachment_folders` DROP FOREIGN KEY `attachment_folders_project_id_projects_id_fkey`;
		END IF;
		ALTER TABLE `attachment_folders` DROP COLUMN `project_id`;
	END IF;
END;
--> statement-breakpoint
CALL `separate_parent_attachments_and_documents`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `separate_parent_attachments_and_documents`;
