import { safeNext } from '@/lib/siteGate'

export const dynamic = 'force-dynamic'

export default async function ReviewLogin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const next = safeNext(typeof sp.next === 'string' ? sp.next : undefined)
  const error = sp.error === '1' ? 'That password is not correct. Please try again.' : sp.error === 'rate' ? 'Too many attempts. Please wait a few minutes and try again.' : null
  return (
    <div className="gate">
      <div className="gate__card">
        <img className="gate__seal" src="/assets/brand/city-seal.png" alt="" width={72} height={72} />
        <p className="eyebrow">City of Orange Township</p>
        <h1>Review prototype</h1>
        <p>This prototype is shared for review. Enter the review password to continue.</p>
        {error && <p className="alert alert--warning" role="alert">{error}</p>}
        <form method="post" action="/review-login/verify" className="gate__form">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="gate-pw">Password</label>
          <input id="gate-pw" name="password" type="password" autoComplete="current-password" required autoFocus />
          <button className="btn btn--gold" type="submit">Continue</button>
        </form>
      </div>
    </div>
  )
}
