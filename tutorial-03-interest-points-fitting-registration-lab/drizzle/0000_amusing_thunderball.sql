CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`group_name` text NOT NULL,
	`difficulty` text NOT NULL,
	`prompt` text NOT NULL,
	`answer` text NOT NULL,
	`answer_published` integer DEFAULT false NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` text NOT NULL,
	`voter_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_question_voter_unique` ON `votes` (`question_id`,`voter_id`);