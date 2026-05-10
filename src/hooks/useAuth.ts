import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface PersonalRecord {
  id: string
  namn: string
  personal_nummer: string
  email: string | null
  supabase_user_id: string | null
  status: string
  timlön: number | null
  manadslön: number | null
  loneform: string | null
  roll: string | null
}

export type PersonalLookupError = 'not_found' | 'ambiguous' | 'inactive' | 'unknown'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [personal, setPersonal] = useState<PersonalRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [lookupError, setLookupError] = useState<PersonalLookupError | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPersonal(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setPersonal(null)
      setLookupError(null)
      if (session?.user) loadPersonal(session.user)
      else setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadPersonal(authUser: User) {
    setLookupError(null)

    // 1. Fast path: link already exists (RLS exposes only the user's own record).
    const { data: byId, error: idErr } = await supabase
      .from('personal')
      .select('*')
      .eq('supabase_user_id', authUser.id)
      .maybeSingle()

    if (idErr) { setLookupError('unknown'); setLoading(false); return }

    if (byId) {
      const rec = byId as PersonalRecord
      if (rec.status?.toLowerCase() === 'inaktiv') {
        setLookupError('inactive'); setLoading(false); return
      }
      setPersonal(rec)
      setLoading(false)
      return
    }

    // 2. Atomic server-side auto-link via SECURITY DEFINER RPC.
    //    The function enforces single-match, status='aktiv', and email parity.
    const { data: linkData, error: linkErr } = await supabase.rpc('link_personal_to_auth')

    if (linkErr) { setLookupError('unknown'); setLoading(false); return }

    const result = linkData as { status: string; record?: PersonalRecord } | null
    if (!result) { setLookupError('unknown'); setLoading(false); return }

    if (result.status === 'linked' && result.record) {
      setPersonal(result.record)
      setLoading(false)
      return
    }

    if (result.status === 'ambiguous') { setLookupError('ambiguous'); setLoading(false); return }
    if (result.status === 'inactive')  { setLookupError('inactive');  setLoading(false); return }
    setLookupError('not_found'); setLoading(false)
  }

  return {
    user,
    personal,
    loading,
    lookupError,
    signOut: () => supabase.auth.signOut(),
  }
}
