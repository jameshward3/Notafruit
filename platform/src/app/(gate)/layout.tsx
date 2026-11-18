import '@fontsource-variable/inter'
import '@/styles/site.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Review access — City of Orange Township (prototype)',
  robots: { index: false, follow: false },
}

/** Minimal layout for the review password page (no navigation: everything else is behind the gate). */
export default function GateLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="prototype-bar" role="note"><strong>Prototype for review — not the official City website.</strong></div>
        <main id="main">{children}</main>
      </body>
    </html>
  )
}
