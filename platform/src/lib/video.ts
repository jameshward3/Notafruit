/** YouTube video id from a watch / youtu.be / embed URL, else null. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    const id = host === 'youtu.be' ? u.pathname.slice(1) : host === 'youtube.com' || host === 'youtube-nocookie.com' ? (u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|live|shorts)\/([\w-]{11})/)?.[1] ?? '') : ''
    return /^[\w-]{11}$/.test(id) ? id : null
  } catch { return null }
}

/** Privacy-enhanced embed URL (no YouTube cookies until the viewer presses play). */
export const youtubeEmbed = (id: string, start?: number) => `https://www.youtube-nocookie.com/embed/${id}?rel=0${start ? `&start=${Math.floor(start)}` : ''}`
