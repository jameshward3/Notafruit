import { PageBand } from '@/components/ui'
export const metadata = { title: 'Privacy' }
export default function Privacy() {
  return (<><PageBand eyebrow="Privacy" title="Privacy information" /><div className="container section prose">
    <p>This page describes how this prototype handles information. The City&rsquo;s official privacy policy must be reviewed and adopted before public launch.</p>
    <h2>What we collect</h2>
    <ul>
      <li><strong>Address lookups:</strong> sent to the configured address service to find coordinates, used once, and not stored. Raw addresses are not logged or sent to analytics.</li>
      <li><strong>Concern reports:</strong> stored privately for City staff. Contact details are optional. Reports are never published or added to search.</li>
      <li><strong>Email updates:</strong> only after you confirm. Every email includes an unsubscribe link. We never import or buy mailing lists.</li>
      <li><strong>Abuse prevention:</strong> forms are rate-limited using a one-way hash of your network address, kept for a short window.</li>
    </ul>
    <h2>Cookies</h2><p>A language preference cookie remembers whether you chose English or Spanish. Staff sign-in cookies apply only to the staff site.</p>
    <h2>Other sites</h2><p>Payments, permits and some records are handled by separate City systems with their own terms. We tell you before you leave.</p>
  </div></>)
}
