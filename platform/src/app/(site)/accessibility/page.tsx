import Link from 'next/link'
import { PageBand } from '@/components/ui'
import { CITY_HALL } from '@/lib/facts'
export const metadata = { title: 'Accessibility' }
export default function Accessibility() {
  return (<><PageBand eyebrow="Accessibility" title="Accessibility statement" /><div className="container section prose">
    <p>This prototype is built to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA as a baseline — the technical standard identified in the U.S. Department of Justice&rsquo;s ADA Title II web accessibility rule — and aims for WCAG 2.2 AA as an additional quality target. It has not been independently audited and makes no claim of certification or legal conformance. The City&rsquo;s compliance timeline and obligations are for City counsel to confirm.</p>
    <p className="meta">References: <a href="https://www.ada.gov/resources/2024-03-08-web-rule/">DOJ fact sheet on the Title II web rule</a> · <a href="https://www.ada.gov/resources/small-entity-compliance-guide/">DOJ small entity compliance guide</a> · <a href="https://www.w3.org/TR/WCAG21/">WCAG 2.1</a>. This site does not use an accessibility overlay.</p>
    <h2>What we do</h2>
    <ul><li>Semantic page structure, skip link and keyboard-operable controls with visible focus.</li><li>Every map has an equivalent list; every chart has an equivalent table and text summary.</li><li>Agendas, minutes and legislation are web pages, not PDF-only documents.</li><li>Color is never the only way information is shown: status and ward colors are paired with text, icons or patterns.</li><li>Layouts reflow at 320 px and support 200% zoom; motion is reduced when you ask for it.</li></ul>
    <h2>Known limitations</h2>
    <ul><li>Historic records linked from the current official websites may not be accessible.</li><li>The interactive map is a visual aid; use the list beside it for full information.</li><li>Spanish translations of page content are incomplete; untranslated pages say so.</li></ul>
    <h2>Report a barrier</h2>
    <p>If something does not work for you, call {CITY_HALL.name} at <a href={`tel:${CITY_HALL.phoneTel}`}>{CITY_HALL.phone}</a> or <Link href="/report-a-concern">use the concern form</Link> and choose &ldquo;Other&rdquo;. Tell us the page and what happened.</p>
  </div></>)
}
