CREATE TABLE `answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`value` text NOT NULL,
	`alternatives_json` text,
	`explanation_html` text,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_answers_question` ON `answers` (`question_id`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`submitted_at` integer,
	`completed_at` integer,
	`used_sec` integer,
	`raw_score` integer,
	`band_score` real,
	`correct_count` integer,
	`wrong_count` integer,
	`blank_count` integer,
	`highlights_json` text,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_paper_started` ON `attempts` (`paper_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_attempts_status` ON `attempts` (`status`);--> statement-breakpoint
CREATE TABLE `choices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer,
	`group_id` integer,
	`label` text NOT NULL,
	`text_html` text,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `question_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "choices_owner_xor" CHECK((("choices"."question_id" IS NOT NULL AND "choices"."group_id" IS NULL) OR ("choices"."question_id" IS NULL AND "choices"."group_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE INDEX `idx_choices_question` ON `choices` (`question_id`);--> statement-breakpoint
CREATE INDEX `idx_choices_group` ON `choices` (`group_id`);--> statement-breakpoint
CREATE TABLE `grading_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`writing_task_id` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`result_json` text,
	`raw_json` text,
	`model` text,
	`error` text,
	`latency_ms` integer,
	`tokens` integer,
	`retry_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`writing_task_id`) REFERENCES `writing_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_grading_attempt_task` ON `grading_results` (`attempt_id`,`writing_task_id`);--> statement-breakpoint
CREATE TABLE `papers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`skill` text NOT NULL,
	`source` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`meta_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_papers_slug` ON `papers` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_papers_status_skill` ON `papers` (`status`,`skill`);--> statement-breakpoint
CREATE TABLE `passages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`title` text,
	`subtitle` text,
	`body_html` text,
	`image_url` text,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_passages_section_order` ON `passages` (`section_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `question_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`instruction_html` text,
	`layout_hint` text,
	`score_mode` text DEFAULT 'PER_QUESTION' NOT NULL,
	`min_select` integer,
	`max_select` integer,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_groups_section_order` ON `question_groups` (`section_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`section_id` integer NOT NULL,
	`group_id` integer,
	`number` integer NOT NULL,
	`type` text NOT NULL,
	`stem_html` text,
	`instruction_html` text,
	`word_limit_json` text,
	`passage_order` integer,
	`task_id` text,
	`meta_json` text,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `question_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_questions_paper_number` ON `questions` (`paper_id`,`number`);--> statement-breakpoint
CREATE INDEX `idx_questions_section` ON `questions` (`section_id`);--> statement-breakpoint
CREATE INDEX `idx_questions_group` ON `questions` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_questions_type` ON `questions` (`type`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`question_id` integer,
	`writing_task_id` integer,
	`value_json` text NOT NULL,
	`is_marked` integer DEFAULT false NOT NULL,
	`is_correct` integer,
	`points` real,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`writing_task_id`) REFERENCES `writing_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "responses_target_xor" CHECK((("responses"."question_id" IS NOT NULL AND "responses"."writing_task_id" IS NULL) OR ("responses"."question_id" IS NULL AND "responses"."writing_task_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_responses_attempt_question` ON `responses` (`attempt_id`,`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_responses_attempt_task` ON `responses` (`attempt_id`,`writing_task_id`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`section_no` integer NOT NULL,
	`section_type` text NOT NULL,
	`title` text,
	`time_limit_sec` integer DEFAULT 3600 NOT NULL,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sections_paper_no` ON `sections` (`paper_id`,`section_no`);--> statement-breakpoint
CREATE TABLE `writing_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`task_id` text NOT NULL,
	`prompt_html` text NOT NULL,
	`material_html` text,
	`word_min` integer NOT NULL,
	`suggested_time_sec` integer NOT NULL,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_writing_tasks_paper_task` ON `writing_tasks` (`paper_id`,`task_id`);