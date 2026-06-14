# Cloudflare Directory D1 Schema Notes

## Public Query Shapes

### Latest items

```sql
SELECT id, slug, title, summary, published_at
FROM directory_items
WHERE status = 'published'
  AND published_at IS NOT NULL
  AND (published_at < ? OR (published_at = ? AND id < ?))
ORDER BY published_at DESC, id DESC
LIMIT ?
```

Index: `directory_items_public_latest_idx(status, published_at, id)`.

Risk: keyset pagination only. No public `OFFSET`. Limit is clamped to 50.

### Category items

```sql
SELECT i.id, i.slug, i.title, i.summary, i.published_at
FROM directory_items i
INNER JOIN directory_categories c ON c.id = i.category_id
WHERE c.slug = ?
  AND c.status = 'active'
  AND i.status = 'published'
  AND i.published_at IS NOT NULL
ORDER BY i.published_at DESC, i.id DESC
LIMIT ?
```

Indexes: `directory_categories_slug_idx(slug)` and `directory_items_public_category_idx(category_id, status, published_at, id)`.

Risk: category slug resolves through a unique index, then item scan is bounded by category and status. Limit is clamped to 50.

### Slug detail

```sql
SELECT id, slug, title, summary, description, website_url, published_at
FROM directory_items
WHERE slug = ?
  AND status = 'published'
LIMIT 1
```

Index: `directory_items_slug_idx(slug)`.

Risk: one-row lookup. Status is checked after unique slug lookup.

### Sitemap shard

```sql
SELECT id, slug, title, summary, published_at
FROM directory_items
WHERE status = 'published'
  AND published_at IS NOT NULL
  AND id > ?
ORDER BY id ASC
LIMIT ?
```

Index: primary key for `id > ?`; `status` filters the bounded shard.

Risk: intended for async sitemap jobs and small shards. Limit is clamped to 50 in the helper until the sitemap job owns larger batch sizing.

## Migration Policy

DDL is only introduced through migration files. Request handlers must not create or alter tables at runtime.

Rollback for `20260614_073700_directory_core` drops the four directory tables in dependency order.

