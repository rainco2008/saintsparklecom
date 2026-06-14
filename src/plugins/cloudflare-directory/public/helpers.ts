import type { DirectoryBindings, DirectoryJobMessage } from '../types'
import type { DirectoryItemDetail, DirectoryListResult, DirectoryPublicRuntime } from './index'
import { readThroughDirectoryCache } from './cache'
import {
  getDirectoryItemBySlug,
  listDirectoryItemsByCategory,
  listDirectorySitemapItems,
  listLatestDirectoryItems,
} from './queries'

type PublicHelperOptions = {
  ctx?: Pick<ExecutionContext, 'waitUntil'>
  freshMs?: number
  staleMs?: number
}

type ListOptions = PublicHelperOptions & {
  cursor?: string
  limit?: number
}

type SitemapOptions = PublicHelperOptions & {
  afterId?: number
  limit?: number
}

export type DirectorySEOMetadata = {
  description?: string
  title: string
}

const DEFAULT_FRESH_MS = 5 * 60 * 1000
const DEFAULT_STALE_MS = 60 * 60 * 1000

const cacheOptions = (options: PublicHelperOptions) => ({
  freshMs: options.freshMs ?? DEFAULT_FRESH_MS,
  staleMs: options.staleMs ?? DEFAULT_STALE_MS,
})

const cacheRebuildJob = (targetId: string): DirectoryJobMessage => ({
  attempt: 0,
  jobId: `cache-rebuild:${targetId}:${Date.now()}`,
  targetId,
  type: 'cache.rebuild',
})

const cacheKey = (runtime: DirectoryPublicRuntime, parts: Array<number | string | undefined>) =>
  [runtime.cacheVersion, ...parts.map((part) => part ?? '')].join(':')

export async function getDirectoryHomeList(runtime: DirectoryPublicRuntime, options: ListOptions = {}) {
  const key = cacheKey(runtime, ['home', options.limit ?? '', options.cursor])

  return readThroughDirectoryCache<DirectoryListResult>({
    ...cacheOptions(options),
    cacheKey: key,
    ctx: options.ctx,
    env: runtime.env,
    load: () => listLatestDirectoryItems(runtime.env, options),
    refreshJob: cacheRebuildJob(key),
    version: runtime.cacheVersion,
  })
}

export async function getDirectoryCategoryList(
  runtime: DirectoryPublicRuntime,
  categorySlug: string,
  options: ListOptions = {},
) {
  const key = cacheKey(runtime, ['category', categorySlug, options.limit ?? '', options.cursor])

  return readThroughDirectoryCache<DirectoryListResult>({
    ...cacheOptions(options),
    cacheKey: key,
    ctx: options.ctx,
    env: runtime.env,
    load: () => listDirectoryItemsByCategory(runtime.env, categorySlug, options),
    refreshJob: cacheRebuildJob(key),
    version: runtime.cacheVersion,
  })
}

export async function getDirectoryDetail(
  runtime: DirectoryPublicRuntime,
  slug: string,
  options: PublicHelperOptions = {},
) {
  const key = cacheKey(runtime, ['detail', slug])

  return readThroughDirectoryCache<DirectoryItemDetail | null>({
    ...cacheOptions(options),
    cacheKey: key,
    ctx: options.ctx,
    env: runtime.env,
    load: () => getDirectoryItemBySlug(runtime.env, slug),
    refreshJob: cacheRebuildJob(key),
    version: runtime.cacheVersion,
  })
}

export async function getDirectorySEOMetadata(
  runtime: DirectoryPublicRuntime,
  slug: string,
  options: PublicHelperOptions = {},
) {
  const result = await getDirectoryDetail(runtime, slug, options)
  const data = result.data

  return {
    cacheStatus: result.cacheStatus,
    data: data
      ? ({
          description: data.summary ?? data.description,
          title: data.title,
        } satisfies DirectorySEOMetadata)
      : null,
  }
}

export async function getDirectorySitemapItems(
  runtime: DirectoryPublicRuntime,
  options: SitemapOptions = {},
) {
  const key = cacheKey(runtime, ['sitemap', options.afterId ?? 0, options.limit ?? ''])

  return readThroughDirectoryCache({
    ...cacheOptions(options),
    cacheKey: key,
    ctx: options.ctx,
    env: runtime.env,
    load: () => listDirectorySitemapItems(runtime.env, options),
    refreshJob: cacheRebuildJob(key),
    version: runtime.cacheVersion,
  })
}

export type DirectoryPublicEnv = Pick<
  DirectoryBindings,
  'D1' | 'DIRECTORY_CACHE_KV' | 'DIRECTORY_CACHE_QUEUE'
>

