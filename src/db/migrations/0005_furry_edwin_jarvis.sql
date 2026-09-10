CREATE TABLE `reading_articles` (
	`article_id` text PRIMARY KEY NOT NULL,
	`library_id` integer NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`source_ref_json` text,
	`level` text DEFAULT 'L3' NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`topic_tags_json` text DEFAULT (json_array()) NOT NULL,
	`paragraphs_json` text NOT NULL,
	`audio_voice` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`library_id`) REFERENCES `reading_libraries`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_articles_source` ON `reading_articles` (`source`);--> statement-breakpoint
CREATE INDEX `idx_articles_library` ON `reading_articles` (`library_id`);--> statement-breakpoint
CREATE TABLE `reading_libraries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`library_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`cover_image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reading_libraries_library_id` ON `reading_libraries` (`library_id`);--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` text NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`last_paragraph` integer DEFAULT 0 NOT NULL,
	`read_sec` integer DEFAULT 0 NOT NULL,
	`last_read_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `reading_articles`(`article_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reading_progress_article` ON `reading_progress` (`article_id`);