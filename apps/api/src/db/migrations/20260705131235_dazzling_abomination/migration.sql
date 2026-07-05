CREATE TABLE IF NOT EXISTS `calendar_connections` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`user_id` int NOT NULL,
	`provider` varchar(191) NOT NULL,
	`display_name` varchar(191) NOT NULL,
	`encrypted_credentials` longtext,
	`status` varchar(191) NOT NULL DEFAULT 'active',
	`last_sync_at` varchar(32),
	`last_error` longtext,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	INDEX `calendar_connections_user_idx` (`user_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `external_calendars` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`connection_id` int NOT NULL,
	`external_id` varchar(512) NOT NULL,
	`name` varchar(191),
	`color` varchar(191),
	`imported` boolean NOT NULL DEFAULT false,
	`readonly` boolean NOT NULL DEFAULT false,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `external_calendars_connection_external_unique` UNIQUE INDEX(`connection_id`,`external_id`),
	INDEX `external_calendars_connection_idx` (`connection_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `calendar_sync_states` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`connection_id` int NOT NULL,
	`external_calendar_id` int NOT NULL,
	`sync_token` longtext,
	`ctag` varchar(191),
	`last_success_at` varchar(32),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `calendar_sync_states_connection_calendar_unique` UNIQUE INDEX(`connection_id`,`external_calendar_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_mappings` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`connection_id` int NOT NULL,
	`external_calendar_id` int NOT NULL,
	`local_event_id` int NOT NULL,
	`external_id` varchar(512) NOT NULL,
	`ical_uid` varchar(512),
	`etag` varchar(255),
	`seen_version` int,
	`origin` varchar(191) NOT NULL,
	`direction` varchar(191) NOT NULL DEFAULT 'import',
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `event_mappings_connection_external_unique` UNIQUE INDEX(`connection_id`,`external_id`),
	INDEX `event_mappings_local_event_idx` (`local_event_id`),
	INDEX `event_mappings_external_calendar_idx` (`external_calendar_id`)
);
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms79_calendarsync_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `ms79_calendarsync_apply_missing`()
BEGIN
	-- MySQL DDL is not transactional and the production DB is remote: every step
	-- below re-checks its own precondition so the migration can resume from any
	-- partially applied state (e.g. after a dropped connection). The two new
	-- events columns backfill existing rows via their NOT NULL DEFAULT.
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'origin') THEN
		ALTER TABLE `events` ADD `origin` varchar(191) DEFAULT 'local' NOT NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'readonly') THEN
		ALTER TABLE `events` ADD `readonly` boolean DEFAULT false NOT NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_connections' AND CONSTRAINT_NAME = 'calendar_connections_user_id_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `calendar_connections` ADD CONSTRAINT `calendar_connections_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_connections' AND CONSTRAINT_NAME = 'calendar_connections_created_by_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `calendar_connections` ADD CONSTRAINT `calendar_connections_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_connections' AND CONSTRAINT_NAME = 'calendar_connections_updated_by_users_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `calendar_connections` ADD CONSTRAINT `calendar_connections_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'external_calendars' AND CONSTRAINT_NAME = 'external_calendars_connection_id_calendar_connections_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `external_calendars` ADD CONSTRAINT `external_calendars_connection_id_calendar_connections_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `calendar_connections`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_sync_states' AND CONSTRAINT_NAME = 'calendar_sync_states_connection_id_calendar_connections_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `calendar_sync_states` ADD CONSTRAINT `calendar_sync_states_connection_id_calendar_connections_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `calendar_connections`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_sync_states' AND CONSTRAINT_NAME = 'calendar_sync_states_1hWkuOGrOoNG_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `calendar_sync_states` ADD CONSTRAINT `calendar_sync_states_1hWkuOGrOoNG_fkey` FOREIGN KEY (`external_calendar_id`) REFERENCES `external_calendars`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'event_mappings' AND CONSTRAINT_NAME = 'event_mappings_connection_id_calendar_connections_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `event_mappings` ADD CONSTRAINT `event_mappings_connection_id_calendar_connections_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `calendar_connections`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'event_mappings' AND CONSTRAINT_NAME = 'event_mappings_external_calendar_id_external_calendars_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `event_mappings` ADD CONSTRAINT `event_mappings_external_calendar_id_external_calendars_id_fkey` FOREIGN KEY (`external_calendar_id`) REFERENCES `external_calendars`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'event_mappings' AND CONSTRAINT_NAME = 'event_mappings_local_event_id_events_id_fkey' AND CONSTRAINT_TYPE = 'FOREIGN KEY') THEN
		ALTER TABLE `event_mappings` ADD CONSTRAINT `event_mappings_local_event_id_events_id_fkey` FOREIGN KEY (`local_event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE;
	END IF;
END;
--> statement-breakpoint
CALL `ms79_calendarsync_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms79_calendarsync_apply_missing`;
