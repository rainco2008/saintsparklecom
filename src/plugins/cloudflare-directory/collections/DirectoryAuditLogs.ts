import type { CollectionConfig } from 'payload'

export const DirectoryAuditLogs: CollectionConfig = {
  slug: 'directory-audit-logs',
  admin: {
    defaultColumns: ['action', 'targetType', 'targetId', 'actorType', 'createdAt'],
    group: 'Directory',
    useAsTitle: 'action',
  },
  fields: [
    {
      name: 'actorType',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'System', value: 'system' },
        { label: 'User', value: 'user' },
      ],
      required: true,
    },
    {
      name: 'actorId',
      type: 'text',
    },
    {
      name: 'action',
      type: 'text',
      required: true,
    },
    {
      name: 'targetType',
      type: 'text',
      required: true,
    },
    {
      name: 'targetId',
      type: 'text',
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
}

