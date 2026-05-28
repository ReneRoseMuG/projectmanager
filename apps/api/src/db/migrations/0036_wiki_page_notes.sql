CREATE TABLE `wiki_page_notes` (
  `wiki_page_id` integer NOT NULL,
  `note_id` integer NOT NULL,
  FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_page_notes_owner_note_unique` ON `wiki_page_notes` (`wiki_page_id`,`note_id`);
