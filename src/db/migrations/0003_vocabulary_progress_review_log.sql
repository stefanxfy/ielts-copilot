CREATE TABLE `word_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word_id` integer NOT NULL,
	`stage` text DEFAULT 'recognize' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`due` integer NOT NULL,
	`fsrs_state_json` text NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`last_review_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_word_progress_word` ON `word_progress` (`word_id`);--> statement-breakpoint
CREATE INDEX `idx_word_progress_status_due` ON `word_progress` (`status`,`due`);--> statement-breakpoint
CREATE TABLE `word_review_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`progress_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`stage` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`progress_id`) REFERENCES `word_progress`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_word_review_log_progress` ON `word_review_log` (`progress_id`);--> statement-breakpoint
CREATE INDEX `idx_word_review_log_reviewed` ON `word_review_log` (`reviewed_at`);