import type { Plugin } from 'payload'

import { DirectoryAuditLogs } from './collections/DirectoryAuditLogs'
import { DirectoryCategories } from './collections/DirectoryCategories'
import { DirectoryItems } from './collections/DirectoryItems'
import { DirectoryJobs } from './collections/DirectoryJobs'
import { DirectorySettings } from './globals/DirectorySettings'
import type { DirectoryPluginOptions } from './types'

export const cloudflareDirectoryPlugin =
  (options: DirectoryPluginOptions = {}): Plugin =>
  (config) => {
    if (options.enabled === false) {
      return config
    }

    return {
      ...config,
      collections: [
        ...(config.collections || []),
        DirectoryCategories,
        DirectoryItems,
        DirectoryJobs,
        DirectoryAuditLogs,
      ],
      globals: [...(config.globals || []), DirectorySettings],
    }
  }

cloudflareDirectoryPlugin.slug = 'cloudflare-directory'

export type {
  DirectoryBindings,
  DirectoryCacheEntry,
  DirectoryJobMessage,
  DirectoryJobType,
  DirectoryPluginOptions,
} from './types'
