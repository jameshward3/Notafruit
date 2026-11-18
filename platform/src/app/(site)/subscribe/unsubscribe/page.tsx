import { Notice, PageBand } from '@/components/ui'
import { one, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { setSubscriptionStatus } from '@/lib/subscriptions'
export const dynamic = 'force-dynamic'
export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const ok = await setSubscriptionStatus(await getClient(), 'unsubscribe', one(sp.id), one(sp.t))
  return (<><PageBand title="Unsubscribe" /><div className="container section">
    {ok ? <Notice tone="success" title="You have been unsubscribed">You will not receive further emails for this topic.</Notice>
      : <Notice tone="warning" title="This link is not valid">It may be incomplete. Please copy the full link from the email.</Notice>}
  </div></>)
}
