import type { DirectoryBindings } from '../types'
import type { DirectoryItemDetail, DirectoryListItem, DirectoryListResult } from './index'

type DirectoryItemRow = {
  id: number
  published_at: string
  slug: string
  summary: string | null
  title: string
}

type DirectoryItemDetailRow = DirectoryItemRow & {
  description: string | null
  website_url: string | null
}

type DirectoryCursor = {
  id: number
  publishedAt: string
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

const clampLimit = (limit = DEFAULT_LIMIT) => Math.min(Math.max(limit, 1), MAX_LIMIT)

const encodeCursor = (item: Pick<DirectoryItemRow, 'id' | 'published_at'>) =>
  btoa(JSON.stringify({ id: item.id, publishedAt: item.published_at } satisfies DirectoryCursor))

const decodeCursor = (cursor?: string): DirectoryCursor | undefined => {
  if (!cursor) {
    return undefined
  }

  try {
    const value = JSON.parse(atob(cursor)) as DirectoryCursor

    if (typeof value.id !== 'number' || typeof value.publishedAt !== 'string') {
      return undefined
    }

    return value
  } catch {
    return undefined
  }
}

const mapListItem = (row: DirectoryItemRow): DirectoryListItem => ({
  id: String(row.id),
  publishedAt: row.published_at,
  slug: row.slug,
  summary: row.summary ?? undefined,
  title: row.title,
})

const mapDetailItem = (row: DirectoryItemDetailRow): DirectoryItemDetail => ({
  ...mapListItem(row),
  description: row.description ?? undefined,
  websiteUrl: row.website_url ?? undefined,
})

export async function listLatestDirectoryItems(
  env: Pick<DirectoryBindings, 'D1'>,
  options: {
    cursor?: string
    limit?: number
  } = {},
): Promise<DirectoryListResult> {
  const limit = clampLimit(options.limit)
  const cursor = decodeCursor(options.cursor)
  const pageSize = limit + 1

  const query = cursor
    ? env.D1.prepare(
        `SELECT id, slug, title, summary, published_at
         FROM directory_items
         WHERE status = 'published'
           AND published_at IS NOT NULL
           AND (published_at < ? OR (published_at = ? AND id < ?))
         ORDER BY published_at DESC, id DESC
         LIMIT ?`,
      ).bind(cursor.publishedAt, cursor.publishedAt, cursor.id, pageSize)
    : env.D1.prepare(
        `SELECT id, slug, title, summary, published_at
         FROM directory_items
         WHERE status = 'published'
           AND published_at IS NOT NULL
         ORDER BY published_at DESC, id DESC
         LIMIT ?`,
      ).bind(pageSize)

  const result = await query.all<DirectoryItemRow>()
  const rows = result.results ?? []
  const items = rows.slice(0, limit).map(mapListItem)
  const nextRow = rows[limit]

  return {
    items,
    nextCursor: nextRow ? encodeCursor(nextRow) : undefined,
  }
}

export async function listDirectoryItemsByCategory(
  env: Pick<DirectoryBindings, 'D1'>,
  categorySlug: string,
  options: {
    cursor?: string
    limit?: number
  } = {},
): Promise<DirectoryListResult> {
  const limit = clampLimit(options.limit)
  const cursor = decodeCursor(options.cursor)
  const pageSize = limit + 1

  const query = cursor
    ? env.D1.prepare(
        `SELECT i.id, i.slug, i.title, i.summary, i.published_at
         FROM directory_items i
         INNER JOIN directory_categories c ON c.id = i.category_id
         WHERE c.slug = ?
           AND c.status = 'active'
           AND i.status = 'published'
           AND i.published_at IS NOT NULL
           AND (i.published_at < ? OR (i.published_at = ? AND i.id < ?))
         ORDER BY i.published_at DESC, i.id DESC
         LIMIT ?`,
      ).bind(categorySlug, cursor.publishedAt, cursor.publishedAt, cursor.id, pageSize)
    : env.D1.prepare(
        `SELECT i.id, i.slug, i.title, i.summary, i.published_at
         FROM directory_items i
         INNER JOIN directory_categories c ON c.id = i.category_id
         WHERE c.slug = ?
           AND c.status = 'active'
           AND i.status = 'published'
           AND i.published_at IS NOT NULL
         ORDER BY i.published_at DESC, i.id DESC
         LIMIT ?`,
      ).bind(categorySlug, pageSize)

  const result = await query.all<DirectoryItemRow>()
  const rows = result.results ?? []
  const items = rows.slice(0, limit).map(mapListItem)
  const nextRow = rows[limit]

  return {
    items,
    nextCursor: nextRow ? encodeCursor(nextRow) : undefined,
  }
}

export async function getDirectoryItemBySlug(
  env: Pick<DirectoryBindings, 'D1'>,
  slug: string,
): Promise<DirectoryItemDetail | null> {
  const row = await env.D1.prepare(
    `SELECT id, slug, title, summary, description, website_url, published_at
     FROM directory_items
     WHERE slug = ?
       AND status = 'published'
     LIMIT 1`,
  )
    .bind(slug)
    .first<DirectoryItemDetailRow>()

  return row ? mapDetailItem(row) : null
}

export async function listDirectorySitemapItems(
  env: Pick<DirectoryBindings, 'D1'>,
  options: {
    afterId?: number
    limit?: number
  } = {},
): Promise<DirectoryListItem[]> {
  const limit = clampLimit(options.limit)

  const result = await env.D1.prepare(
    `SELECT id, slug, title, summary, published_at
     FROM directory_items
     WHERE status = 'published'
       AND published_at IS NOT NULL
       AND id > ?
     ORDER BY id ASC
     LIMIT ?`,
  )
    .bind(options.afterId ?? 0, limit)
    .all<DirectoryItemRow>()

  return (result.results ?? []).map(mapListItem)
}

