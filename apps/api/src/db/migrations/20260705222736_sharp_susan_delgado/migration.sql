DROP PROCEDURE IF EXISTS `ms79_push_channel_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `ms79_push_channel_apply_missing`()
BEGIN
	-- MySQL DDL is not transactional and the production DB is remote: each step re-checks its own
	-- precondition, damit die Migration aus jedem teilweise angewendeten Zustand fortsetzbar ist.
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_calendars' AND COLUMN_NAME = 'push_channel_id') THEN
		ALTER TABLE `external_calendars` ADD `push_channel_id` varchar(191);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_calendars' AND COLUMN_NAME = 'push_resource_id') THEN
		ALTER TABLE `external_calendars` ADD `push_resource_id` varchar(512);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_calendars' AND COLUMN_NAME = 'push_expiration') THEN
		ALTER TABLE `external_calendars` ADD `push_expiration` varchar(32);
	END IF;
END;
--> statement-breakpoint
CALL `ms79_push_channel_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms79_push_channel_apply_missing`;
