import { useState, useEffect } from 'react'
import { Check, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import {
  listInventarier, updateInventarieFields, createInventarie,
  type InventarieItem, type CreateInventarieInput,
} from '../lib/inventarier'
import { supabase } from '../lib/supabase'

const SKICK_OPTIONS = ['Bra', 'OK', 'Dålig', 'Trasig'] as const
const PLACERING_OPTIONS = ['Lager', 'Bilen', 'Kontor'] as const
const KATEGORI_OPTIONS = [
  'Elverktyg', 'Handverktyg', 'Mätinstrument', 'Skyddsutrustning',
  'Maskiner', 'Fordon', 'IT-utrustning', 'Kontorsmaterial', 'Övrigt',
] as const

function skickColor(s: string): string {
  switch (s) {
    case 'Bra':    return 'text-emerald-500'
    case 'OK':     return 'text-blue-500'
    case 'Dålig':  return 'text-amber-500'
    case 'Trasig': return 'text-red-500'
    default:       return 'text-muted'
  }
}

const EMPTY_FORM: CreateInventarieInput = {
  kategori: '', benamning: '', tillverkare_modell: '',
  serienr: '', antal: 1, skick: 'Bra', placering: '',
}

interface EditState { benamning: string; tillverkare_modell: string; serienr: string; antal: number; skick: string; placering: string }

export function InventeringTab() {
  const { t } = useI18n()
  const [items, setItems] = useState<InventarieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // inline edit state
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // create form state
  const [showCreate, setShowCreate] = useState(false)
  const [newForm, setNewForm] = useState<CreateInventarieInput>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listInventarier()
      .then((data) => { if (!cancelled) { setItems(data); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError((e as Error).message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  function toggleExpand(item: InventarieItem) {
    if (expanded === item.id) {
      setExpanded(null); setEditState(null); setSaveError(null)
    } else {
      setExpanded(item.id)
      setEditState({ benamning: item.benamning, tillverkare_modell: item.tillverkare_modell, serienr: item.serienr, antal: item.antal, skick: item.skick, placering: item.placering })
      setSaveError(null)
    }
    setSaving(false)
  }

  async function handleSave(item: InventarieItem) {
    if (!editState) return
    setSaving(true); setSaveError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await updateInventarieFields(item.id, editState, user?.id ?? '')
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, ...editState } : i))
      setSavedIds((prev) => new Set([...prev, item.id]))
      setExpanded(null); setEditState(null)
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.benamning.trim()) { setCreateError('Namn krävs'); return }
    setCreating(true); setCreateError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const created = await createInventarie(newForm, user?.id ?? '')
      setItems((prev) => [...prev, created])
      setNewForm(EMPTY_FORM)
      setShowCreate(false)
    } catch (e) {
      setCreateError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <p className="text-xs text-subtle text-center py-8">{t('common.loading')}</p>
  if (error)   return <p className="text-xs text-danger text-center py-8">{error}</p>

  const groups = items.reduce<Record<string, InventarieItem[]>>((acc, item) => {
    const key = item.kategori || '—'
    ;(acc[key] = acc[key] ?? []).push(item)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">

      {/* Create form */}
      {showCreate ? (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-fg">{t('inventering.newItem')}</p>
            <button onClick={() => { setShowCreate(false); setNewForm(EMPTY_FORM); setCreateError(null) }} className="icon-btn">
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="px-4 py-4 flex flex-col gap-3">
            {createError && <p className="text-xs text-danger">{createError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">Kategori</label>
                <select className="input text-sm" value={newForm.kategori}
                  onChange={(e) => setNewForm((f) => ({ ...f, kategori: e.target.value }))}>
                  <option value="">—</option>
                  {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.namn')} *</label>
                <input required className="input text-sm" value={newForm.benamning}
                  onChange={(e) => setNewForm((f) => ({ ...f, benamning: e.target.value }))}
                  placeholder="t.ex. Borrskruvdragare" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">Tillverkare / Modell</label>
                <input className="input text-sm" value={newForm.tillverkare_modell}
                  onChange={(e) => setNewForm((f) => ({ ...f, tillverkare_modell: e.target.value }))}
                  placeholder="t.ex. Makita DDF482" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">Serienr</label>
                <input className="input text-sm font-mono" value={newForm.serienr}
                  onChange={(e) => setNewForm((f) => ({ ...f, serienr: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.antal')}</label>
                <input type="number" min={0} className="input text-sm" value={newForm.antal}
                  onChange={(e) => setNewForm((f) => ({ ...f, antal: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.skick')}</label>
                <select className="input text-sm" value={newForm.skick}
                  onChange={(e) => setNewForm((f) => ({ ...f, skick: e.target.value }))}>
                  {SKICK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.placering')}</label>
                <select className="input text-sm" value={newForm.placering}
                  onChange={(e) => setNewForm((f) => ({ ...f, placering: e.target.value }))}>
                  <option value="">—</option>
                  {PLACERING_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={creating} className="btn btn-primary w-full mt-1">
              {creating ? t('inventering.saving') : t('inventering.create')}
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-ghost w-full flex items-center justify-center gap-2"
        >
          <Plus size={15} />
          {t('inventering.newItem')}
        </button>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-sm text-muted">{t('inventering.empty')}</p>
        </div>
      ) : (
        Object.entries(groups).map(([kategori, groupItems]) => (
          <div key={kategori}>
            <p className="text-[11px] uppercase tracking-widest text-muted mb-2 px-1">{kategori}</p>
            <ul className="card divide-y divide-border overflow-hidden">
              {groupItems.map((item) => {
                const isExpanded = expanded === item.id
                const isSaved = savedIds.has(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(item)}
                      className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-hover transition-colors"
                    >
                      <span className="text-xs text-subtle tabular-nums w-6 shrink-0 pt-0.5">{item.lopnr}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-fg font-medium truncate">{item.benamning}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSaved && <Check size={13} className="text-emerald-500" />}
                            {isExpanded ? <ChevronUp size={14} className="text-subtle" /> : <ChevronDown size={14} className="text-subtle" />}
                          </div>
                        </div>
                        {item.tillverkare_modell && (
                          <p className="text-[11px] text-subtle truncate">{item.tillverkare_modell}</p>
                        )}
                        {!isExpanded && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-muted">×{item.antal}</span>
                            <span className={`text-[11px] font-medium ${skickColor(item.skick)}`}>{item.skick}</span>
                            {item.placering && <span className="text-[11px] text-subtle">{item.placering}</span>}
                          </div>
                        )}
                      </div>
                    </button>

                    {isExpanded && editState && (
                      <div className="px-3 pb-3 bg-elevated" onClick={(e) => e.stopPropagation()}>
                        {saveError && <p className="text-xs text-danger mb-2">{saveError}</p>}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="col-span-2">
                            <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.namn')} *</label>
                            <input required className="input text-sm" value={editState.benamning}
                              onChange={(e) => setEditState((s) => s ? { ...s, benamning: e.target.value } : s)}
                              placeholder="t.ex. Borrskruvdragare" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">Tillverkare / Modell</label>
                            <input className="input text-sm" value={editState.tillverkare_modell}
                              onChange={(e) => setEditState((s) => s ? { ...s, tillverkare_modell: e.target.value } : s)}
                              placeholder="t.ex. Makita DDF482" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">Serienr</label>
                            <input className="input text-sm font-mono" value={editState.serienr}
                              onChange={(e) => setEditState((s) => s ? { ...s, serienr: e.target.value } : s)} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.antal')}</label>
                            <input type="number" min={0} className="input text-sm" value={editState.antal}
                              onChange={(e) => setEditState((s) => s ? { ...s, antal: Number(e.target.value) } : s)} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.skick')}</label>
                            <select className="input text-sm" value={editState.skick}
                              onChange={(e) => setEditState((s) => s ? { ...s, skick: e.target.value } : s)}>
                              {SKICK_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">{t('inventering.placering')}</label>
                            <select className="input text-sm" value={editState.placering}
                              onChange={(e) => setEditState((s) => s ? { ...s, placering: e.target.value } : s)}>
                              <option value="">—</option>
                              {PLACERING_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                        <button className="btn btn-primary w-full text-sm" disabled={saving}
                          onClick={() => void handleSave(item)}>
                          {saving ? t('inventering.saving') : t('inventering.save')}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
