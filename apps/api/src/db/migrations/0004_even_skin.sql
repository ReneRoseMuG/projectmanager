PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `comments_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `task_id` integer,
  `entity_type` text DEFAULT 'task' NOT NULL,
  `entity_id` integer NOT NULL,
  `body` text NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `comments_new` (`id`, `task_id`, `entity_type`, `entity_id`, `body`, `created_at`)
SELECT `id`, `task_id`, 'task', `task_id`, `body`, `created_at`
FROM `comments`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `comments_new` RENAME TO `comments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
