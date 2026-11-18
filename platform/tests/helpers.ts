import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'

let cached: Payload | null = null
export async function payloadForTests() {
  if (!cached) cached = await getPayload({ config: await config })
  return cached
}

let n = 0
export async function makeUser(payload: Payload, roles: string[], departments: number[] = [], extra: Record<string, unknown> = {}) {
  n++
  const u = await payload.create({
    collection: 'users', overrideAccess: true,
    data: { email: `u${n}-${Date.now()}@test.local`, password: 'Test-password-123!', name: `User ${n}`, roles: roles as any, departments, ...extra },
  })
  return { ...u, collection: 'users' } as any
}

export async function makeDept(payload: Payload, name: string) {
  return payload.create({ collection: 'departments', overrideAccess: true, data: { name, slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${Date.now()}` } as any })
}
