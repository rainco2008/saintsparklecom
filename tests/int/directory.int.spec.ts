import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload

describe('directory plugin', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('creates a published item with audit log and cache rebuild job', async () => {
    const suffix = Date.now()
    const category = await payload.create({
      collection: 'directory-categories',
      data: {
        slug: `category-${suffix}`,
        sortOrder: 0,
        status: 'active',
        title: `Category ${suffix}`,
      },
    })

    const item = await payload.create({
      collection: 'directory-items',
      data: {
        category: category.id,
        publishedAt: new Date().toISOString(),
        slug: `item-${suffix}`,
        status: 'published',
        submitterUserId: null,
        title: `Item ${suffix}`,
      },
    })

    const auditLogs = await payload.find({
      collection: 'directory-audit-logs',
      limit: 1,
      where: {
        and: [
          { targetId: { equals: String(item.id) } },
          { action: { equals: 'item.published.create' } },
        ],
      },
    })

    const jobs = await payload.find({
      collection: 'directory-jobs',
      limit: 1,
      where: {
        and: [
          { targetId: { equals: String(item.id) } },
          { type: { equals: 'cache.rebuild' } },
          { status: { equals: 'pending' } },
        ],
      },
    })

    expect(auditLogs.totalDocs).toBe(1)
    expect(jobs.totalDocs).toBe(1)
  })
})
