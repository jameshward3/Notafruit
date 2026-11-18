'use server'
import { headers } from 'next/headers'
import { createConcern } from '@/lib/concerns'
import { getClient } from '@/lib/payload'
import { clientKey, rateLimit } from '@/lib/ratelimit'
import { subscribe } from '@/lib/subscriptions'

export type FormState = { status: 'idle' } | { status: 'error'; message: string; errors?: { field: string; message: string }[]; values?: Record<string, string> } | { status: 'ok'; message: string; reference?: string }

export async function subscribeAction(_p: FormState, form: FormData): Promise<FormState> {
  const payload = await getClient()
  if (!(await rateLimit(payload, 'subscribe', clientKey(await headers()), Number(process.env.RATE_LIMIT_SUBSCRIBE_PER_HOUR ?? 10), 3600)).allowed) return { status: 'error', message: 'Too many requests. Please try again later.' }
  const r = await subscribe(payload, { email: form.get('email'), topicType: form.get('topicType'), topicId: form.get('topicId') || '*' })
  return r.ok ? { status: 'ok', message: 'Check your email for a confirmation link. Nothing will be sent until you confirm.' } : { status: 'error', message: r.error }
}

export async function concernAction(_p: FormState, form: FormData): Promise<FormState> {
  const payload = await getClient()
  if (!(await rateLimit(payload, 'concern', clientKey(await headers()), Number(process.env.RATE_LIMIT_CONCERNS_PER_HOUR ?? 5), 3600)).allowed) return { status: 'error', message: 'Too many submissions from this connection. Please call City Hall.' }
  const r = await createConcern(payload, Object.fromEntries(form.entries()))
  if (!r.ok) {
    // Echo back what the resident typed so nothing is lost (never echo the honeypot).
    const values = Object.fromEntries(['category', 'locationText', 'description', 'contactName', 'contactEmail', 'contactPhone'].map((k) => [k, String(form.get(k) ?? '').slice(0, 4000)]))
    return { status: 'error', message: 'Please fix the highlighted fields.', errors: r.errors, values }
  }
  return { status: 'ok', reference: r.reference, message: 'Your request was received and saved privately for City staff.' }
}
