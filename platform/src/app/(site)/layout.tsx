import '@fontsource-variable/inter'
import '@/styles/site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { Masthead } from '@/components/Masthead'
import { getLocale, t } from '@/lib/i18n'

export const metadata: Metadata = {
  title: { default: 'City of Orange Township, New Jersey (prototype)', template: '%s — City of Orange Township (prototype)' },
  description: 'Prototype of a unified public platform for the City of Orange Township, NJ. Not the official City website.',
  robots: { index: false, follow: false }, // staging/prototype: never indexed
}

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()
  const s = t(locale)
  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main">{s.skip}</a>
        <div className="prototype-bar" role="note"><strong>{s.prototype}</strong></div>
        <Masthead s={s} locale={locale} />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer s={s} />
      </body>
    </html>
  )
}
