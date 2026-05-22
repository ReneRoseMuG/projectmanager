DROP INDEX IF EXISTS `features_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `use_cases_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `wiki_pages_slug_unique`;--> statement-breakpoint
ALTER TABLE `features` DROP COLUMN `slug`;--> statement-breakpoint
ALTER TABLE `use_cases` DROP COLUMN `slug`;--> statement-breakpoint
ALTER TABLE `wiki_pages` DROP COLUMN `slug`;
