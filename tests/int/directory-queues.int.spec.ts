import { describe, expect, it, vi } from 'vitest'

import {
  completeDirectoryJob,
  createAndEnqueueDirectoryJob,
  createDirectoryDefaultQueueConsumer,
  failDirectoryJob,
  tryStartDirectoryJob,
} from '@/plugins/cloudflare-directory/queues'
import type { DirectoryJobMessage } from '@/plugins/cloudflare-directory/types'

const createFakeD1 = () => {
  const jobs = new Map<string, Record<string, unknown>>()

  return {
    jobs,
    prepare(query: string) {
      return {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          this.values = values
          return this
        },
        async run() {
          if (query.startsWith('INSERT INTO directory_jobs')) {
            jobs.set(String(this.values[0]), {
              attempt: this.values[3],
              jobId: this.values[0],
              status: 'pending',
              targetId: this.values[2],
              type: this.values[1],
            })

            return { meta: { changes: 1 } }
          }

          if (query.includes("SET status = 'processing'")) {
            const job = jobs.get(String(this.values[3]))

            if (!job || (job.status !== 'pending' && job.status !== 'failed')) {
              return { meta: { changes: 0 } }
            }

            job.status = 'processing'
            job.attempt = this.values[0]
            return { meta: { changes: 1 } }
          }

          if (query.includes("SET status = 'completed'")) {
            jobs.get(String(this.values[2]))!.status = 'completed'
            return { meta: { changes: 1 } }
          }

          if (query.includes("SET status = 'failed'")) {
            const job = jobs.get(String(this.values[2]))!
            job.status = 'failed'
            job.error = this.values[0]
            return { meta: { changes: 1 } }
          }

          return { meta: { changes: 0 } }
        },
      }
    },
  }
}

describe('directory queues', () => {
  it('creates, starts, completes, and fails jobs idempotently', async () => {
    const d1 = createFakeD1()
    const sent: DirectoryJobMessage[] = []
    const queue = {
      send: async (message: DirectoryJobMessage) => {
        sent.push(message)
      },
    } as Queue<DirectoryJobMessage>
    const message: DirectoryJobMessage = {
      attempt: 0,
      jobId: 'job-1',
      targetId: 'target-1',
      type: 'cache.rebuild',
    }

    const result = await createAndEnqueueDirectoryJob(
      { D1: d1 as unknown as D1Database },
      queue,
      message,
    )

    expect(result.enqueued).toBe(true)
    expect(sent).toHaveLength(1)
    expect(await tryStartDirectoryJob({ D1: d1 as unknown as D1Database }, message)).toBe(true)
    expect(await tryStartDirectoryJob({ D1: d1 as unknown as D1Database }, message)).toBe(false)

    await completeDirectoryJob({ D1: d1 as unknown as D1Database }, message.jobId)
    expect(d1.jobs.get(message.jobId)?.status).toBe('completed')

    await failDirectoryJob({ D1: d1 as unknown as D1Database }, message.jobId, new Error('boom'))
    expect(d1.jobs.get(message.jobId)?.status).toBe('failed')
    expect(d1.jobs.get(message.jobId)?.error).toBe('boom')
  })

  it('acks duplicate messages without running side effects twice', async () => {
    const d1 = createFakeD1()
    const message: DirectoryJobMessage = {
      attempt: 0,
      jobId: 'job-2',
      targetId: 'target-2',
      type: 'cache.rebuild',
    }
    await createAndEnqueueDirectoryJob({ D1: d1 as unknown as D1Database }, undefined, message)

    let sideEffects = 0
    const consumer = createDirectoryDefaultQueueConsumer({
      'cache.rebuild': async () => {
        sideEffects += 1
      },
    })
    const queueMessage = {
      ack: vi.fn(),
      body: message,
      retry: vi.fn(),
    } as unknown as Message<DirectoryJobMessage>
    const batch = {
      messages: [queueMessage],
    } as unknown as MessageBatch<DirectoryJobMessage>
    const env = {
      D1: d1 as unknown as D1Database,
      R2: {} as R2Bucket,
    }
    const ctx = {
      waitUntil: vi.fn(),
    } as unknown as ExecutionContext

    await consumer(batch, env, ctx)
    await consumer(batch, env, ctx)

    expect(sideEffects).toBe(1)
    expect(queueMessage.ack).toHaveBeenCalledTimes(2)
    expect(queueMessage.retry).not.toHaveBeenCalled()
  })
})
