CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word_id` integer,
	`kana_key` text,
	`type` text NOT NULL,
	`due` integer NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`elapsed_days` integer DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`learning_steps` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`last_review` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cards_due` ON `cards` (`due`);--> statement-breakpoint
CREATE INDEX `cards_word` ON `cards` (`word_id`);--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`state` integer NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`last_elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`learning_steps` integer DEFAULT 0 NOT NULL,
	`reviewed_at` integer NOT NULL,
	`duration_ms` integer,
	`source` text DEFAULT 'review' NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_logs_card` ON `review_logs` (`card_id`);--> statement-breakpoint
CREATE INDEX `review_logs_time` ON `review_logs` (`reviewed_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `texts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'paste' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_opened_at` integer
);
--> statement-breakpoint
CREATE TABLE `word_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word_id` integer NOT NULL,
	`text_id` integer,
	`surface` text NOT NULL,
	`sentence` text NOT NULL,
	`start_ms` integer,
	`end_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`text_id`) REFERENCES `texts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `word_contexts_word` ON `word_contexts` (`word_id`);--> statement-breakpoint
CREATE TABLE `words` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jmdict_id` integer,
	`lemma` text NOT NULL,
	`reading` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'learning' NOT NULL,
	`custom_meaning` text,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `words_lemma_reading` ON `words` (`lemma`,`reading`);--> statement-breakpoint
CREATE INDEX `words_jmdict` ON `words` (`jmdict_id`);