import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface ChatMessage {
  id: string
  personal_id: string
  fran_admin: boolean
  innehall: string
  skapad_at: string
}

const lastReadKey = (personalId: string) => `chat.lastRead.${personalId}`

export function getLastRead(personalId: string): string {
  return localStorage.getItem(lastReadKey(personalId)) ?? new Date(0).toISOString()
}

export function markChatRead(personalId: string): void {
  localStorage.setItem(lastReadKey(personalId), new Date().toISOString())
}

export async function countUnreadAdmin(personalId: string): Promise<number> {
  const lastRead = getLastRead(personalId)
  const { count, error } = await supabase
    .from('personal_chat')
    .select('id', { count: 'exact', head: true })
    .eq('personal_id', personalId)
    .eq('fran_admin', true)
    .gt('skapad_at', lastRead)
  if (error) return 0
  return count ?? 0
}

export function useChatUnread(personalId: string, active: boolean): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (active) {
      markChatRead(personalId)
      setCount(0)
    } else {
      void countUnreadAdmin(personalId).then((n) => {
        if (!cancelled) setCount(n)
      })
    }

    const channel = supabase
      .channel(`chat-unread-${personalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'personal_chat',
          filter: `personal_id=eq.${personalId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage
          if (!row.fran_admin) return
          if (active) {
            markChatRead(personalId)
            return
          }
          setCount((prev) => prev + 1)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [personalId, active])

  return count
}

export async function listChat(personalId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('personal_chat')
    .select('*')
    .eq('personal_id', personalId)
    .order('skapad_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ChatMessage[]
}

export async function sendChat(personalId: string, innehall: string): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('personal_chat')
    .insert({ personal_id: personalId, fran_admin: false, innehall })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as ChatMessage
}

export function subscribeChat(
  personalId: string,
  onInsert: (msg: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`chat-thread-${personalId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'personal_chat',
        filter: `personal_id=eq.${personalId}`,
      },
      (payload) => onInsert(payload.new as ChatMessage),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
