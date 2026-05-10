import { useEffect, useMemo, useState } from 'react'
import { Check, X, Trash2, Clock, CalendarDays, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PersonalRecord } from '../hooks/useAuth'
import { useI18n } from '../lib/i18n'

type Status = 'inskickad' | 'godkänd' | 'nekad'

interface Tidrapport {
  id: string
  datum: string
  timmar: number
  incheckning: string | null
  utcheckning: string | null
  beskrivning: string | null
  status: Status
  projekt_id: string | null
  projekt?: { namn: string; projekt_nummer: string } | null
}

interface Ledighet {
  id: string
  typ: string
  startdatum: string
  slutdatum: string
  kommentar: string | null
  status: Status
}

type Filter = 'hours' | 'leave'

type Item =
  | { kind: 'hour';  date: string; sortKey: string; row: Tidrapport }
  | { kind: 'leave'; date: string; sortKey: string; row: Ledighet }

interface DayBlock  { date: string; items: Item[] }
interface MonthBlock { monthKey: string; days: DayBlock[] }

function countDays(start: string, end: string): number {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : '—' }

interface Props { personal: PersonalRecord }

export function HistorikPage({ personal }: Props) {
  const { t, locale } = useI18n()

  const [hours, setHours] = useState<Tidrapport[]>([])
  const [leaves, setLeaves] = useState<Ledighet[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('hours')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const STATUS_META = {
    inskickad: { label: t('status.pending'),  cls: 'badge-warn',    Icon: null  },
    'godkänd': { label: t('status.approved'), cls: 'badge-success', Icon: Check },
    nekad:     { label: t('status.denied'),   cls: 'badge-danger',  Icon: X     },
  } as const

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase
        .from('personal_tidrapport')
        .select('*, projekt(namn, projekt_nummer)')
        .eq('personal_id', personal.id)
        .order('datum', { ascending: false })
        .limit(180),
      supabase
        .from('personal_ledighet')
        .select('*')
        .eq('personal_id', personal.id)
        .order('startdatum', { ascending: false })
        .limit(180),
    ]).then(([{ data: hs }, { data: ls }]) => {
      if (cancelled) return
      setHours((hs ?? []) as Tidrapport[])
      setLeaves((ls ?? []) as Ledighet[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [personal.id])

  const months = useMemo<MonthBlock[]>(() => {
    const items: Item[] = []
    if (filter === 'hours') {
      for (const h of hours) items.push({ kind: 'hour', date: h.datum, sortKey: `${h.datum} ${h.id}`, row: h })
    } else {
      for (const l of leaves) items.push({ kind: 'leave', date: l.startdatum, sortKey: `${l.startdatum} ${l.id}`, row: l })
    }
    items.sort((a, b) => b.sortKey.localeCompare(a.sortKey))

    const out: MonthBlock[] = []
    for (const item of items) {
      const monthKey = item.date.slice(0, 7)
      let m = out[out.length - 1]
      if (!m || m.monthKey !== monthKey) {
        m = { monthKey, days: [] }
        out.push(m)
      }
      let d = m.days[m.days.length - 1]
      if (!d || d.date !== item.date) {
        d = { date: item.date, items: [] }
        m.days.push(d)
      }
      d.items.push(item)
    }
    return out
  }, [hours, leaves, filter])

  const stats = useMemo(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = now.getMonth()
    const approvedHoursMonth = hours
      .filter((h) => {
        const d = new Date(h.datum + 'T12:00:00')
        return d.getFullYear() === yyyy && d.getMonth() === mm && h.status === 'godkänd'
      })
      .reduce((s, h) => s + h.timmar, 0)

    const semesterDays = leaves
      .filter((l) => l.typ === 'semester' && l.status === 'godkänd' && new Date(l.startdatum + 'T12:00:00').getFullYear() === yyyy)
      .reduce((s, l) => s + countDays(l.startdatum, l.slutdatum), 0)

    return { approvedHoursMonth, semesterDays, year: yyyy }
  }, [hours, leaves])

  function fmtMonth(monthKey: string): string {
    const [yyyy, mm] = monthKey.split('-')
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, 1)
    const s = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  function fmtDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function dayHourTotal(items: Item[]): number {
    return items.reduce((s, i) => s + (i.kind === 'hour' ? i.row.timmar : 0), 0)
  }

  async function handleDelete(item: Item) {
    setDeletingId(item.row.id)
    if (item.kind === 'hour') {
      await supabase.from('personal_tidrapport').delete().eq('id', item.row.id)
      setHours((prev) => prev.filter((r) => r.id !== item.row.id))
    } else {
      await supabase.from('personal_ledighet').delete().eq('id', item.row.id)
      setLeaves((prev) => prev.filter((r) => r.id !== item.row.id))
    }
    setDeletingId(null)
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-4 pt-5 pb-6 max-w-lg mx-auto w-full space-y-4">

        {/* Stats — hidden individually when 0 */}
        {(stats.approvedHoursMonth > 0 || stats.semesterDays > 0) && (
          <div className={`grid gap-2.5 ${stats.approvedHoursMonth > 0 && stats.semesterDays > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {stats.approvedHoursMonth > 0 && (
              <StatCard
                icon={<Clock size={13} />}
                value={t('history.statHours', { n: stats.approvedHoursMonth.toFixed(1) })}
                label={t('history.statHoursLabel')}
              />
            )}
            {stats.semesterDays > 0 && (
              <StatCard
                icon={<CalendarDays size={13} />}
                value={t('history.statLeave', { n: stats.semesterDays })}
                label={t('history.statLeaveLabel', { year: stats.year })}
              />
            )}
          </div>
        )}

        {/* Filter — binary */}
        <div className="flex gap-1 p-0.5 bg-elevated rounded-lg">
          {(['hours', 'leave'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-surface text-fg shadow-[var(--shadow-sm)]'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {f === 'hours' ? t('history.filterHours') : t('history.filterLeave')}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <p className="text-xs text-subtle text-center py-8">{t('common.loading')}</p>
        ) : months.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-muted">
              {filter === 'hours' ? t('history.emptyHours') : t('history.emptyLeave')}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {months.map((m) => (
              <section key={m.monthKey}>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-subtle mb-2 px-1">
                  {fmtMonth(m.monthKey)}
                </h3>
                <div className="card divide-y divide-border overflow-hidden">
                  {m.days.map((d) => {
                    const total = dayHourTotal(d.items)
                    return (
                      <div key={d.date}>
                        <div className="flex items-baseline justify-between px-3 py-2 bg-elevated/40">
                          <span className="text-[11px] font-medium text-fg capitalize tabular-nums">
                            {fmtDay(d.date)}
                          </span>
                          {total > 0 && (
                            <span className="text-[11px] font-semibold text-muted tabular-nums">
                              {total.toFixed(1)} h
                            </span>
                          )}
                        </div>
                        <ul>
                          {d.items.map((item) => {
                            const s = STATUS_META[item.row.status]
                            const Icon = s.Icon
                            const canDelete = item.row.status === 'inskickad'
                            const isDeleting = deletingId === item.row.id
                            const isOpen = expanded.has(item.row.id)

                            if (item.kind === 'hour') {
                              const r = item.row
                              const hasDetail = !!r.projekt || !!r.beskrivning || canDelete
                              return (
                                <li key={`h-${r.id}`} className="border-t border-border first:border-t-0">
                                  <button
                                    type="button"
                                    onClick={() => hasDetail && toggleExpanded(r.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${hasDetail ? 'hover:bg-hover cursor-pointer' : 'cursor-default'} transition-colors`}
                                  >
                                    <span className="text-sm font-semibold text-fg tabular-nums shrink-0">
                                      {r.timmar.toFixed(1)} h
                                    </span>
                                    {(r.incheckning || r.utcheckning) && (
                                      <span className="text-[11px] font-mono text-subtle tabular-nums shrink-0">
                                        {fmtTime(r.incheckning)}–{fmtTime(r.utcheckning)}
                                      </span>
                                    )}
                                    <span className={`badge ${s.cls} shrink-0`}>
                                      {Icon && <Icon size={10} strokeWidth={2.5} />}
                                      {s.label}
                                    </span>
                                    <span className="flex-1" />
                                    {hasDetail && (
                                      <ChevronDown
                                        size={13}
                                        className={`text-subtle shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                      />
                                    )}
                                  </button>
                                  {isOpen && hasDetail && (
                                    <div className="px-3 pb-2.5 pt-0.5 space-y-1">
                                      {r.projekt && (
                                        <p className="text-[11px] text-muted">
                                          {r.projekt.projekt_nummer} · {r.projekt.namn}
                                        </p>
                                      )}
                                      {r.beskrivning && (
                                        <p className="text-[11px] text-subtle whitespace-pre-line">{r.beskrivning}</p>
                                      )}
                                      {canDelete && (
                                        <button
                                          onClick={() => handleDelete(item)}
                                          disabled={isDeleting}
                                          className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-muted hover:text-danger transition-colors"
                                        >
                                          <Trash2 size={12} />
                                          {t('common.delete')}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </li>
                              )
                            }

                            const r = item.row
                            const days = countDays(r.startdatum, r.slutdatum)
                            const dateRange = `${new Date(r.startdatum + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${new Date(r.slutdatum + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`
                            const hasDetail = !!r.kommentar || canDelete
                            return (
                              <li key={`l-${r.id}`} className="border-t border-border first:border-t-0">
                                <button
                                  type="button"
                                  onClick={() => hasDetail && toggleExpanded(r.id)}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${hasDetail ? 'hover:bg-hover cursor-pointer' : 'cursor-default'} transition-colors`}
                                >
                                  <span className="text-sm font-semibold text-fg shrink-0">
                                    {t(`leave.types.${r.typ}`)}
                                  </span>
                                  <span className="text-[11px] text-subtle tabular-nums shrink-0">
                                    {days} {days === 1 ? t('leave.dayUnit') : t('leave.daysUnit')}
                                  </span>
                                  <span className={`badge ${s.cls} shrink-0`}>
                                    {Icon && <Icon size={10} strokeWidth={2.5} />}
                                    {s.label}
                                  </span>
                                  <span className="flex-1" />
                                  {hasDetail && (
                                    <ChevronDown
                                      size={13}
                                      className={`text-subtle shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                  )}
                                </button>
                                {isOpen && hasDetail && (
                                  <div className="px-3 pb-2.5 pt-0.5 space-y-1">
                                    <p className="text-[11px] font-mono text-muted tabular-nums capitalize">
                                      {dateRange}
                                    </p>
                                    {r.kommentar && (
                                      <p className="text-[11px] text-subtle whitespace-pre-line">{r.kommentar}</p>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={() => handleDelete(item)}
                                        disabled={isDeleting}
                                        className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-muted hover:text-danger transition-colors"
                                      >
                                        <Trash2 size={12} />
                                        {t('common.delete')}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card p-3">
      <div className="text-subtle mb-1">{icon}</div>
      <div className="text-lg font-semibold text-fg tabular-nums leading-none">{value}</div>
      <div className="text-[10.5px] text-muted leading-tight mt-1">{label}</div>
    </div>
  )
}
