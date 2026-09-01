CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` text NOT NULL,
	`subject` text NOT NULL,
	`session_id` text,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`submitted_at` integer,
	`used_sec` integer,
	`correct_count` integer,
	`band_score` real,
	`answer_sheet_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `papers`(`exam_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`session_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_records_exam_started` ON `exam_records` (`exam_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_records_session` ON `exam_records` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_records_status` ON `exam_records` (`status`);--> statement-breakpoint
CREATE TABLE `exam_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`exam_set_id` text NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`finished_at` integer,
	`total_used_sec` integer,
	`overall_band` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`exam_set_id`) REFERENCES `exam_sets`(`exam_set_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_set_started` ON `exam_sessions` (`exam_set_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `exam_sets` (
	`exam_set_id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`test_period` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `papers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` text NOT NULL,
	`exam_set_id` text NOT NULL,
	`subject` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`test_period` text NOT NULL,
	`duration_sec` integer NOT NULL,
	`band_table_json` text NOT NULL,
	`assets_json` text NOT NULL,
	`questions_json` text NOT NULL,
	`answers_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`exam_set_id`) REFERENCES `exam_sets`(`exam_set_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_papers_exam_id` ON `papers` (`exam_id`);--> statement-breakpoint
CREATE INDEX `idx_papers_set` ON `papers` (`exam_set_id`);