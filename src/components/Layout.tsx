import { useEffect, useRef, useState } from 'react'
import { Clock, CalendarDays, Package, MessageCircle, MoreHorizontal, LogOut, Sun, Moon, Check } from 'lucide-react'
import type { PersonalRecord } from '../hooks/useAuth'
import { useTheme } from '../lib/theme'
import { useI18n, LANGS, type Lang } from '../lib/i18n'
import { useForetag } from '../lib/foretag'
import { useChatUnread } from '../lib/chat'

type Page = 'timmar' | 'ledighet' | 'material' | 'chat' | 'mer'

interface Props {
  personal: PersonalRecord
  page: Page
  onNavigate: (page: Page) => void
  onSignOut: () => void
  children: React.ReactNode
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function Layout({ personal, page, onNavigate, onSignOut, children }: Props) {
  const { t } = useI18n()
  const { theme, toggle: toggleTheme } = useTheme()
  const { logoUrl, namn: foretagNamn } = useForetag()
  const chatUnread = useChatUnread(personal.id, page === 'chat')

  const NAV: { key: Page; label: string; Icon: typeof Clock; badge?: number }[] = [
    { key: 'timmar',   label: t('nav.hours'),    Icon: Clock },
    { key: 'ledighet', label: t('nav.leave'),    Icon: CalendarDays },
    { key: 'material', label: t('nav.material'), Icon: Package },
    { key: 'chat',     label: t('nav.chat'),     Icon: MessageCircle, badge: chatUnread },
    { key: 'mer',      label: t('nav.more'),     Icon: MoreHorizontal },
  ]

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-bg">
      {/* Top bar */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-md shrink-0 sticky top-0 z-10">
        <div className="justify-self-start min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={foretagNamn ?? ''}
              className="h-9 max-w-[120px] object-contain"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-accent-soft text-accent flex items-center justify-center text-sm font-semibold">
              {initials(personal.namn)}
            </div>
          )}
        </div>

        <p className="text-sm font-semibold text-fg truncate text-center min-w-0">
          {personal.namn}
        </p>

        <div className="justify-self-end flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="icon-btn"
            title={theme === 'dark' ? t('common.light') : t('common.dark')}
            aria-label={t('common.theme')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <SettingsMenu />
          <button
            onClick={onSignOut}
            className="icon-btn"
            title={t('common.logout')}
            aria-label={t('common.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="flex border-t border-border bg-surface shrink-0 safe-area-pb">
        {NAV.map(({ key, label, Icon, badge }) => {
          const active = page === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-3 transition-colors relative"
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-10 rounded-full bg-accent"
                />
              )}
              <span className="relative inline-flex">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.25 : 1.75}
                  className={active ? 'text-accent' : 'text-subtle'}
                />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-400 px-1 text-[9px] font-semibold leading-none text-white tabular-nums">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span
                className={`text-[10.5px] font-medium ${
                  active ? 'text-fg' : 'text-subtle'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function SettingsMenu() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="icon-btn"
        title={t('common.language')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-base leading-none">
          {LANGS.find((l) => l.code === lang)?.flag ?? '🇸🇪'}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 card overflow-hidden shadow-[var(--shadow-lg)] z-20"
        >
          <div className="px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-subtle mb-1.5">
              {t('common.language')}
            </p>
            <div className="flex flex-col">
              {LANGS.map((l) => (
                <LangOption
                  key={l.code}
                  active={lang === l.code}
                  onClick={() => { setLang(l.code as Lang); setOpen(false) }}
                  flag={l.flag}
                  label={l.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LangOption({
  active, onClick, flag, label,
}: {
  active: boolean
  onClick: () => void
  flag: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
        active ? 'text-fg' : 'text-muted hover:text-fg hover:bg-hover'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="text-base leading-none">{flag}</span>
        <span>{label}</span>
      </span>
      {active && <Check size={14} className="text-accent" />}
    </button>
  )
}
