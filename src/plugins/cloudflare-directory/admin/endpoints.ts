import type { Endpoint, PayloadRequest } from 'payload'

import type { DirectoryJobType } from '../types'

const createJobId = (type: DirectoryJobType, targetId: string) =>
  `${type}:${targetId}:${Date.now()}`

const createJobResponse = async (
  req: PayloadRequest,
  type: Extract<DirectoryJobType, 'cache.rebuild' | 'sitemap.rebuild'>,
): Promise<Response> => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData().catch((_error: unknown): undefined => undefined)
  const targetId = String(formData?.get('targetId') || type)
  const jobId = createJobId(type, targetId)

  await req.payload.create({
    collection: 'directory-jobs',
    data: {
      attempt: 0,
      jobId,
      status: 'pending',
      targetId,
      type,
    },
    req,
  })

  return Response.json({ jobId, status: 'accepted' }, { status: 202 })
}

export const createDirectoryAdminEndpoints = (): Endpoint[] => [
  {
    handler: (req) => createJobResponse(req, 'cache.rebuild'),
    method: 'post',
    path: '/directory/cache-rebuild',
  },
  {
    handler: (req) => createJobResponse(req, 'sitemap.rebuild'),
    method: 'post',
    path: '/directory/sitemap-rebuild',
  },
]
