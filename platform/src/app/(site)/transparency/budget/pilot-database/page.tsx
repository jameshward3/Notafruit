import Link from 'next/link'
import { PilotDatabase } from '@/components/PilotDatabase'
import { PageBand } from '@/components/ui'

export const metadata = { title: 'PILOT database (NJ DCA)' }

/** Interactive view of the NJ DCA PILOT Database and Viewer workbook. */
export default function PilotDatabasePage() {
  return (
    <>
      <PageBand eyebrow="Budget & transparency" title="PILOT database" crumbs={[{ href: '/', label: 'Home' }, { href: '/transparency/budget', label: 'Budget' }, { href: '/transparency/budget/dashboard?tab=pilot', label: 'PILOT program' }, { label: 'PILOT database' }]}>
        <p style={{ color: '#DCE3EA' }}>Every payment-in-lieu-of-taxes agreement reported by New Jersey municipalities, and what those properties would pay at the normal tax rate. From the NJ Department of Community Affairs.</p>
      </PageBand>
      <div className="container section">
        <p>Payments in lieu of taxes (PILOTs) replace conventional property taxes on redevelopment, affordable-housing and other projects. This view of the state&apos;s workbook shows, for any municipality, each agreement&apos;s payment, its assessed value, and the tax it would owe at the municipality&apos;s 2025 total tax rate. <Link href="/transparency/budget/dashboard?tab=pilot">See Orange&apos;s PILOTs in the 2026 budget</Link>.</p>
        <PilotDatabase />
      </div>
    </>
  )
}
