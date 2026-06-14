import { describe, expect, it, vi } from 'vitest'

import {
  parseStripeSignatureHeader,
  verifyStripeWebhookSignature,
} from '@/plugins/cloudflare-directory/stripe'

const encoder = new TextEncoder()

const sign = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))

  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

describe('directory stripe helpers', () => {
  it('parses stripe signature headers', () => {
    expect(parseStripeSignatureHeader('t=123,v1=abc,v1=def')).toEqual({
      signatures: ['abc', 'def'],
      timestamp: '123',
    })
  })

  it('verifies valid raw body signatures', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T08:00:00.000Z'))
    const timestamp = Math.floor(Date.now() / 1000)
    const body = '{"id":"evt_1"}'
    const signature = await sign('secret', `${timestamp}.${body}`)

    await expect(
      verifyStripeWebhookSignature({
        rawBody: body,
        secret: 'secret',
        signatureHeader: `t=${timestamp},v1=${signature}`,
      }),
    ).resolves.toBe(true)

    vi.useRealTimers()
  })

  it('rejects invalid or stale signatures', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T08:00:00.000Z'))

    await expect(
      verifyStripeWebhookSignature({
        rawBody: '{"id":"evt_1"}',
        secret: 'secret',
        signatureHeader: 't=1,v1=bad',
      }),
    ).resolves.toBe(false)

    await expect(
      verifyStripeWebhookSignature({
        rawBody: '{"id":"evt_1"}',
        secret: 'secret',
        signatureHeader: `t=${Math.floor(Date.now() / 1000)},v1=bad`,
      }),
    ).resolves.toBe(false)

    vi.useRealTimers()
  })
})
