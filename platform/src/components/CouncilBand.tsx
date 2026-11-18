import { t, type Strings } from '@/lib/strings'
import { SearchAutocomplete } from './SearchAutocomplete'

const BAND: Record<string, { eyebrow: string; l1: string; l2: string; ph: string }> = {
  'Search the City': { eyebrow: 'Council & public records', l1: 'Open government.', l2: 'Every step on the record.', ph: 'Search meetings, legislation, or keywords' },
  'Buscar en la Ciudad': { eyebrow: 'Concejo y registros públicos', l1: 'Gobierno abierto.', l2: 'Cada paso, en el registro.', ph: 'Buscar reuniones, legislación o palabras clave' },
  'Chèche nan Vil la': { eyebrow: 'Konsèy ak dosye piblik', l1: 'Gouvènman ouvè.', l2: 'Chak etap, nan dosye a.', ph: 'Chèche reyinyon, lejislasyon oswa mo kle' },
}

export function CouncilBand({ s }: { s?: Strings }) {
  const L = s ?? t('en')
  const b = BAND[L.searchTitle] ?? BAND['Search the City']
  return (
    <div className="band on-navy">
      <div className="container band__inner">
        <div><p className="eyebrow">{b.eyebrow}</p><h1 style={{ fontSize: 'var(--fs-hero)' }}>{b.l1}<br />{b.l2}</h1></div>
        <form action="/search" role="search" aria-label={b.ph}>
          <label htmlFor="rec-q" className="sr-only">{b.ph}</label>
          <input type="hidden" name="type" value="" />
          <div className="searchbar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <SearchAutocomplete id="rec-q" placeholder={b.ph} s={L} /><button className="btn btn--gold" type="submit">{L.searchSubmit}</button></div>
        </form>
      </div>
    </div>
  )
}
