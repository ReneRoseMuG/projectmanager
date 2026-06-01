CREATE INDEX `backlog_items_project_status_idx` ON `backlog_items` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `features_sort_order_status_idx` ON `features` (`sort_order`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_status_updated_at_idx` ON `tasks` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `tasks_parent_status_idx` ON `tasks` (`parent_id`,`status`);--> statement-breakpoint
CREATE INDEX `use_cases_feature_sort_order_idx` ON `use_cases` (`feature_id`,`sort_order`);