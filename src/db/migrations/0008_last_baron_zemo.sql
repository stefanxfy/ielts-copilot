CREATE TABLE `writing_prompts` (
	`prompt_id` text PRIMARY KEY NOT NULL,
	`task_no` integer NOT NULL,
	`category` text NOT NULL,
	`prompt_text` text NOT NULL,
	`min_words` integer NOT NULL,
	`time_suggest` integer NOT NULL,
	`image_url` text,
	`source_ref_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `writing_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt_id` text NOT NULL,
	`word_count` integer NOT NULL,
	`duration_sec` integer NOT NULL,
	`reached_min` integer NOT NULL,
	`content` text NOT NULL,
	`finished_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `writing_prompts`(`prompt_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_writing_sessions_finished` ON `writing_sessions` (`finished_at`);--> statement-breakpoint
CREATE INDEX `idx_writing_sessions_prompt` ON `writing_sessions` (`prompt_id`);