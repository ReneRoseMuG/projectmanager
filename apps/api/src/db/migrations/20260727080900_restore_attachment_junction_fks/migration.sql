DROP PROCEDURE IF EXISTS `restore_attachment_junction_fks`;
--> statement-breakpoint
CREATE PROCEDURE `restore_attachment_junction_fks`()
BEGIN
	-- The production schema can originate from a partially applied consolidated
	-- migration. Clean both sides of each junction before restoring its foreign
	-- keys. Every constraint check makes this migration safe to resume.
	DELETE junction
	FROM `project_attachments` AS junction
	LEFT JOIN `projects` AS owner ON owner.id = junction.project_id
	LEFT JOIN `attachments` AS attachment ON attachment.id = junction.attachment_id
	WHERE owner.id IS NULL OR attachment.id IS NULL;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'project_attachments'
			AND CONSTRAINT_NAME = 'project_attachments_project_id_projects_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `project_attachments`
			ADD CONSTRAINT `project_attachments_project_id_projects_id_fkey`
			FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'project_attachments'
			AND CONSTRAINT_NAME = 'project_attachments_attachment_id_attachments_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `project_attachments`
			ADD CONSTRAINT `project_attachments_attachment_id_attachments_id_fkey`
			FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;

	DELETE junction
	FROM `milestone_attachments` AS junction
	LEFT JOIN `milestones` AS owner ON owner.id = junction.milestone_id
	LEFT JOIN `attachments` AS attachment ON attachment.id = junction.attachment_id
	WHERE owner.id IS NULL OR attachment.id IS NULL;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'milestone_attachments'
			AND CONSTRAINT_NAME = 'milestone_attachments_milestone_id_milestones_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `milestone_attachments`
			ADD CONSTRAINT `milestone_attachments_milestone_id_milestones_id_fkey`
			FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'milestone_attachments'
			AND CONSTRAINT_NAME = 'milestone_attachments_attachment_id_attachments_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `milestone_attachments`
			ADD CONSTRAINT `milestone_attachments_attachment_id_attachments_id_fkey`
			FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;

	DELETE junction
	FROM `task_attachments` AS junction
	LEFT JOIN `tasks` AS owner ON owner.id = junction.task_id
	LEFT JOIN `attachments` AS attachment ON attachment.id = junction.attachment_id
	WHERE owner.id IS NULL OR attachment.id IS NULL;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'task_attachments'
			AND CONSTRAINT_NAME = 'task_attachments_task_id_tasks_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `task_attachments`
			ADD CONSTRAINT `task_attachments_task_id_tasks_id_fkey`
			FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'task_attachments'
			AND CONSTRAINT_NAME = 'task_attachments_attachment_id_attachments_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `task_attachments`
			ADD CONSTRAINT `task_attachments_attachment_id_attachments_id_fkey`
			FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;

	DELETE junction
	FROM `feature_attachments` AS junction
	LEFT JOIN `features` AS owner ON owner.id = junction.feature_id
	LEFT JOIN `attachments` AS attachment ON attachment.id = junction.attachment_id
	WHERE owner.id IS NULL OR attachment.id IS NULL;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'feature_attachments'
			AND CONSTRAINT_NAME = 'feature_attachments_feature_id_features_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `feature_attachments`
			ADD CONSTRAINT `feature_attachments_feature_id_features_id_fkey`
			FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'feature_attachments'
			AND CONSTRAINT_NAME = 'feature_attachments_attachment_id_attachments_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `feature_attachments`
			ADD CONSTRAINT `feature_attachments_attachment_id_attachments_id_fkey`
			FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;

	DELETE junction
	FROM `ticket_attachments` AS junction
	LEFT JOIN `tickets` AS owner ON owner.id = junction.ticket_id
	LEFT JOIN `attachments` AS attachment ON attachment.id = junction.attachment_id
	WHERE owner.id IS NULL OR attachment.id IS NULL;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'ticket_attachments'
			AND CONSTRAINT_NAME = 'ticket_attachments_ticket_id_tickets_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `ticket_attachments`
			ADD CONSTRAINT `ticket_attachments_ticket_id_tickets_id_fkey`
			FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'ticket_attachments'
			AND CONSTRAINT_NAME = 'ticket_attachments_attachment_id_attachments_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `ticket_attachments`
			ADD CONSTRAINT `ticket_attachments_attachment_id_attachments_id_fkey`
			FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;

	DELETE junction
	FROM `wiki_page_attachments` AS junction
	LEFT JOIN `wiki_pages` AS owner ON owner.id = junction.wiki_page_id
	LEFT JOIN `attachments` AS attachment ON attachment.id = junction.attachment_id
	WHERE owner.id IS NULL OR attachment.id IS NULL;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'wiki_page_attachments'
			AND CONSTRAINT_NAME = 'wiki_page_attachments_wiki_page_id_wiki_pages_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `wiki_page_attachments`
			ADD CONSTRAINT `wiki_page_attachments_wiki_page_id_wiki_pages_id_fkey`
			FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
		WHERE CONSTRAINT_SCHEMA = DATABASE()
			AND TABLE_NAME = 'wiki_page_attachments'
			AND CONSTRAINT_NAME = 'wiki_page_attachments_attachment_id_attachments_id_fkey'
			AND CONSTRAINT_TYPE = 'FOREIGN KEY'
	) THEN
		ALTER TABLE `wiki_page_attachments`
			ADD CONSTRAINT `wiki_page_attachments_attachment_id_attachments_id_fkey`
			FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON DELETE CASCADE;
	END IF;
END;
--> statement-breakpoint
CALL `restore_attachment_junction_fks`();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS `restore_attachment_junction_fks`;
