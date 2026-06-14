import type { DirectoryCacheEntry, DirectoryJobMessage } from '../types'
import { createDirectoryCacheEntry } from './index'

export type DirectoryCacheStatus = 'disabled' | 'fresh' | 'miss' | 'stale'

export type DirectoryCachedResult<T> = {
  cacheStatus: DirectoryCacheStatus
  data: T
}

type CacheRefreshOptions<T> = {
  cacheKey: string
  ctx?: Pick<ExecutionContext, 'waitUntil'>
  env: {
    DIRECTORY_CACHE_KV?: KVNamespace
    DIRECTORY_CACHE_QUEUE?: Queue<DirectoryJobMessage>
  }
  freshMs: number
  load: () => Promise<T>
  refreshJob?: DirectoryJobMessage
  staleMs: number
  version: string
}

const readCacheEntry = async <T>(
  kv: KVNamespace,
  cacheKey: string,
): Promise<DirectoryCacheEntry<T> | null> => {
  const entry = await kv.get<DirectoryCacheEntry<T>>(cacheKey, 'json')

  if (
    !entry ||
    typeof entry.createdAt !== 'number' ||
    typeof entry.freshUntil !== 'number' ||
    typeof entry.staleUntil !== 'number' ||
    typeof entry.version !== 'string' ||
    !('data' in entry)
  ) {
    return null
  }

  return entry
}

const writeCacheEntry = async <T>(
  kv: KVNamespace,
  cacheKey: string,
  data: T,
  options: {
    freshMs: number
    staleMs: number
    version: string
  },
) => {
  const entry = createDirectoryCacheEntry(data, options)
  const ttlSeconds = Math.max(60, Math.ceil(options.staleMs / 1000))

  await kv.put(cacheKey, JSON.stringify(entry), {
    expirationTtl: ttlSeconds,
  })
}

const enqueueRefresh = async <T>(options: CacheRefreshOptions<T>) => {
  const refresh = options.refreshJob
    ? options.env.DIRECTORY_CACHE_QUEUE?.send(options.refreshJob)
    : options
        .load()
        .then((data) =>
          options.env.DIRECTORY_CACHE_KV
            ? writeCacheEntry(options.env.DIRECTORY_CACHE_KV, options.cacheKey, data, options)
            : undefined,
        )

  if (!refresh) {
    return
  }

  if (options.ctx) {
    options.ctx.waitUntil(refresh)
    return
  }

  await refresh
}

export async function readThroughDirectoryCache<T>(
  options: CacheRefreshOptions<T>,
): Promise<DirectoryCachedResult<T>> {
  const kv = options.env.DIRECTORY_CACHE_KV

  if (!kv) {
    return {
      cacheStatus: 'disabled',
      data: await options.load(),
    }
  }

  const entry = await readCacheEntry<T>(kv, options.cacheKey)
  const now = Date.now()

  if (entry?.version === options.version && entry.freshUntil > now) {
    return {
      cacheStatus: 'fresh',
      data: entry.data,
    }
  }

  if (entry?.version === options.version && entry.staleUntil > now) {
    await enqueueRefresh(options)

    return {
      cacheStatus: 'stale',
      data: entry.data,
    }
  }

  const data = await options.load()
  await writeCacheEntry(kv, options.cacheKey, data, options)

  return {
    cacheStatus: 'miss',
    data,
  }
}

