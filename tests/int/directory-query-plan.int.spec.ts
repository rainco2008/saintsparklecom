import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload

const explain = async (sql: string, ...bindings: unknown[]) => {
  const d1 = (payload.db.drizzle as unknown as { $client: D1Database }).$client
  const result = await d1.prepare(`EXPLAIN QUERY PLAN ${sql}`).bind(...bindings).all<{
    detail: string
  }>()

  return (result.results ?? []).map((row) => row.detail).join('\n')
}

describe('directory D1 query plans', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('uses the latest items index', async () => {
    const plan = await explain(
      `SELECT id, slug, title, summary, published_at
       FROM directory_items
       WHERE status = 'published'
         AND published_at IS NOT NULL
       ORDER BY published_at DESC, id DESC
       LIMIT ?`,
      21,
    )

    expect(plan).toContain('directory_items_public_latest_idx')
  })

  it('uses category and category-item indexes', async () => {
    const plan = await explain(
      `SELECT i.id, i.slug, i.title, i.summary, i.published_at
       FROM directory_items i
       INNER JOIN directory_categories c ON c.id = i.category_id
       WHERE c.slug = ?
         AND c.status = 'active'
         AND i.status = 'published'
         AND i.published_at IS NOT NULL
       ORDER BY i.published_at DESC, i.id DESC
       LIMIT ?`,
      'category',
      21,
    )

    expect(plan).toContain('directory_categories_slug_idx')
    expect(plan).toContain('directory_items_public_category_idx')
  })

  it('uses slug lookup index', async () => {
    const plan = await explain(
      `SELECT id, slug, title, summary, description, website_url, published_at
       FROM directory_items
       WHERE slug = ?
         AND status = 'published'
       LIMIT 1`,
      'item',
    )

    expect(plan).toContain('directory_items_slug_idx')
  })

  it('uses review queue index', async () => {
    const plan = await explain(
      `SELECT id, slug, title, status, created_at
       FROM directory_items
       WHERE status = 'pending'
       ORDER BY created_at ASC, id ASC
       LIMIT ?`,
      20,
    )

    expect(plan).toContain('directory_items_review_queue_idx')
  })
})

