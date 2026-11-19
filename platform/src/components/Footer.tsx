import Link from 'next/link'
import type { Strings } from '@/lib/strings'
import { CITY_HALL } from '@/lib/facts'

export function Footer({ s }: { s: Strings }) {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <h2>{s.footerAbout}</h2>
          <p>{CITY_HALL.name}<br />{CITY_HALL.address}<br /><a href={`tel:${CITY_HALL.phoneTel}`}>{CITY_HALL.phone}</a></p>
        </div>
        <div>
          <h2>{s.footerGov}</h2>
          <ul>
            <li><Link href="/government/meetings">{s.meetingsAgendas}</Link></li>
            <li><Link href="/government/legislation">{s.legislation}</Link></li>
            <li><Link href="/transparency/budget">{s.budget}</Link></li>
            <li><Link href="/government/officials">{s.officialsContacts}</Link></li>
            <li><Link href="/departments">{s.departments}</Link></li>
            <li><Link href="/government/directory">{s.staffDirectory}</Link></li>
          </ul>
        </div>
        <div>
          <h2>{s.footerHelp}</h2>
          <ul>
            <li><Link href="/services">{s.services}</Link></li>
            <li><Link href="/business">{s.business}</Link></li>
            <li><Link href="/info">{s.cityPages}</Link></li>
            <li><Link href="/report-a-concern">{s.reportConcern}</Link></li>
            <li><Link href="/subscribe">{s.getUpdates}</Link></li>
            <li><Link href="/accessibility">{s.accessibility}</Link></li>
            <li><Link href="/privacy">{s.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <h2>{s.officialSite}</h2>
          <p>{s.footerOfficial.split('{a}')[0]}<a href="https://orangenj.gov">orangenj.gov</a>{s.footerOfficial.split('{a}')[1].split('{b}')[0]}<a href="https://orangetwpnjcc.org">orangetwpnjcc.org</a>{s.footerOfficial.split('{b}')[1]}</p>
        </div>
      </div>
      <div className="footer__base"><div className="container">{s.designNote.toUpperCase()}</div></div>
    </footer>
  )
}
