import { useState, useMemo } from 'react'
import { Check, CalendarDays, Plane, Sun, Thermometer, Baby } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PersonalRecord } from '../hooks/useAuth'
import { useI18n } from '../lib/i18n'

const TYP_KEYS = ['semester', 'ledig', 'sjuk', 'VAB'] as const
type TypKey = typeof TYP_KEYS[number]

const TYP_ICON: Record<TypKey, typeof Plane> = {
  semester: Plane,
  ledig:    Sun,
  sjuk:     Thermometer,
  VAB:      Baby,
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function countDays(start: string, end: string): number {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

interface Props { personal: PersonalRecord }

export function LedighetPage({ personal }: Props) {
  const { t } = useI18n()

  // Form
  const [typ, setTyp] = useState<TypKey>('semester')
  const [startdatum, setStartdatum] = useState(toDateStr(new Date()))
  const [slutdatum, setSlutdatum] = useState(toDateStr(addDays(new Date(), 1)))
  const [kommentar, setKommentar] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const typLabel = (key: string) => t(`leave.types.${key}`)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!startdatum || !slutdatum) { setFormError(t('leave.errDatesRequired')); return }
    if (new Date(slutdatum) < new Date(startdatum)) { setFormError(t('leave.errEndAfterStart')); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('personal_ledighet').insert({
        personal_id: personal.id,
        typ,
        startdatum,
        slutdatum,
        kommentar: kommentar.trim() || null,
        godkand: false,
        status: 'inskickad',
      })
      if (error) { setFormError(error.message); return }
      setSuccess(true)
      setKommentar('')
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const days = useMemo(() => {
    if (!startdatum || !slutdatum || new Date(slutdatum) < new Date(startdatum)) return 0
    return countDays(startdatum, slutdatum)
  }, [startdatum, slutdatum])

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 px-4 pt-5 pb-6 max-w-lg mx-auto w-full min-h-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-subtle mb-2.5 px-1 shrink-0">
          {t('leave.request')}
        </h2>
        <form onSubmit={handleSubmit} className="card overflow-hidden flex-1 flex flex-col min-h-0">

          {/* Type */}
          <div className="px-4 py-4 border-b border-border shrink-0">
            <label className="text-[11px] font-medium uppercase tracking-wider text-subtle block mb-3">
              {t('leave.type')}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {TYP_KEYS.map((key) => {
                const Icon = TYP_ICON[key]
                const active = typ === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTyp(key)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-lg border text-sm font-medium transition-colors ${
                      active
                        ? 'bg-accent text-accent-fg border-transparent'
                        : 'bg-elevated border-border text-muted hover:text-fg hover:border-border-strong'
                    }`}
                  >
                    <Icon size={22} strokeWidth={active ? 2 : 1.75} />
                    {typLabel(key)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border shrink-0">
            <div className="flex flex-col items-center px-3 py-5 gap-1.5 min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                {t('leave.from')}
              </span>
              <input
                type="date"
                lang="sv-SE"
                className="bg-transparent text-base font-semibold text-fg text-center outline-none w-full cursor-pointer tabular-nums"
                value={startdatum}
                onChange={(e) => setStartdatum(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col items-center px-3 py-5 gap-1.5 min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                {t('leave.to')}
              </span>
              <input
                type="date"
                lang="sv-SE"
                className="bg-transparent text-base font-semibold text-fg text-center outline-none w-full cursor-pointer tabular-nums"
                value={slutdatum}
                onChange={(e) => setSlutdatum(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Days summary */}
          <div className="flex items-center justify-center gap-2 py-4 border-b border-border bg-elevated/30 shrink-0">
            <CalendarDays size={16} className={days > 0 ? 'text-success' : 'text-subtle'} />
            {days > 0 ? (
              <span className="text-base font-semibold text-success tabular-nums">
                {days} {days === 1 ? t('leave.dayUnit') : t('leave.daysUnit')}
              </span>
            ) : (
              <span className="text-base text-subtle">— {t('leave.daysUnit')}</span>
            )}
          </div>

          {/* Comment */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <label className="text-[11px] font-medium uppercase tracking-wider text-subtle block mb-1.5">
              {t('leave.comment')}
            </label>
            <textarea
              rows={3}
              className="w-full bg-transparent text-sm text-fg outline-none resize-none placeholder:text-subtle"
              placeholder={t('leave.commentPlaceholder')}
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
            />
          </div>

          {formError && (
            <div className="px-4 py-2.5 bg-danger-soft border-b border-border">
              <p className="text-xs text-danger">{formError}</p>
            </div>
          )}

          {success && (
            <div className="px-4 py-2.5 bg-success-soft border-b border-border flex items-center gap-2">
              <Check size={13} className="text-success" />
              <p className="text-xs text-success">{t('leave.submitted')}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || days <= 0}
            className="mt-auto w-full py-4 text-base font-semibold bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('leave.submitting') : t('leave.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
