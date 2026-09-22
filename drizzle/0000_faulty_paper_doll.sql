CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`a_token` text NOT NULL,
	`b_token` text,
	`a_name` text NOT NULL,
	`b_name` text,
	`invite` text,
	`holder` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`listened` integer DEFAULT 1 NOT NULL,
	`audio_key` text,
	`audio_type` text,
	`duration` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_spaces_a_token` ON `spaces` (`a_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_spaces_b_token` ON `spaces` (`b_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_spaces_invite` ON `spaces` (`invite`);