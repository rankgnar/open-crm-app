import { useEffect, useState } from 'react'
import { File, FileText, Image as ImageIcon, Download } from 'lucide-react'
import type { PersonalRecord } from '../hooks/useAuth'
import { useI18n } from '../lib/i18n'
import { HistorikPage } from './HistorikPage'
import {
  listDokument, getDokumentUrl,
  type PersonalDokument, type DokumentKategori,
} from '../lib/dokument'

interface Props { personal: PersonalRecord }

type Tab = 'historik' | 'dokument' | 'lonespec'

export function MerPage({ personal }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('historik')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'historik', label: t('mer.tabHistorik') },
    { key: 'dokument', label: t('mer.tabDokument') },
    { key: 'lonespec', label: t('mer.tabLonespec') },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 max-w-lg mx-auto w-full shrink-0">
        <div className="flex gap-1 p-0.5 bg-elevated rounded-lg">
          {TABS.map((s) => (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === s.key
                  ? 'bg-surface text-fg shadow-[var(--shadow-sm)]'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'historik' && <HistorikPage personal={personal} />}
        {tab === 'dokument' && <DokumentList personalId={personal.id} kategori="dokument" />}
        {tab === 'lonespec' && <DokumentList personalId={personal.id} kategori="lonespec" />}
      </div>
    </div>
  )
}

function DokumentList({ personalId, kategori }: { personalId: string; kategori: DokumentKategori }) {
  const { t, locale } = useI18n()
  const [items, setItems] = useState<PersonalDokument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listDokument(personalId, kategori)
      .then((rows) => { if (!cancelled) { setItems(rows); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError((e as Error).message); setLoading(false) } })
    return () => { cancelled = true }
  }, [personalId, kategori])

  async function handleOpen(d: PersonalDokument) {
    setOpeningId(d.id)
    try {
      const url = await getDokumentUrl(d.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-4 pt-3 pb-6 max-w-lg mx-auto w-full">
        {loading ? (
          <p className="text-xs text-subtle text-center py-8">{t('common.loading')}</p>
        ) : error ? (
          <p className="text-xs text-danger text-center py-8">{error}</p>
        ) : items.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-muted">
              {kategori === 'lonespec' ? t('mer.emptyLonespec') : t('mer.emptyDokument')}
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-border overflow-hidden">
            {items.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => handleOpen(d)}
                  disabled={openingId === d.id}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-hover transition-colors disabled:opacity-60"
                >
                  <FileIcon mime={d.mime_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">{d.filnamn}</p>
                    <p className="text-[11px] text-subtle tabular-nums">
                      {formatSize(d.storlek)} · {formatDate(d.skapad_at, locale)}
                    </p>
                  </div>
                  <Download size={14} className="text-subtle shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <ImageIcon size={18} className="text-blue-400 shrink-0" />
  if (mime === 'application/pdf') return <FileText size={18} className="text-red-400 shrink-0" />
  return <File size={18} className="text-muted shrink-0" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
