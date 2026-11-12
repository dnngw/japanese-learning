ALTER TABLE `texts` ADD `cues` text;--> statement-breakpoint
ALTER TABLE `words` ADD `source` text DEFAULT 'reader' NOT NULL;