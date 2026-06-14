import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`payload_kv\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text NOT NULL,
    \`data\` text NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)

  await db.run(sql`CREATE TABLE \`directory_settings\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`enable_public_directory\` integer DEFAULT true,
    \`cache_fresh_seconds\` numeric DEFAULT 300 NOT NULL,
    \`cache_stale_seconds\` numeric DEFAULT 3600 NOT NULL,
    \`updated_at\` text,
    \`created_at\` text
  );`)

  await db.run(
    sql`CREATE INDEX \`directory_audit_logs_updated_at_idx\` ON \`directory_audit_logs\` (\`updated_at\`);`,
  )

  await db.run(sql`CREATE INDEX \`directory_categories_updated_at_idx\` ON \`directory_categories\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`directory_categories_created_at_idx\` ON \`directory_categories\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`directory_items_category_idx\` ON \`directory_items\` (\`category_id\`);`)
  await db.run(sql`CREATE INDEX \`directory_items_reviewed_by_admin_idx\` ON \`directory_items\` (\`reviewed_by_admin_id\`);`)
  await db.run(sql`CREATE INDEX \`directory_items_updated_at_idx\` ON \`directory_items\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`directory_items_created_at_idx\` ON \`directory_items\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`directory_jobs_updated_at_idx\` ON \`directory_jobs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`directory_jobs_created_at_idx\` ON \`directory_jobs\` (\`created_at\`);`)

  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`directory_categories_id\` integer REFERENCES directory_categories(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`directory_items_id\` integer REFERENCES directory_items(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`directory_jobs_id\` integer REFERENCES directory_jobs(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`directory_audit_logs_id\` integer REFERENCES directory_audit_logs(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_directory_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`directory_categories_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_directory_items_id_idx\` ON \`payload_locked_documents_rels\` (\`directory_items_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_directory_jobs_id_idx\` ON \`payload_locked_documents_rels\` (\`directory_jobs_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_directory_audit_logs_id_idx\` ON \`payload_locked_documents_rels\` (\`directory_audit_logs_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`directory_settings\`;`)
  await db.run(sql`DROP INDEX \`directory_audit_logs_updated_at_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_categories_updated_at_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_categories_created_at_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_items_category_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_items_reviewed_by_admin_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_items_updated_at_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_items_created_at_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_jobs_updated_at_idx\`;`)
  await db.run(sql`DROP INDEX \`directory_jobs_created_at_idx\`;`)
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_directory_categories_id_idx\`;`)
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_directory_items_id_idx\`;`)
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_directory_jobs_id_idx\`;`)
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_directory_audit_logs_id_idx\`;`)
}
