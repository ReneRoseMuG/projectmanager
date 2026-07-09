DROP PROCEDURE IF EXISTS `tkt158_attachment_hash_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `tkt158_attachment_hash_apply_missing`()
BEGIN
	-- MySQL DDL is not transactional and the production DB is remote: each step re-checks its own
	-- precondition, damit die Migration aus jedem teilweise angewendeten Zustand fortsetzbar ist.
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'content_hash') THEN
		ALTER TABLE `attachments` ADD `content_hash` varchar(64);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_content_hash_idx') THEN
		CREATE INDEX `attachments_content_hash_idx` ON `attachments` (`content_hash`);
	END IF;
END;
--> statement-breakpoint
CALL `tkt158_attachment_hash_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `tkt158_attachment_hash_apply_missing`;
