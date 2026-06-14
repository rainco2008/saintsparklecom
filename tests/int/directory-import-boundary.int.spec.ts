import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const publicDir = path.resolve(process.cwd(), 'src/plugins/cloudflare-directory/public')
const blockedImports = [
  '@payload-config',
  '@payloadcms/next',
  '@payloadcms/ui',
  'payload',
  'node:',
  "from 'fs'",
  'from "fs"',
  "from 'path'",
  'from "path"',
  '/admin/',
]

const listSourceFiles = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name)

      return entry.isDirectory() ? listSourceFiles(fullPath) : [fullPath]
    })
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))

describe('directory public runtime import boundary', () => {
  it('does not import Payload, Admin, or Node-only modules', () => {
    const violations = listSourceFiles(publicDir).flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8')

      return blockedImports
        .filter((blocked) => source.includes(blocked))
        .map((blocked) => `${path.relative(process.cwd(), file)} imports ${blocked}`)
    })

    expect(violations).toEqual([])
  })
})
