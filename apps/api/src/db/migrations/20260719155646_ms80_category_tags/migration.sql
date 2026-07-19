DROP PROCEDURE IF EXISTS `ms80_migrate_attachment_categories_to_tags`;
--> statement-breakpoint
CREATE PROCEDURE `ms80_migrate_attachment_categories_to_tags`()
BEGIN
	DECLARE migration_now varchar(32);
	DECLARE EXIT HANDLER FOR SQLEXCEPTION
	BEGIN
		ROLLBACK;
		RESIGNAL;
	END;

	SET migration_now = CONCAT(
		DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%dT%H:%i:%s.'),
		LPAD(FLOOR(MICROSECOND(UTC_TIMESTAMP(3)) / 1000), 3, '0'),
		'Z'
	);

	START TRANSACTION;

	IF EXISTS (
		SELECT 1
		FROM `attachment_categories` c
		INNER JOIN `attachment_categories` other
			ON other.id <> c.id
			AND CONVERT(other.name USING utf8mb4) COLLATE utf8mb4_unicode_ci =
				CONVERT(c.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
	) THEN
		SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'MS-80 category migration aborted: category names collide under the migration collation';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM `attachment_categories` c
		INNER JOIN `tags` t
			ON t.domain = 'dms'
			AND CONVERT(t.name USING utf8mb4) COLLATE utf8mb4_unicode_ci =
				CONVERT(c.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
		WHERE CONVERT(t.color USING utf8mb4) COLLATE utf8mb4_unicode_ci <>
				CONVERT(c.color USING utf8mb4) COLLATE utf8mb4_unicode_ci
			OR t.is_system = true
	) THEN
		SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'MS-80 category migration aborted: incompatible DMS tag name, color, or system protection';
	END IF;

	INSERT INTO `tags` (
		`name`, `color`, `is_system`, `domain`, `version`,
		`created_by`, `updated_by`, `created_at`, `updated_at`
	)
	SELECT
		c.name,
		c.color,
		false,
		'dms',
		1,
		NULL,
		NULL,
		migration_now,
		migration_now
	FROM `attachment_categories` c
	WHERE NOT EXISTS (
		SELECT 1
		FROM `tags` t
		WHERE t.domain = 'dms'
			AND CONVERT(t.name USING utf8mb4) COLLATE utf8mb4_unicode_ci =
				CONVERT(c.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
	);

	INSERT IGNORE INTO `attachment_tags` (`attachment_id`, `tag_id`)
	SELECT l.attachment_id, t.id
	FROM `attachment_category_links` l
	INNER JOIN `attachment_categories` c ON c.id = l.category_id
	INNER JOIN `tags` t
		ON t.domain = 'dms'
		AND CONVERT(t.name USING utf8mb4) COLLATE utf8mb4_unicode_ci =
			CONVERT(c.name USING utf8mb4) COLLATE utf8mb4_unicode_ci;

	IF EXISTS (
		SELECT 1
		FROM `attachment_category_links` l
		INNER JOIN `attachment_categories` c ON c.id = l.category_id
		WHERE NOT EXISTS (
			SELECT 1
			FROM `tags` t
			INNER JOIN `attachment_tags` at
				ON at.tag_id = t.id
				AND at.attachment_id = l.attachment_id
			WHERE t.domain = 'dms'
				AND CONVERT(t.name USING utf8mb4) COLLATE utf8mb4_unicode_ci =
					CONVERT(c.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
		)
	) THEN
		SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'MS-80 category migration aborted: at least one category relation was not migrated';
	END IF;

	COMMIT;
END;
--> statement-breakpoint
CALL `ms80_migrate_attachment_categories_to_tags`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `ms80_migrate_attachment_categories_to_tags`;
