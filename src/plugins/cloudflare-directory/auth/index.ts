import type { DirectoryBindings } from '../types'

export type DirectoryAuthRuntime = {
  env: Pick<DirectoryBindings, 'D1'>
}

export const createDirectoryAuthRuntime = (env: Pick<DirectoryBindings, 'D1'>): DirectoryAuthRuntime => ({
  env,
})

