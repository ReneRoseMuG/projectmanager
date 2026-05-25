ALTER TABLE `projects` ADD `wiki_page_id` integer REFERENCES `wiki_pages`(`id`) ON DELETE set null;
--> statement-breakpoint
UPDATE `projects`
SET `wiki_page_id` = (
  SELECT `wiki_pages`.`id`
  FROM `wiki_pages`
  WHERE `wiki_pages`.`project_id` = `projects`.`id`
  ORDER BY
    CASE WHEN `wiki_pages`.`parent_id` IS NULL THEN 0 ELSE 1 END,
    `wiki_pages`.`sort_order`,
    `wiki_pages`.`id`
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM `wiki_pages`
  WHERE `wiki_pages`.`project_id` = `projects`.`id`
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_wiki_pages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `parent_id` integer,
  `title` text NOT NULL,
  `content_path` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `created_by` integer,
  `updated_by` integer,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`parent_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_wiki_pages` (`id`, `parent_id`, `title`, `content_path`, `sort_order`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT `id`, `parent_id`, `title`, `content_path`, `sort_order`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`
FROM `wiki_pages`;
--> statement-breakpoint
DROP TABLE `wiki_pages`;
--> statement-breakpoint
ALTER TABLE `__new_wiki_pages` RENAME TO `wiki_pages`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
