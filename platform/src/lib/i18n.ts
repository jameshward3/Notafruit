import { cookies } from 'next/headers'
import { isLocale, type Locale } from './strings'

export * from './strings'

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get('lang')?.value
  return isLocale(c) ? c : 'en'
}
