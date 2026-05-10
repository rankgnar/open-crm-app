import { useEffect, useState } from 'react'
import { supabase } from './supabase'

interface ForetagRow {
  foretag_logo_url: string | null
  foretag_namn: string | null
}

interface ForetagInfo {
  logoUrl: string | null
  namn: string | null
  loading: boolean
}

export function useForetag(): ForetagInfo {
  const [info, setInfo] = useState<ForetagInfo>({ logoUrl: null, namn: null, loading: true })

  useEffect(() => {
    let cancelled = false
    supabase
      .from('app_installningar')
      .select('foretag_logo_url, foretag_namn')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const row = data as ForetagRow | null
        setInfo({
          logoUrl: row?.foretag_logo_url || null,
          namn:    row?.foretag_namn    || null,
          loading: false,
        })
      })
    return () => { cancelled = true }
  }, [])

  return info
}
