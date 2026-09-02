CREATE TABLE `book_word_relation` (
	`book_id` integer NOT NULL,
	`word_id` integer NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `word_books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_bwr_book_word` ON `book_word_relation` (`book_id`,`word_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_bwr_book_order` ON `book_word_relation` (`book_id`,`order`);--> statement-breakpoint
CREATE INDEX `idx_bwr_word` ON `book_word_relation` (`word_id`);--> statement-breakpoint
CREATE TABLE `word_books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_word_books_book_id` ON `word_books` (`book_id`);--> statement-breakpoint
CREATE TABLE `words` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`phonetic_uk` text,
	`phonetic_us` text,
	`content_json` text NOT NULL,
	`origin` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_words_word` ON `words` (`word`);--> statement-breakpoint
CREATE INDEX `idx_words_origin` ON `words` (`origin`);