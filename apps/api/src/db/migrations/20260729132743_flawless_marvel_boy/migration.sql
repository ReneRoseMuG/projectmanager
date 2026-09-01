CREATE TABLE IF NOT EXISTS `attachment_local_folders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`owner_type` varchar(191) NOT NULL,
	`owner_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`root_path` longtext NOT NULL,
	`root_path_hash` varchar(64) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `attachment_local_folders_owner_path_unique` UNIQUE INDEX(`owner_type`,`owner_id`,`root_path_hash`),
	INDEX `attachment_local_folders_owner_idx` (`owner_type`,`owner_id`),
	CONSTRAINT `attachment_local_folders_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `attachment_local_folders_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
