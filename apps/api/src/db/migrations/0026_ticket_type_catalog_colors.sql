ALTER TABLE `catalog_entries` ADD `color` text DEFAULT 'var(--color-steel-700)' NOT NULL;--> statement-breakpoint
UPDATE `catalog_entries`
SET `color` = CASE
  WHEN `kind` = 'workStatus' AND `key` IN ('active', 'todo', 'open') THEN 'var(--color-fern)'
  WHEN `kind` = 'workStatus' AND `key` = 'in_progress' THEN 'var(--color-tangerine)'
  WHEN `kind` = 'workStatus' AND `key` = 'in_review' THEN 'var(--color-mustard)'
  WHEN `kind` = 'workStatus' AND `key` IN ('on_hold', 'completed', 'archived', 'done', 'resolved', 'closed', 'rejected') THEN 'var(--color-steel-500)'
  WHEN `kind` = 'featureStatus' AND `key` = 'draft' THEN 'var(--color-violet)'
  WHEN `kind` = 'featureStatus' AND `key` = 'active' THEN 'var(--color-tangerine)'
  WHEN `kind` = 'featureStatus' AND `key` IN ('done', 'archived') THEN 'var(--color-steel-500)'
  WHEN `kind` = 'priority' AND `key` = 'low' THEN 'var(--color-steel-400)'
  WHEN `kind` = 'priority' AND `key` = 'medium' THEN 'var(--color-mustard)'
  WHEN `kind` = 'priority' AND `key` = 'high' THEN 'var(--color-tangerine)'
  WHEN `kind` = 'priority' AND `key` = 'urgent' THEN 'var(--color-crimson)'
  ELSE `color`
END;--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_entries` (`kind`, `key`, `label`, `sort_order`, `is_closed`, `color`, `version`, `created_at`, `updated_at`) VALUES
  ('ticketType', 'bug', 'Bug', 100, 0, 'var(--color-crimson)', 1, datetime('now'), datetime('now')),
  ('ticketType', 'improvement', 'Verbesserung', 200, 0, 'var(--color-teal)', 1, datetime('now'), datetime('now')),
  ('ticketType', 'question', 'Frage', 300, 0, 'var(--color-violet)', 1, datetime('now'), datetime('now')),
  ('ticketType', 'task', 'Aufgabe', 400, 0, 'var(--color-steel-500)', 1, datetime('now'), datetime('now'));
