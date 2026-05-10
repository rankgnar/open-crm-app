import { useState, useEffect, useMemo, useRef } from 'react'
import { Check, ChevronLeft, ChevronRight, Clock as ClockIcon, Camera, X, Bus, Car } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PersonalRecord } from '../hooks/useAuth'
import { useI18n } from '../lib/i18n'

interface Projekt { id: string; namn: string; projekt_nummer: string }

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function calcHours(start: string, end: string, paustidMinuter: number): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm) - paustidMinuter
  return mins > 0 ? Math.round(mins * 10 / 60) / 10 : null
}

const PAUS_OPTIONS = [15, 30, 45, 60] as const
type PausOption = typeof PAUS_OPTIONS[number]

function safeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

interface Props { personal: PersonalRecord }

export function TidrapportPage({ personal }: Props) {
  const { t, locale } = useI18n()

  const [projekt, setProjekt] = useState<Projekt[]>([])

  // Form
  const [datum, setDatum] = useState(toDateStr(new Date()))
  const [incheckning, setIncheckning] = useState('08:00')
  const [utcheckning, setUtcheckning] = useState('17:00')
  const [paustidMinuter, setPaustidMinuter] = useState<PausOption>(15)
  const [projektId, setProjektId] = useState('')
  const [transportmedel, setTransportmedel] = useState<'kollektivtrafik' | 'firmabil' | ''>('')
  const [beskrivning, setBeskrivning] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [alreadyExists, setAlreadyExists] = useState(false)
  const [autoNoteEnabled, setAutoNoteEnabled] = useState(true)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoPreviews = useMemo(() => photos.map(f => URL.createObjectURL(f)), [photos])
  useEffect(() => () => { photoPreviews.forEach(URL.revokeObjectURL) }, [photoPreviews])

  const timmar = useMemo(
    () => calcHours(incheckning, utcheckning, paustidMinuter),
    [incheckning, utcheckning, paustidMinuter],
  )

  const fmtDateLong = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })

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

  // Read the aktivitetslogg toggle for auto-anteckning once on mount.
  useEffect(() => {
    let cancelled = false
    supabase
      .from('aktivitetslogg_installningar')
      .select('aktiv')
      .eq('handelse', 'tidrapport_inskickad')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const row = data as { aktiv: boolean } | null
        setAutoNoteEnabled(row?.aktiv ?? true)
      })
    return () => { cancelled = true }
  }, [])

  // Check if a tidrapport already exists for the selected date.
  useEffect(() => {
    let cancelled = false
    setAlreadyExists(false)
    supabase
      .from('personal_tidrapport')
      .select('id')
      .eq('personal_id', personal.id)
      .eq('datum', datum)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setAlreadyExists(!!data) })
    return () => { cancelled = true }
  }, [personal.id, datum, success])

  function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'))
    if (incoming.length > 0) setPhotos(prev => [...prev, ...incoming])
    e.target.value = ''
  }

  function handleRemovePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!timmar || timmar <= 0) { setFormError(t('hours.errEndAfterStart')); return }
    if (!projektId) { setFormError(t('hours.errSelectProject')); return }
    if (!transportmedel) { setFormError(t('hours.errSelectTransport')); return }
    if (!beskrivning.trim()) { setFormError(t('hours.errDescription')); return }
    setSaving(true)
    try {
      // Upload photos first (if any). Path: <projekt_id>/<timestamp>_<safe_name>
      const uploaded: { path: string; file: File }[] = []
      for (const file of photos) {
        const path = `${projektId}/${Date.now()}_${safeFilename(file.name)}`
        const { error } = await supabase.storage
          .from('projekt-dokument')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (error) {
          setFormError(t('hours.errUpload', { name: file.name }))
          return
        }
        uploaded.push({ path, file })
      }

      // Insert dokument metadata rows. Prefix filename with employee name for
      // immediate visibility in the CRM Dokument tab; uppladdad_av_personal_id
      // gives proper relational traceability.
      if (uploaded.length > 0) {
        const { error: docErr } = await supabase.from('projekt_dokument').insert(
          uploaded.map(({ path, file }) => ({
            projekt_id: projektId,
            filnamn: `[${personal.namn}] ${file.name}`,
            mime_type: file.type,
            storlek: file.size,
            storage_path: path,
            uppladdad_av_personal_id: personal.id,
          }))
        )
        if (docErr) { setFormError(docErr.message); return }
      }

      // Insert tidrapport
      const { error } = await supabase.from('personal_tidrapport').insert({
        personal_id: personal.id,
        projekt_id: projektId,
        datum,
        timmar,
        incheckning,
        utcheckning,
        paustid_minuter: paustidMinuter,
        typ: 'normal',
        beskrivning: beskrivning.trim(),
        transportmedel,
        status: 'inskickad',
      })

      if (error) { setFormError(error.message); return }

      // Best-effort log entry into the project's anteckningar feed.
      // Skipped entirely when the admin has turned the toggle off in Aktivitetslogg.
      if (autoNoteEnabled) {
        const transportLabel = transportmedel === 'firmabil' ? 'Firmabil' : 'Kollektivtrafik'
        const { error: noteErr } = await supabase.from('projekt_anteckningar').insert({
          projekt_id: projektId,
          titel: `Tidrapport — ${datum}`,
          innehall: `${beskrivning.trim()}\n\n— ${personal.namn} · ${timmar} h (${incheckning}–${utcheckning}) · ${transportLabel}`,
        })
        if (noteErr) console.error('Failed to insert anteckning:', noteErr)
      }

      setSuccess(true)
      setBeskrivning('')
      setPhotos([])
      setTransportmedel('')
      setPaustidMinuter(15)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 px-4 pt-5 pb-6 max-w-lg mx-auto w-full min-h-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-subtle mb-2.5 px-1 shrink-0">
          {t('hours.register')}
        </h2>
        <form onSubmit={handleSubmit} className="card overflow-y-auto flex-1 flex flex-col min-h-0">

          {/* Date row */}
          <div className="flex items-center justify-between px-3 py-5 border-b border-border bg-elevated/40">
            <button
              type="button"
              onClick={() => setDatum(toDateStr(addDays(new Date(datum + 'T12:00:00'), -1)))}
              className="icon-btn"
              aria-label="prev day"
            >
              <ChevronLeft size={18} />
            </button>
            <label htmlFor="datum-pick" className="flex flex-col items-center cursor-pointer">
              <input
                type="date"
                className="sr-only"
                id="datum-pick"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
              />
              <span className="text-base font-semibold text-fg capitalize hover:text-accent transition-colors">
                {fmtDateLong(datum)}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setDatum(toDateStr(addDays(new Date(datum + 'T12:00:00'), 1)))}
              className="icon-btn"
              aria-label="next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
            <div className="flex flex-col items-center px-3 py-6 gap-2 min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                {t('hours.checkIn')}
              </span>
              <input
                type="time"
                lang="sv-SE"
                step={60}
                className="bg-transparent text-xl font-semibold text-fg text-center outline-none w-full cursor-pointer tabular-nums"
                value={incheckning}
                onChange={(e) => setIncheckning(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col items-center px-3 py-6 gap-2 min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                {t('hours.checkOut')}
              </span>
              <input
                type="time"
                lang="sv-SE"
                step={60}
                className="bg-transparent text-xl font-semibold text-fg text-center outline-none w-full cursor-pointer tabular-nums"
                value={utcheckning}
                onChange={(e) => setUtcheckning(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Paus */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <label className="text-[10px] font-medium uppercase tracking-wider text-subtle block mb-2">
              {t('hours.break')}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PAUS_OPTIONS.map((opt) => {
                const active = paustidMinuter === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPaustidMinuter(opt)}
                    className={`py-2 rounded-lg border text-xs font-medium tabular-nums transition-colors ${
                      active
                        ? 'bg-accent text-accent-fg border-transparent'
                        : 'bg-elevated border-border text-muted hover:text-fg'
                    }`}
                  >
                    {opt} min
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hours summary */}
          <div className="flex items-center justify-center gap-2 py-4 border-b border-border bg-elevated/30">
            <ClockIcon size={16} className={timmar && timmar > 0 ? 'text-success' : 'text-subtle'} />
            {timmar && timmar > 0 ? (
              <span className="text-base font-semibold text-success tabular-nums">
                {timmar.toFixed(1)} {t('hours.hoursUnit')}
              </span>
            ) : (
              <span className="text-base text-subtle">— {t('hours.hoursUnit')}</span>
            )}
          </div>

          {/* Project */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <label className="text-[10px] font-medium uppercase tracking-wider text-subtle block mb-1.5">
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

          {/* Transport mode */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <label className="text-[10px] font-medium uppercase tracking-wider text-subtle block mb-2">
              {t('hours.transport')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransportmedel('kollektivtrafik')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  transportmedel === 'kollektivtrafik'
                    ? 'bg-accent text-accent-fg border-transparent'
                    : 'bg-elevated border-border text-muted hover:text-fg'
                }`}
              >
                <Bus size={16} />
                {t('hours.transportPublic')}
              </button>
              <button
                type="button"
                onClick={() => setTransportmedel('firmabil')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  transportmedel === 'firmabil'
                    ? 'bg-accent text-accent-fg border-transparent'
                    : 'bg-elevated border-border text-muted hover:text-fg'
                }`}
              >
                <Car size={16} />
                {t('hours.transportCar')}
              </button>
            </div>
          </div>

          {/* Photos */}
          {projektId && (
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                  {t('hours.photos')} <span className="text-subtle/70 normal-case tracking-normal">({t('hours.photosHint')})</span>
                </label>
                {photos.length > 0 && (
                  <span className="text-[11px] text-muted">
                    {t('hours.photoCount', { n: photos.length })}
                  </span>
                )}
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-elevated">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        aria-label="remove"
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-bg/80 text-fg flex items-center justify-center hover:bg-danger hover:text-accent-fg transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-muted hover:text-fg transition-colors"
              >
                <Camera size={14} />
                {t('hours.addPhotos')}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddPhotos}
              />
            </div>
          )}

          {/* Description */}
          <div className="px-4 py-3 border-b border-border flex-1 flex flex-col min-h-[120px]">
            <label className="text-[10px] font-medium uppercase tracking-wider text-subtle block mb-1.5 shrink-0">
              {t('hours.description')}
            </label>
            <textarea
              className="w-full flex-1 bg-transparent text-sm text-fg outline-none resize-none placeholder:text-subtle min-h-[80px]"
              placeholder={t('hours.descriptionPlaceholder')}
              value={beskrivning}
              onChange={(e) => setBeskrivning(e.target.value)}
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
              <p className="text-xs text-success">{t('hours.submitted')}</p>
            </div>
          )}

          {alreadyExists && !success && (
            <div className="px-4 py-2.5 bg-warn-soft border-b border-border">
              <p className="text-xs text-warn">{t('hours.alreadySubmitted')}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !timmar || timmar <= 0 || alreadyExists}
            className="w-full py-3.5 text-sm font-semibold bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('hours.submitting') : t('hours.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
