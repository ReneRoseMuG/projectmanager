DROP PROCEDURE IF EXISTS `ms80_add_document_filter_indexes`;
--> statement-breakpoint
CREATE PROCEDURE `ms80_add_document_filter_indexes`()
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE()
			AND TABLE_NAME = 'attachment_tags'
			AND INDEX_NAME = 'attachment_tags_tag_attachment_idx'
	) THEN
		CREATE INDEX `attachment_tags_tag_attachment_idx`
			ON `attachment_tags` (`tag_id`, `attachment_id`);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE()
			AND TABLE_NAME = 'attachments'
			AND INDEX_NAME = 'attachments_library_mimetype_created_at_idx'
	) THEN
		CREATE INDEX `attachments_library_mimetype_created_at_idx`
			ON `attachments` (`is_in_document_library`, `mimetype`, `created_at`);
	END IF;
END;
--> statement-breakpoint
CALL `ms80_add_document_filter_indexes`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms80_add_document_filter_indexes`;
