'use client'
export default function Error({ reset }: { reset: () => void }) {
  return (<div className="container section prose" role="alert"><h1>Something went wrong</h1><p>This page could not be loaded right now. Please try again. If it keeps happening, call City Hall.</p><button className="btn" onClick={reset}>Try again</button></div>)
}
