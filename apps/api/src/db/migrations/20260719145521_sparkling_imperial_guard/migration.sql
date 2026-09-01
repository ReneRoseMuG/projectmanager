DROP PROCEDURE IF EXISTS `ms80_dms_schema_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `ms80_dms_schema_apply_missing`()
BEGIN
	-- MySQL-DDL ist nicht transaktional. Jeder Schritt prüft deshalb seinen eigenen
	-- Zustand, damit die Migration nach einem Abbruch sicher erneut starten kann.
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'content_hash'
	) THEN
		ALTER TABLE `attachments` ADD `content_hash` varchar(64);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'is_in_document_library'
	) THEN
		ALTER TABLE `attachments` ADD `is_in_document_library` boolean DEFAULT true NOT NULL;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_content_hash_idx'
	) THEN
		CREATE INDEX `attachments_content_hash_idx` ON `attachments` (`content_hash`);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_library_created_at_idx'
	) THEN
		CREATE INDEX `attachments_library_created_at_idx` ON `attachments` (`is_in_document_library`, `created_at`);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'folder_attachments' AND INDEX_NAME = 'folder_attachments_attachment_unique'
	) THEN
		CREATE UNIQUE INDEX `folder_attachments_attachment_unique` ON `folder_attachments` (`attachment_id`);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags' AND INDEX_NAME = 'tags_domain_name_unique'
	) THEN
		CREATE UNIQUE INDEX `tags_domain_name_unique` ON `tags` (`domain`, `name`);
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags' AND INDEX_NAME = 'name_unique'
	) THEN
		DROP INDEX `name_unique` ON `tags`;
	END IF;
END;
--> statement-breakpoint
CALL `ms80_dms_schema_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms80_dms_schema_apply_missing`;
