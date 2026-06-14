import type { DirectoryBindings, DirectoryJobMessage } from '../types'

export type DirectoryJobStatus = 'completed' | 'failed' | 'pending' | 'processing'

export type DirectoryQueueHandler = (args: {
  ctx: ExecutionContext
  env: DirectoryBindings
  message: Message<DirectoryJobMessage>
}) => Promise<void>

export type DirectoryQueueHandlers = Partial<Record<DirectoryJobMessage['type'], DirectoryQueueHandler>>

const now = () => new Date().toISOString()

export async function createDirectoryJob(
  env: Pick<DirectoryBindings, 'D1'>,
  message: DirectoryJobMessage,
): Promise<void> {
  await env.D1.prepare(
    `INSERT INTO directory_jobs (job_id, type, target_id, status, attempt, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
  )
    .bind(message.jobId, message.type, message.targetId, message.attempt, now(), now())
    .run()
}

export async function enqueueDirectoryJob(
  queue: Queue<DirectoryJobMessage> | undefined,
  message: DirectoryJobMessage,
): Promise<boolean> {
  if (!queue) {
    return false
  }

  await queue.send(message)
  return true
}

export async function createAndEnqueueDirectoryJob(
  env: Pick<DirectoryBindings, 'D1'>,
  queue: Queue<DirectoryJobMessage> | undefined,
  message: DirectoryJobMessage,
): Promise<{ enqueued: boolean }> {
  await createDirectoryJob(env, message)
  const enqueued = await enqueueDirectoryJob(queue, message)

  return { enqueued }
}

export async function tryStartDirectoryJob(
  env: Pick<DirectoryBindings, 'D1'>,
  message: DirectoryJobMessage,
): Promise<boolean> {
  const startedAt = now()
  const result = await env.D1.prepare(
    `UPDATE directory_jobs
     SET status = 'processing', attempt = ?, locked_at = ?, updated_at = ?
     WHERE job_id = ?
       AND status IN ('pending', 'failed')`,
  )
    .bind(message.attempt, startedAt, startedAt, message.jobId)
    .run()

  return Boolean(result.meta?.changes)
}

export async function completeDirectoryJob(
  env: Pick<DirectoryBindings, 'D1'>,
  jobId: string,
): Promise<void> {
  const completedAt = now()

  await env.D1.prepare(
    `UPDATE directory_jobs
     SET status = 'completed', completed_at = ?, updated_at = ?, error = NULL
     WHERE job_id = ?`,
  )
    .bind(completedAt, completedAt, jobId)
    .run()
}

export async function failDirectoryJob(
  env: Pick<DirectoryBindings, 'D1'>,
  jobId: string,
  error: unknown,
): Promise<void> {
  await env.D1.prepare(
    `UPDATE directory_jobs
     SET status = 'failed', error = ?, updated_at = ?
     WHERE job_id = ?`,
  )
    .bind(error instanceof Error ? error.message : String(error), now(), jobId)
    .run()
}

export const createDirectoryQueueConsumer =
  (handlers: DirectoryQueueHandlers) =>
  async (batch: MessageBatch<DirectoryJobMessage>, env: DirectoryBindings, ctx: ExecutionContext) => {
    for (const message of batch.messages) {
      const handler = handlers[message.body.type]

      if (!handler) {
        message.retry()
        continue
      }

      const started = await tryStartDirectoryJob(env, message.body)

      if (!started) {
        message.ack()
        continue
      }

      try {
        await handler({ ctx, env, message })
        await completeDirectoryJob(env, message.body.jobId)
        message.ack()
      } catch (error) {
        await failDirectoryJob(env, message.body.jobId, error)
        message.retry()
      }
    }
  }

export const createDirectoryDefaultQueueConsumer = (
  handlers: DirectoryQueueHandlers = {},
) =>
  createDirectoryQueueConsumer({
    'cache.rebuild': async () => {},
    'sitemap.rebuild': async () => {},
    ...handlers,
  })
