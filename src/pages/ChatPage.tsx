import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import type { PersonalRecord } from '../hooks/useAuth'
import { useI18n } from '../lib/i18n'
import { listChat, markChatRead, sendChat, subscribeChat, type ChatMessage } from '../lib/chat'

interface Props { personal: PersonalRecord }

export function ChatPage({ personal }: Props) {
  const { t, lang } = useI18n()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [innehall, setInnehall] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    listChat(personal.id)
      .then((list) => {
        if (cancelled) return
        setMessages(list)
        setLoaded(true)
        if (!document.hidden) markChatRead(personal.id)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })

    const unsubscribe = subscribeChat(personal.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      if (!document.hidden) markChatRead(personal.id)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [personal.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = innehall.trim()
    if (!text || sending) return
    setError(null)
    setSending(true)
    try {
      const created = await sendChat(personal.id, text)
      setMessages((prev) => [...prev, created])
      setInnehall('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!loaded ? (
          <p className="text-xs text-subtle text-center py-8">{t('common.loading')}</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-subtle text-center py-8">{t('chat.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} lang={lang} />
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-danger-soft border-t border-border">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-3 py-3 border-t border-border bg-surface shrink-0"
      >
        <textarea
          rows={1}
          className="flex-1 bg-elevated border border-border rounded-2xl px-3.5 py-2.5 text-sm text-fg outline-none resize-none placeholder:text-subtle min-h-[40px] max-h-32"
          placeholder={t('chat.placeholder')}
          value={innehall}
          onChange={(e) => setInnehall(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit(e as unknown as React.FormEvent)
            }
          }}
        />
        <button
          type="submit"
          disabled={!innehall.trim() || sending}
          className="h-10 w-10 shrink-0 rounded-full bg-accent text-accent-fg flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
          aria-label={t('chat.send')}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

function Bubble({ message, lang }: { message: ChatMessage; lang: string }) {
  const own = !message.fran_admin
  return (
    <li className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
          own
            ? 'bg-accent text-accent-fg rounded-br-sm'
            : 'bg-elevated text-fg border border-border rounded-bl-sm'
        }`}
      >
        <p>{message.innehall}</p>
        <p className={`text-[10px] mt-1 tabular-nums ${own ? 'text-accent-fg/70' : 'text-subtle'}`}>
          {formatTime(message.skapad_at, lang)}
        </p>
      </div>
    </li>
  )
}

function formatTime(iso: string, lang: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const locale = lang === 'sv' ? 'sv-SE' : lang === 'pl' ? 'pl-PL' : 'en-GB'
  if (sameDay) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
