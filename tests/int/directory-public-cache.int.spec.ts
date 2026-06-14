import { describe, expect, it } from 'vitest'

import {
  createDirectoryPublicRuntime,
  getDirectoryDetail,
  getDirectoryHomeList,
} from '@/plugins/cloudflare-directory/public'
import type { DirectoryBindings } from '@/plugins/cloudflare-directory/types'

class FakeKV {
  store = new Map<string, string>()

  async get<T>(key: string, type?: 'json'): Promise<T | string | null> {
    const value = this.store.get(key)

    if (!value) {
      return null
    }

    return type === 'json' ? (JSON.parse(value) as T) : value
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }
}

const createD1 = () => {
  let latestCalls = 0
  let detailCalls = 0

  const d1 = {
    calls: () => ({ detailCalls, latestCalls }),
    prepare(query: string) {
      return {
        bind() {
          return this
        },
        async all() {
          latestCalls += 1

          return {
            results: query.includes('FROM directory_items')
              ? [
                  {
                    id: 1,
                    published_at: '2026-06-14T00:00:00.000Z',
                    slug: 'cached-item',
                    summary: 'Cached summary',
                    title: 'Cached item',
                  },
                ]
              : [],
          }
        },
        async first() {
          detailCalls += 1

          return {
            description: 'Detail body',
            id: 1,
            published_at: '2026-06-14T00:00:00.000Z',
            slug: 'cached-item',
            summary: 'Cached summary',
            title: 'Cached item',
            website_url: 'https://example.com',
          }
        },
      }
    },
  }

  return d1
}

describe('directory public cache', () => {
  it('falls back to D1 when KV is not bound', async () => {
    const d1 = createD1()
    const runtime = createDirectoryPublicRuntime({
      D1: d1 as unknown as D1Database,
      R2: {} as R2Bucket,
    })

    const result = await getDirectoryHomeList(runtime)

    expect(result.cacheStatus).toBe('disabled')
    expect(result.data.items).toHaveLength(1)
    expect(d1.calls().latestCalls).toBe(1)
  })

  it('writes on miss and serves fresh hits from KV', async () => {
    const d1 = createD1()
    const kv = new FakeKV()
    const runtime = createDirectoryPublicRuntime({
      D1: d1 as unknown as D1Database,
      DIRECTORY_CACHE_KV: kv as unknown as KVNamespace,
      R2: {} as R2Bucket,
    } satisfies DirectoryBindings)

    const first = await getDirectoryDetail(runtime, 'cached-item')
    const second = await getDirectoryDetail(runtime, 'cached-item')

    expect(first.cacheStatus).toBe('miss')
    expect(second.cacheStatus).toBe('fresh')
    expect(second.data?.slug).toBe('cached-item')
    expect(d1.calls().detailCalls).toBe(1)
  })
})

