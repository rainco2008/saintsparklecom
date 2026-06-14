import type { DirectoryBindings, DirectoryJobMessage } from '../types'

export type DirectoryStripeRuntime = {
  env: Pick<DirectoryBindings, 'D1'> & {
    DIRECTORY_CACHE_QUEUE?: Queue<DirectoryJobMessage>
  }
}

export const createDirectoryStripeRuntime = (env: DirectoryStripeRuntime['env']): DirectoryStripeRuntime => ({
  env,
})

