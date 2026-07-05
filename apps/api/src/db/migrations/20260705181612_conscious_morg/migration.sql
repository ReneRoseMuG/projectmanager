CREATE TABLE IF NOT EXISTS `calendar_sync_journal` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`user_id` int NOT NULL,
	`connection_id` int,
	`connection_label` varchar(191) NOT NULL,
	`event_type` varchar(191) NOT NULL,
	`message` longtext,
	`created_at` varchar(32) NOT NULL,
	INDEX `calendar_sync_journal_user_idx` (`user_id`,`id`),
	INDEX `calendar_sync_journal_connection_idx` (`connection_id`)
);
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms79_journal_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `ms79_journal_apply_missing`()
BEGIN
	-- MySQL DDL is not transactional and the production DB is remote: each step re-checks its own
	-- precondition so the migration can resume from any partially applied state. connection_id is
	-- ON DELETE SET NULL, damit die Journal-Historie eine Verbindungs-Trennung überlebt.
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_sync_journal' AND CONSTRAINT_NAME = 'calendar_sync_journal_user_id_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `calendar_sync_journal` ADD CONSTRAINT `calendar_sync_journal_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_sync_journal' AND CONSTRAINT_NAME = 'calendar_sync_journal_connection_id_calendar_connections_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `calendar_sync_journal` ADD CONSTRAINT `calendar_sync_journal_connection_id_calendar_connections_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `calendar_connections`(`id`) ON DELETE SET NULL;
	END IF;
END;
--> statement-breakpoint
CALL `ms79_journal_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms79_journal_apply_missing`;
