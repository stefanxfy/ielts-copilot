CREATE TABLE `study_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_date` text NOT NULL,
	`exam_set_completion_count` integer DEFAULT 0 NOT NULL,
	`listening_submission_count` integer DEFAULT 0 NOT NULL,
	`reading_submission_count` integer DEFAULT 0 NOT NULL,
	`writing_submission_count` integer DEFAULT 0 NOT NULL,
	`speaking_submission_count` integer DEFAULT 0 NOT NULL,
	`memorized_word_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_activities_date` ON `study_activities` (`activity_date`);--> statement-breakpoint
CREATE TABLE `study_journals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_date` text NOT NULL,
	`period` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`ai_summary_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_journals_date_period` ON `study_journals` (`journal_date`,`period`);--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_date` text NOT NULL,
	`target_overall_band` real NOT NULL,
	`target_scores_json` text NOT NULL,
	`availability_json` text NOT NULL,
	`phases_json` text NOT NULL,
	`generated_by` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`plan_start_week_monday` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_plans_status` ON `study_plans` (`status`);