CREATE TABLE `diary_entries` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`project_id` int NOT NULL,
	`title` varchar(191) NOT NULL,
	`content` longtext,
	`covered_until` varchar(32),
	`source_count` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `diary_entries_project_unique` UNIQUE INDEX(`project_id`),
	CONSTRAINT `diary_entries_project_id_projects_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `diary_entries_created_by_users_id_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `diary_entries_updated_by_users_id_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
