CREATE TABLE IF NOT EXISTS `directory_categories` (
  `id` integer PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `status` text DEFAULT 'active' NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `directory_categories_slug_idx` ON `directory_categories` (`slug`);
CREATE INDEX IF NOT EXISTS `directory_categories_status_sort_idx` ON `directory_categories` (`status`, `sort_order`, `id`);
CREATE INDEX IF NOT EXISTS `directory_categories_updated_at_idx` ON `directory_categories` (`updated_at`);
CREATE INDEX IF NOT EXISTS `directory_categories_created_at_idx` ON `directory_categories` (`created_at`);

CREATE TABLE IF NOT EXISTS `directory_items` (
  `id` integer PRIMARY KEY NOT NULL,
  `category_id` integer,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `summary` text,
  `description` text,
  `website_url` text,
  `status` text DEFAULT 'draft' NOT NULL,
  `submitter_user_id` text,
  `reviewed_by_admin_id` integer,
  `published_at` text,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `directory_categories`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX IF NOT EXISTS `directory_items_slug_idx` ON `directory_items` (`slug`);
CREATE INDEX IF NOT EXISTS `directory_items_public_latest_idx` ON `directory_items` (`status`, `published_at`, `id`);
CREATE INDEX IF NOT EXISTS `directory_items_public_category_idx` ON `directory_items` (`category_id`, `status`, `published_at`, `id`);
CREATE INDEX IF NOT EXISTS `directory_items_review_queue_idx` ON `directory_items` (`status`, `created_at`, `id`);
CREATE INDEX IF NOT EXISTS `directory_items_category_idx` ON `directory_items` (`category_id`);
CREATE INDEX IF NOT EXISTS `directory_items_reviewed_by_admin_idx` ON `directory_items` (`reviewed_by_admin_id`);
CREATE INDEX IF NOT EXISTS `directory_items_updated_at_idx` ON `directory_items` (`updated_at`);
CREATE INDEX IF NOT EXISTS `directory_items_created_at_idx` ON `directory_items` (`created_at`);

CREATE TABLE IF NOT EXISTS `directory_jobs` (
  `id` integer PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `type` text NOT NULL,
  `target_id` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `attempt` integer DEFAULT 0 NOT NULL,
  `locked_at` text,
  `completed_at` text,
  `error` text,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `directory_jobs_job_id_idx` ON `directory_jobs` (`job_id`);
CREATE INDEX IF NOT EXISTS `directory_jobs_status_type_created_idx` ON `directory_jobs` (`status`, `type`, `created_at`, `id`);
CREATE INDEX IF NOT EXISTS `directory_jobs_updated_at_idx` ON `directory_jobs` (`updated_at`);
CREATE INDEX IF NOT EXISTS `directory_jobs_created_at_idx` ON `directory_jobs` (`created_at`);

CREATE TABLE IF NOT EXISTS `directory_audit_logs` (
  `id` integer PRIMARY KEY NOT NULL,
  `actor_type` text NOT NULL,
  `actor_id` text,
  `action` text NOT NULL,
  `target_type` text NOT NULL,
  `target_id` text NOT NULL,
  `metadata` text,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
CREATE INDEX IF NOT EXISTS `directory_audit_logs_target_created_idx` ON `directory_audit_logs` (`target_type`, `target_id`, `created_at`, `id`);
CREATE INDEX IF NOT EXISTS `directory_audit_logs_created_idx` ON `directory_audit_logs` (`created_at`, `id`);
CREATE INDEX IF NOT EXISTS `directory_audit_logs_updated_at_idx` ON `directory_audit_logs` (`updated_at`);

CREATE TABLE IF NOT EXISTS `payload_kv` (
  `id` integer PRIMARY KEY NOT NULL,
  `key` text NOT NULL,
  `data` text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `payload_kv_key_idx` ON `payload_kv` (`key`);

CREATE TABLE IF NOT EXISTS `directory_settings` (
  `id` integer PRIMARY KEY NOT NULL,
  `enable_public_directory` integer DEFAULT true,
  `cache_fresh_seconds` numeric DEFAULT 300 NOT NULL,
  `cache_stale_seconds` numeric DEFAULT 3600 NOT NULL,
  `updated_at` text,
  `created_at` text
);

ALTER TABLE `payload_locked_documents_rels` ADD `directory_categories_id` integer REFERENCES directory_categories(id);
ALTER TABLE `payload_locked_documents_rels` ADD `directory_items_id` integer REFERENCES directory_items(id);
ALTER TABLE `payload_locked_documents_rels` ADD `directory_jobs_id` integer REFERENCES directory_jobs(id);
ALTER TABLE `payload_locked_documents_rels` ADD `directory_audit_logs_id` integer REFERENCES directory_audit_logs(id);
CREATE INDEX IF NOT EXISTS `payload_locked_documents_rels_directory_categories_id_idx` ON `payload_locked_documents_rels` (`directory_categories_id`);
CREATE INDEX IF NOT EXISTS `payload_locked_documents_rels_directory_items_id_idx` ON `payload_locked_documents_rels` (`directory_items_id`);
CREATE INDEX IF NOT EXISTS `payload_locked_documents_rels_directory_jobs_id_idx` ON `payload_locked_documents_rels` (`directory_jobs_id`);
CREATE INDEX IF NOT EXISTS `payload_locked_documents_rels_directory_audit_logs_id_idx` ON `payload_locked_documents_rels` (`directory_audit_logs_id`);

INSERT INTO `payload_migrations` (`name`, `batch`, `updated_at`, `created_at`)
SELECT '20260614_073700_directory_core', 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM `payload_migrations` WHERE `name` = '20260614_073700_directory_core');

INSERT INTO `payload_migrations` (`name`, `batch`, `updated_at`, `created_at`)
SELECT '20260614_075000_directory_payload_admin', 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM `payload_migrations` WHERE `name` = '20260614_075000_directory_payload_admin');

