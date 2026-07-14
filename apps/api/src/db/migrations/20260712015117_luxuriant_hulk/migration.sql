DROP PROCEDURE IF EXISTS `dms_sort_order_apply_missing`;
--> statement-breakpoint
CREATE PROCEDURE `dms_sort_order_apply_missing`()
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_categories' AND COLUMN_NAME = 'sort_order') THEN
		ALTER TABLE `attachment_categories` ADD `sort_order` int DEFAULT 0 NOT NULL;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachment_folders' AND COLUMN_NAME = 'sort_order') THEN
		ALTER TABLE `attachment_folders` ADD `sort_order` int DEFAULT 0 NOT NULL;
	END IF;

	-- Deterministic initial order for existing rows. Re-running after a partial DDL
	-- application is safe because the same source order produces the same values.
	UPDATE `attachment_categories` AS category
	INNER JOIN (
		SELECT `id`, (ROW_NUMBER() OVER (ORDER BY `name`, `id`) - 1) * 1024 AS `next_sort_order`
		FROM `attachment_categories`
	) AS ranked ON ranked.`id` = category.`id`
	SET category.`sort_order` = ranked.`next_sort_order`;

	UPDATE `attachment_folders` AS folder
	INNER JOIN (
		SELECT `id`, (ROW_NUMBER() OVER (PARTITION BY `parent_id` ORDER BY `name`, `id`) - 1) * 1024 AS `next_sort_order`
		FROM `attachment_folders`
	) AS ranked ON ranked.`id` = folder.`id`
	SET folder.`sort_order` = ranked.`next_sort_order`;
END;
--> statement-breakpoint
CALL `dms_sort_order_apply_missing`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `dms_sort_order_apply_missing`;
