import type { DirectoryBindings, DirectoryCacheEntry } from '../types'

export type DirectoryPublicRuntime = {
  cacheVersion: string
  env: DirectoryBindings
}

export type DirectoryListItem = {
  id: string
  publishedAt: string
  slug: string
  summary?: string
  title: string
}

export type DirectoryItemDetail = DirectoryListItem & {
  description?: string
  websiteUrl?: string
}

export type DirectoryListResult = {
  items: DirectoryListItem[]
  nextCursor?: string
}

export const createDirectoryPublicRuntime = (env: DirectoryBindings): DirectoryPublicRuntime => ({
  cacheVersion: 'directory:v1',
  env,
})

export const createDirectoryCacheEntry = <T>(
  data: T,
  options: {
    freshMs: number
    now?: number
    staleMs: number
    version: string
  },
): DirectoryCacheEntry<T> => {
  const now = options.now ?? Date.now()

  return {
    createdAt: now,
    data,
    freshUntil: now + options.freshMs,
    staleUntil: now + options.staleMs,
    version: options.version,
  }
}

export {
  getDirectoryItemBySlug,
  listDirectoryItemsByCategory,
  listDirectorySitemapItems,
  listLatestDirectoryItems,
} from './queries'
