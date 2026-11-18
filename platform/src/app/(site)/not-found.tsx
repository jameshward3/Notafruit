import Link from 'next/link'
export default function NotFound() {
  return (<div className="container section prose"><h1>Page not found</h1><p>This page may have moved while the City&rsquo;s websites are being combined.</p><p><Link href="/search">Search the site</Link> or go to the <Link href="/">homepage</Link>.</p></div>)
}
