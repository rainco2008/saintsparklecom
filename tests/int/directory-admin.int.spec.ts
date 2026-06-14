import { describe, expect, it, vi } from 'vitest'

import { createDirectoryAdminEndpoints } from '@/plugins/cloudflare-directory/admin/endpoints'

const createRequest = (options: { formData?: FormData; user?: unknown } = {}) =>
  ({
    formData: async () => options.formData ?? new FormData(),
    payload: {
      create: vi.fn(async (args) => ({ id: 1, ...args.data })),
    },
    user: options.user,
  }) as any

describe('directory admin endpoints', () => {
  it('rejects unauthenticated job requests', async () => {
    const [endpoint] = createDirectoryAdminEndpoints()
    const response = await endpoint.handler(createRequest())

    expect(response.status).toBe(401)
  })

  it('creates pending cache rebuild jobs', async () => {
    const [endpoint] = createDirectoryAdminEndpoints()
    const formData = new FormData()
    formData.set('targetId', 'all')

    const req = createRequest({
      formData,
      user: { id: 1 },
    })
    const response = await endpoint.handler(req)

    expect(response.status).toBe(202)
    expect(req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'directory-jobs',
        data: expect.objectContaining({
          status: 'pending',
          targetId: 'all',
          type: 'cache.rebuild',
        }),
      }),
    )
  })
})

