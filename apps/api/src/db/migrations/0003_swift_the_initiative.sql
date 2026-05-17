ALTER TABLE tasks ADD `import_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_import_key_unique` ON `tasks` (`project_id`,`import_key`);