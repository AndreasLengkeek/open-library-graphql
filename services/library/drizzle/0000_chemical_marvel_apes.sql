CREATE TABLE `reading_status` (
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `book_id`),
	CONSTRAINT "reading_status_enum" CHECK("reading_status"."status" IN ('WANT_TO_READ', 'READING', 'READ'))
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`text` text,
	`rating` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "review_rating" CHECK("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_user_book` ON `reviews` (`user_id`,`book_id`);--> statement-breakpoint
CREATE INDEX `review_book_id` ON `reviews` (`book_id`);--> statement-breakpoint
CREATE TABLE `shelf_book` (
	`shelf_id` text NOT NULL,
	`book_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`shelf_id`, `book_id`),
	FOREIGN KEY (`shelf_id`) REFERENCES `shelves`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shelves` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shelf_user_name` ON `shelves` (`user_id`,`name`);