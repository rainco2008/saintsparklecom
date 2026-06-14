import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { createAndEnqueueDirectoryJob } from '../queues'
import type { DirectoryBindings } from '../types'

const createPublishSideEffects: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (doc.status !== 'published' || previousDoc?.status === 'published') {
    return doc
  }

  const targetId = String(doc.id)
  const actorId = req.user?.id ? String(req.user.id) : undefined

  await req.payload.create({
    collection: 'directory-audit-logs',
    data: {
      action: operation === 'create' ? 'item.published.create' : 'item.published.update',
      actorId,
      actorType: actorId ? 'admin' : 'system',
      metadata: {
        slug: doc.slug,
      },
      targetId,
      targetType: 'directory-item',
    },
    req,
  })

  const message = {
    attempt: 0,
    jobId: `cache-rebuild:item:${targetId}:${Date.now()}`,
    targetId,
    type: 'cache.rebuild' as const,
  }

  await createAndEnqueueDirectoryJob(
    { D1: req.payload.db.drizzle.$client as D1Database },
    (req.payload.config.custom?.cloudflareEnv as DirectoryBindings | undefined)?.DIRECTORY_CACHE_QUEUE,
    message,
  )

  return doc
}

export const DirectoryItems: CollectionConfig = {
  slug: 'directory-items',
  admin: {
    defaultColumns: ['title', 'status', 'category', 'publishedAt', 'updatedAt'],
    group: 'Directory',
    useAsTitle: 'title',
  },
  hooks: {
    afterChange: [createPublishSideEffects],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'directory-categories',
    },
    {
      name: 'summary',
      type: 'textarea',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'websiteUrl',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending', value: 'pending' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      required: true,
    },
    {
      name: 'submitterUserId',
      type: 'text',
    },
    {
      name: 'reviewedByAdmin',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}
