import { useEffect } from 'react'
import { supabase } from './supabase'

interface BrandingRow {
  branding_favicon_16_url:       string | null
  branding_favicon_32_url:       string | null
  branding_apple_touch_icon_url: string | null
}

const CACHE_KEY_32  = 'branding.favicon32.dataurl'
const CACHE_KEY_180 = 'branding.appletouch.dataurl'

// Sync — call BEFORE React renders so the favicon is in document.head
// before the first paint on repeat visits. First-time visitors still see a
// brief moment without favicon while the network round-trip below populates
// the cache for subsequent visits.
export function applyBrandingFromCache(): void {
  try {
    const fav32 = localStorage.getItem(CACHE_KEY_32)
    if (fav32) injectIcon('icon', '32x32', 'image/png', fav32)
    const apple = localStorage.getItem(CACHE_KEY_180)
    if (apple) injectIcon('apple-touch-icon', '180x180', 'image/png', apple)
  } catch {
    // localStorage can throw in private mode — flicker stays, app still works
  }
}

export function useBrandingInjector(): void {
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('app_installningar')
        .select('branding_favicon_16_url, branding_favicon_32_url, branding_apple_touch_icon_url')
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      const row = data as BrandingRow | null
      if (!row) return
      injectIcon('icon',             '16x16',   'image/png', row.branding_favicon_16_url)
      injectIcon('icon',             '32x32',   'image/png', row.branding_favicon_32_url)
      injectIcon('apple-touch-icon', '180x180', 'image/png', row.branding_apple_touch_icon_url)
      void cacheAsDataUrl(row.branding_favicon_32_url,       CACHE_KEY_32)
      void cacheAsDataUrl(row.branding_apple_touch_icon_url, CACHE_KEY_180)
    })()
    return () => { cancelled = true }
  }, [])
}

async function cacheAsDataUrl(url: string | null, key: string): Promise<void> {
  if (!url) return
  try {
    const resp = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (!resp.ok) return
    const blob = await resp.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    if (localStorage.getItem(key) !== dataUrl) {
      localStorage.setItem(key, dataUrl)
    }
  } catch {
    // Network/storage errors don't matter — next visit will retry.
  }
}

function injectIcon(rel: string, sizes: string, type: string, href: string | null): void {
  if (!href) return
  const selector = `link[rel="${rel}"][sizes="${sizes}"]`
  let link = document.head.querySelector<HTMLLinkElement>(selector)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    link.setAttribute('sizes', sizes)
    document.head.appendChild(link)
  }
  link.type = type
  link.href = href
}
