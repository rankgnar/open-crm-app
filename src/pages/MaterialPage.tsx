import { useState, useEffect } from 'react'
import { Check, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PersonalRecord } from '../hooks/useAuth'
import { useI18n } from '../lib/i18n'
import { InventeringTab } from './InventeringTab'

interface Projekt { id: string; namn: string; projekt_nummer: string }

interface Props { personal: PersonalRecord }

export function MaterialPage({ personal }: Props) {
  const { t } = useI18n()
  const [view, setView] = useState<'form' | 'inventering'>('form')

  const [projekt, setProjekt] = useState<Projekt[]>([])
  const [projektId, setProjektId] = useState('')
  const [material, setMaterial] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autoLogEnabled, setAutoLogEnabled] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('projekt_personal')
      .select('projekt(id, namn, projekt_nummer)')
      .eq('personal_id', personal.id)
      .then(({ data }) => {
        if (cancelled) return
        const ps = (data ?? []).map((r) => (r as unknown as { projekt: Projekt }).projekt).filter(Boolean)
        setProjekt(ps)
        if (ps.length === 1) setProjektId(ps[0].id)
      })
    return () => { cancelled = true }
  }, [personal.id])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('aktivitetslogg_installningar')
      .select('aktiv')
      .eq('handelse', 'material_inskickad')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const row = data as { aktiv: boolean } | null
        setAutoLogEnabled(row?.aktiv ?? true)
      })
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!projektId) { setFormError(t('hours.errSelectProject')); return }
    const trimmed = material.trim()
    if (!trimmed) { setFormError(t('material.errEmptyList')); return }
    setSaving(true)
    try {
      if (!autoLogEnabled) {
        // Toggle off — accept the input but skip writing anything.
        setSuccess(true)
        setMaterial('')
        setTimeout(() => setSuccess(false), 3000)
        return
      }

      const today = new Date()
      const datumStr = today.toISOString().split('T')[0]
      const selected = projekt.find(p => p.id === projektId)
      const projektLabel = selected ? `${selected.projekt_nummer} — ${selected.namn}` : projektId

      // Anteckning in projekt feed
      const { error: noteErr } = await supabase.from('projekt_anteckningar').insert({
        projekt_id: projektId,
        titel: `Materialbehov — ${datumStr}`,
        innehall: `${trimmed}\n\n— ${personal.namn}`,
      })
      if (noteErr) { setFormError(noteErr.message); return }

      // Pending task in kalender (full-day, today)
      const start = new Date(today); start.setHours(0, 0, 0, 0)
      const slut  = new Date(today); slut.setHours(23, 59, 0, 0)
      const { error: evErr } = await supabase.from('kalender_events').insert({
        titel: `Material att beställa — ${selected?.projekt_nummer ?? ''}`.trim(),
        beskrivning: `${trimmed}\n\n— ${personal.namn} (${projektLabel})`,
        start: start.toISOString(),
        slut: slut.toISOString(),
        hel_dag: true,
        projekt_id: projektId,
        farg: '#f59e0b',
      })
      if (evErr) { setFormError(evErr.message); return }

      setSuccess(true)
      setMaterial('')
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const header = (
    <div className="flex gap-1 p-0.5 bg-elevated rounded-lg mb-3 shrink-0">
      <button
        onClick={() => setView('form')}
        className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          view === 'form' ? 'bg-surface text-fg shadow-[var(--shadow-sm)]' : 'text-muted hover:text-fg'
        }`}
      >
        {t('material.request')}
      </button>
      <button
        onClick={() => setView('inventering')}
        className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          view === 'inventering' ? 'bg-surface text-fg shadow-[var(--shadow-sm)]' : 'text-muted hover:text-fg'
        }`}
      >
        Inventarier
      </button>
    </div>
  )

  if (view === 'inventering') {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="px-4 pt-5 pb-6 max-w-lg mx-auto w-full">
          {header}
          <InventeringTab />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 px-4 pt-5 pb-6 max-w-lg mx-auto w-full min-h-0">
        {header}
        <form onSubmit={handleSubmit} className="card overflow-y-auto flex-1 flex flex-col min-h-0">

          {/* Project */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <label className="text-[11px] font-medium uppercase tracking-wider text-subtle block mb-1.5">
              {t('hours.project')}
            </label>
            {projekt.length === 0 ? (
              <p className="text-xs text-warn">{t('hours.noProjects')}</p>
            ) : (
              <select
                className="w-full bg-transparent text-sm text-fg outline-none cursor-pointer"
                value={projektId}
                onChange={(e) => setProjektId(e.target.value)}
                required
              >
                {projekt.length > 1 && <option value="">{t('hours.selectProject')}</option>}
                {projekt.map((p) => (
                  <option key={p.id} value={p.id}>{p.projekt_nummer} – {p.namn}</option>
                ))}
              </select>
            )}
          </div>

          {/* Material list */}
          <div className="px-4 py-3 border-b border-border flex-1 flex flex-col min-h-[200px]">
            <div className="flex items-center gap-2 mb-1.5 shrink-0">
              <Package size={14} className="text-subtle" />
              <label className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                {t('material.list')}
              </label>
            </div>
            <textarea
              className="w-full flex-1 bg-transparent text-sm text-fg outline-none resize-none placeholder:text-subtle min-h-[120px]"
              placeholder={t('material.listPlaceholder')}
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>

          {formError && (
            <div className="px-4 py-2.5 bg-danger-soft border-b border-border shrink-0">
              <p className="text-xs text-danger">{formError}</p>
            </div>
          )}

          {success && (
            <div className="px-4 py-2.5 bg-success-soft border-b border-border flex items-center gap-2 shrink-0">
              <Check size={13} className="text-success" />
              <p className="text-xs text-success">{t('material.submitted')}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !projektId || !material.trim()}
            className="mt-auto w-full py-4 text-base font-semibold bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('material.submitting') : t('material.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
