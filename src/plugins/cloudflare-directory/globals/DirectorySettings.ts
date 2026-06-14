import type { GlobalConfig } from 'payload'

export const DirectorySettings: GlobalConfig = {
  slug: 'directory-settings',
  admin: {
    group: 'Directory',
  },
  fields: [
    {
      name: 'enablePublicDirectory',
      type: 'checkbox',
      defaultValue: true,
      label: 'Enable public directory',
    },
    {
      name: 'cacheFreshSeconds',
      type: 'number',
      defaultValue: 300,
      min: 0,
      required: true,
    },
    {
      name: 'cacheStaleSeconds',
      type: 'number',
      defaultValue: 3600,
      min: 0,
      required: true,
    },
  ],
}

