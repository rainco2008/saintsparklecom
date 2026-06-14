import type { CollectionConfig } from 'payload'

export const DirectoryJobs: CollectionConfig = {
  slug: 'directory-jobs',
  admin: {
    defaultColumns: ['jobId', 'type', 'status', 'attempt', 'createdAt'],
    group: 'Directory',
    useAsTitle: 'jobId',
  },
  fields: [
    {
      name: 'jobId',
      type: 'text',
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'AI generate', value: 'ai.generate' },
        { label: 'Cache rebuild', value: 'cache.rebuild' },
        { label: 'Embedding delete', value: 'embedding.delete' },
        { label: 'Embedding upsert', value: 'embedding.upsert' },
        { label: 'Media cleanup', value: 'media.cleanup' },
        { label: 'Sitemap rebuild', value: 'sitemap.rebuild' },
        { label: 'Stripe entitlement update', value: 'stripe.entitlement.update' },
      ],
      required: true,
    },
    {
      name: 'targetId',
      type: 'text',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
      required: true,
    },
    {
      name: 'attempt',
      type: 'number',
      defaultValue: 0,
      min: 0,
      required: true,
    },
    {
      name: 'lockedAt',
      type: 'date',
    },
    {
      name: 'completedAt',
      type: 'date',
    },
    {
      name: 'error',
      type: 'textarea',
    },
  ],
}

