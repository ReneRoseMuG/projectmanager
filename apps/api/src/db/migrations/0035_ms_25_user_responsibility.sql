ALTER TABLE `projects` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `milestones` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `features` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `use_cases` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `backlog_items` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `events` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
UPDATE `tasks`
SET `responsible_user_id` = (
  SELECT `users`.`id`
  FROM `users`
  WHERE lower(`users`.`full_name`) = lower(trim(`tasks`.`assignee`))
    OR lower(`users`.`name`) = lower(trim(`tasks`.`assignee`))
    OR lower(`users`.`email`) = lower(trim(`tasks`.`assignee`))
  ORDER BY `users`.`id`
  LIMIT 1
)
WHERE `tasks`.`assignee` IS NOT NULL AND trim(`tasks`.`assignee`) <> '';
--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `assignee`;
--> statement-breakpoint
ALTER TABLE `tickets` ADD `reporter_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `tickets` ADD `responsible_user_id` integer REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
UPDATE `tickets`
SET `reporter_user_id` = (
  SELECT `users`.`id`
  FROM `users`
  WHERE lower(`users`.`full_name`) = lower(trim(`tickets`.`reporter`))
    OR lower(`users`.`name`) = lower(trim(`tickets`.`reporter`))
    OR lower(`users`.`email`) = lower(trim(`tickets`.`reporter`))
  ORDER BY `users`.`id`
  LIMIT 1
)
WHERE `tickets`.`reporter` IS NOT NULL AND trim(`tickets`.`reporter`) <> '';
--> statement-breakpoint
UPDATE `tickets`
SET `responsible_user_id` = (
  SELECT `users`.`id`
  FROM `users`
  WHERE lower(`users`.`full_name`) = lower(trim(`tickets`.`assignee`))
    OR lower(`users`.`name`) = lower(trim(`tickets`.`assignee`))
    OR lower(`users`.`email`) = lower(trim(`tickets`.`assignee`))
  ORDER BY `users`.`id`
  LIMIT 1
)
WHERE `tickets`.`assignee` IS NOT NULL AND trim(`tickets`.`assignee`) <> '';
--> statement-breakpoint
ALTER TABLE `tickets` DROP COLUMN `reporter`;
--> statement-breakpoint
ALTER TABLE `tickets` DROP COLUMN `assignee`;
