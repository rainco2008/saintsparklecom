import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`directory_categories\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`slug\` text NOT NULL,
    \`title\` text NOT NULL,
    \`description\` text,
    \`status\` text DEFAULT 'active' NOT NULL,
    \`sort_order\` integer DEFAULT 0 NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX \`directory_categories_slug_idx\` ON \`directory_categories\` (\`slug\`);`)
  await db.run(
    sql`CREATE INDEX \`directory_categories_status_sort_idx\` ON \`directory_categories\` (\`status\`, \`sort_order\`, \`id\`);`,
  )

  await db.run(sql`CREATE TABLE \`directory_items\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`category_id\` integer,
    \`slug\` text NOT NULL,
    \`title\` text NOT NULL,
    \`summary\` text,
    \`description\` text,
    \`website_url\` text,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`submitter_user_id\` text,
    \`reviewed_by_admin_id\` integer,
    \`published_at\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`category_id\`) REFERENCES \`directory_categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (\`reviewed_by_admin_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(sql`CREATE UNIQUE INDEX \`directory_items_slug_idx\` ON \`directory_items\` (\`slug\`);`)
  await db.run(
    sql`CREATE INDEX \`directory_items_public_latest_idx\` ON \`directory_items\` (\`status\`, \`published_at\`, \`id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`directory_items_public_category_idx\` ON \`directory_items\` (\`category_id\`, \`status\`, \`published_at\`, \`id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`directory_items_review_queue_idx\` ON \`directory_items\` (\`status\`, \`created_at\`, \`id\`);`,
  )

  await db.run(sql`CREATE TABLE \`directory_jobs\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`job_id\` text NOT NULL,
    \`type\` text NOT NULL,
    \`target_id\` text NOT NULL,
    \`status\` text DEFAULT 'pending' NOT NULL,
    \`attempt\` integer DEFAULT 0 NOT NULL,
    \`locked_at\` text,
    \`completed_at\` text,
    \`error\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX \`directory_jobs_job_id_idx\` ON \`directory_jobs\` (\`job_id\`);`)
  await db.run(
    sql`CREATE INDEX \`directory_jobs_status_type_created_idx\` ON \`directory_jobs\` (\`status\`, \`type\`, \`created_at\`, \`id\`);`,
  )

  await db.run(sql`CREATE TABLE \`directory_audit_logs\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`actor_type\` text NOT NULL,
    \`actor_id\` text,
    \`action\` text NOT NULL,
    \`target_type\` text NOT NULL,
    \`target_id\` text NOT NULL,
    \`metadata\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(
    sql`CREATE INDEX \`directory_audit_logs_target_created_idx\` ON \`directory_audit_logs\` (\`target_type\`, \`target_id\`, \`created_at\`, \`id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`directory_audit_logs_created_idx\` ON \`directory_audit_logs\` (\`created_at\`, \`id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`directory_audit_logs\`;`)
  await db.run(sql`DROP TABLE \`directory_jobs\`;`)
  await db.run(sql`DROP TABLE \`directory_items\`;`)
  await db.run(sql`DROP TABLE \`directory_categories\`;`)
}
