CREATE TABLE `typing_progress` (
	`article_id` text PRIMARY KEY NOT NULL,
	`pos` integer DEFAULT 0 NOT NULL,
	`error_pos_json` text DEFAULT (json_array()) NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `reading_articles`(`article_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `typing_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mode` text DEFAULT 'article' NOT NULL,
	`article_id` text,
	`duration_sec` integer NOT NULL,
	`char_total` integer NOT NULL,
	`char_correct` integer NOT NULL,
	`backspaces` integer DEFAULT 0 NOT NULL,
	`max_combo` integer DEFAULT 0 NOT NULL,
	`wpm` real NOT NULL,
	`accuracy` real NOT NULL,
	`error_chars_json` text,
	`drill_meta_json` text,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_typing_sessions_started` ON `typing_sessions` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_typing_sessions_article` ON `typing_sessions` (`article_id`);