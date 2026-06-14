import type { DirectoryBindings, DirectoryJobMessage } from '../types'

export type DirectoryStripeRuntime = {
  env: Pick<DirectoryBindings, 'D1'> & {
    DIRECTORY_CACHE_QUEUE?: Queue<DirectoryJobMessage>
  }
}

export const createDirectoryStripeRuntime = (env: DirectoryStripeRuntime['env']): DirectoryStripeRuntime => ({
  env,
})

const encoder = new TextEncoder()

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return diff === 0
}

export const parseStripeSignatureHeader = (header: string) =>
  header.split(',').reduce(
    (acc, part) => {
      const [key, value] = part.split('=')

      if (key === 't') {
        acc.timestamp = value
      }

      if (key === 'v1') {
        acc.signatures.push(value)
      }

      return acc
    },
    { signatures: [] as string[], timestamp: undefined as string | undefined },
  )

export async function verifyStripeWebhookSignature(args: {
  rawBody: string
  secret: string
  signatureHeader: string
  toleranceSeconds?: number
}): Promise<boolean> {
  const parsed = parseStripeSignatureHeader(args.signatureHeader)

  if (!parsed.timestamp || parsed.signatures.length === 0) {
    return false
  }

  const timestamp = Number(parsed.timestamp)

  if (!Number.isFinite(timestamp)) {
    return false
  }

  const toleranceSeconds = args.toleranceSeconds ?? 300
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(args.secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signedPayload = `${parsed.timestamp}.${args.rawBody}`
  const expected = toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload)))

  return parsed.signatures.some((signature) => timingSafeEqual(signature, expected))
}

export async function hasProcessedStripeEvent(
  env: Pick<DirectoryBindings, 'D1'>,
  eventId: string,
): Promise<boolean> {
  const row = await env.D1.prepare(
    `SELECT id
     FROM directory_audit_logs
     WHERE action = 'stripe.webhook.processed'
       AND target_type = 'stripe-event'
       AND target_id = ?
     LIMIT 1`,
  )
    .bind(eventId)
    .first<{ id: number }>()

  return Boolean(row)
}
