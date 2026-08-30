ALTER TABLE `papers` ADD COLUMN `duration_sec` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `papers` ADD COLUMN `band_table` TEXT;