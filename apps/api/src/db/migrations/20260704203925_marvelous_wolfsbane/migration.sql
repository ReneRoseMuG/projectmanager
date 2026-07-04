DROP PROCEDURE IF EXISTS `ms75_tag_domain_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `ms75_tag_domain_apply_missing`()
BEGIN
	-- MySQL DDL is not transactional and the production DB is remote: the column
	-- add below re-checks its own precondition so the migration can resume from a
	-- partially applied state (e.g. after a dropped connection). The NOT NULL
	-- DEFAULT 'pm' backfills every existing tag to the project-management domain.
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags' AND COLUMN_NAME = 'domain') THEN
		ALTER TABLE `tags` ADD `domain` varchar(191) DEFAULT 'pm' NOT NULL;
	END IF;
END;
--> statement-breakpoint
CALL `ms75_tag_domain_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms75_tag_domain_apply_missing`;