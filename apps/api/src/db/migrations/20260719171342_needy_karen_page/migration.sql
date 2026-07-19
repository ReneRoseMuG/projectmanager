DROP PROCEDURE IF EXISTS `ms80_cleanup_attachment_categories`;--> statement-breakpoint
CREATE PROCEDURE `ms80_cleanup_attachment_categories`()
BEGIN
  DECLARE category_table_exists INT DEFAULT 0;
  DECLARE link_table_exists INT DEFAULT 0;
  DECLARE missing_categories INT DEFAULT 0;
  DECLARE missing_links INT DEFAULT 0;

  SELECT COUNT(*) INTO category_table_exists
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'attachment_categories';

  SELECT COUNT(*) INTO link_table_exists
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'attachment_category_links';

  IF category_table_exists > 0 AND link_table_exists > 0 THEN
    SELECT COUNT(*) INTO missing_categories
    FROM attachment_categories c
    LEFT JOIN tags t
      ON t.domain = 'dms'
      AND t.name COLLATE utf8mb4_unicode_ci = c.name COLLATE utf8mb4_unicode_ci
      AND t.color COLLATE utf8mb4_unicode_ci = c.color COLLATE utf8mb4_unicode_ci
      AND t.is_system = FALSE
    WHERE t.id IS NULL;

    SELECT COUNT(*) INTO missing_links
    FROM attachment_category_links acl
    INNER JOIN attachment_categories c ON c.id = acl.category_id
    LEFT JOIN tags t
      ON t.domain = 'dms'
      AND t.name COLLATE utf8mb4_unicode_ci = c.name COLLATE utf8mb4_unicode_ci
      AND t.color COLLATE utf8mb4_unicode_ci = c.color COLLATE utf8mb4_unicode_ci
      AND t.is_system = FALSE
    LEFT JOIN attachment_tags atag
      ON atag.attachment_id = acl.attachment_id
      AND atag.tag_id = t.id
    WHERE t.id IS NULL OR atag.attachment_id IS NULL;

    IF missing_categories > 0 OR missing_links > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'MS-80 category cleanup aborted: category-to-tag migration is incomplete';
    END IF;
  END IF;

  DROP TABLE IF EXISTS attachment_category_links;
  DROP TABLE IF EXISTS attachment_categories;
END;--> statement-breakpoint
CALL `ms80_cleanup_attachment_categories`();--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms80_cleanup_attachment_categories`;
