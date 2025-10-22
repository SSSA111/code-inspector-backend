CREATE TABLE `analysis_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`overall_score` real,
	`total_issues` integer DEFAULT 0 NOT NULL,
	`critical_issues` integer DEFAULT 0 NOT NULL,
	`high_issues` integer DEFAULT 0 NOT NULL,
	`medium_issues` integer DEFAULT 0 NOT NULL,
	`low_issues` integer DEFAULT 0 NOT NULL,
	`supported_files` text,
	`processing_time_ms` integer,
	`ai_model_used` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`name` text NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`analysis_session_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`analysis_session_id`) REFERENCES `analysis_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`source_url` text NOT NULL,
	`language_stats` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_analyzed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `security_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`analysis_session_id` text NOT NULL,
	`severity` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`file_path` text NOT NULL,
	`line_number` integer,
	`code_snippet` text,
	`description` text NOT NULL,
	`recommendation` text NOT NULL,
	`confidence_score` real,
	`false_positive` integer DEFAULT false NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`analysis_session_id`) REFERENCES `analysis_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vulnerabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`cwe_id` text,
	`owasp` text,
	`languages` text NOT NULL,
	`code_example` text NOT NULL,
	`fix_example` text,
	`explanation` text NOT NULL,
	`references` text,
	`tags` text,
	`vector_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
