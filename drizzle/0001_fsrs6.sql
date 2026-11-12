DROP INDEX `cards_word`;--> statement-breakpoint
CREATE UNIQUE INDEX `cards_word_type` ON `cards` (`word_id`,`type`);--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `elapsed_days`;--> statement-breakpoint
ALTER TABLE `review_logs` DROP COLUMN `elapsed_days`;--> statement-breakpoint
ALTER TABLE `review_logs` DROP COLUMN `last_elapsed_days`;