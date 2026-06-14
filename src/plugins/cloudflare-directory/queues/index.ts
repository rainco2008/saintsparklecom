import type { DirectoryBindings, DirectoryJobMessage } from '../types'

export type DirectoryQueueHandler = (args: {
  batch: MessageBatch<DirectoryJobMessage>
  ctx: ExecutionContext
  env: DirectoryBindings
}) => Promise<void>

export type DirectoryQueueHandlers = Partial<Record<DirectoryJobMessage['type'], DirectoryQueueHandler>>

export const createDirectoryQueueConsumer =
  (handlers: DirectoryQueueHandlers) =>
  async (batch: MessageBatch<DirectoryJobMessage>, env: DirectoryBindings, ctx: ExecutionContext) => {
    for (const message of batch.messages) {
      const handler = handlers[message.body.type]

      if (!handler) {
        message.retry()
        continue
      }

      await handler({ batch, ctx, env })
      message.ack()
    }
  }

