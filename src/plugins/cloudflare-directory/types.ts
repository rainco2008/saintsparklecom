export type DirectoryBindings = {
  ASSETS?: Fetcher
  D1: D1Database
  DIRECTORY_AI_QUEUE?: Queue<DirectoryJobMessage>
  DIRECTORY_CACHE_KV?: KVNamespace
  DIRECTORY_CACHE_QUEUE?: Queue<DirectoryJobMessage>
  DIRECTORY_EMBEDDING_QUEUE?: Queue<DirectoryJobMessage>
  DIRECTORY_SITEMAP_QUEUE?: Queue<DirectoryJobMessage>
  DIRECTORY_VECTORIZE?: VectorizeIndex
  PAYLOAD_SECRET?: string
  R2: R2Bucket
}

export type DirectoryJobType =
  | 'ai.generate'
  | 'cache.rebuild'
  | 'embedding.delete'
  | 'embedding.upsert'
  | 'media.cleanup'
  | 'sitemap.rebuild'
  | 'stripe.entitlement.update'

export type DirectoryJobMessage = {
  attempt: number
  jobId: string
  targetId: string
  type: DirectoryJobType
}

export type DirectoryPluginOptions = {
  enabled?: boolean
}

export type DirectoryCacheEntry<T> = {
  createdAt: number
  data: T
  freshUntil: number
  staleUntil: number
  version: string
}

