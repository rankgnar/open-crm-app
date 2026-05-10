import { useEffect, useState } from 'react'
import { Sun, Moon, Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import { useI18n, LANGS, type Lang } from '../lib/i18n'
import { useForetag } from '../lib/foretag'

type Mode = 'set' | 'reset'
type LinkErrorKind = 'invalid' | 'expired' | null

interface Props {
  mode: Mode
}

const MIN_LENGTH = 8

export function PasswordPage({ mode }: Props) {
  const { theme, toggle } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { logoUrl, namn: foretagNamn } = useForetag()
  const ns = mode === 'set' ? 'setPassword' : 'resetPassword'

  const [sessionReady, setSessionReady] = useState(false)
  const [linkError, setLinkError] = useState<LinkErrorKind>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase parses the hash automatically (detectSessionInUrl: true default).
    // We just inspect for error_code in the hash and confirm a session exists.
    const hash = window.location.hash
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const errorCode = params.get('error_code')
    const errorDesc = params.get('error_description')

    if (errorCode === 'otp_expired' || errorDesc?.includes('expired')) {
      setLinkError('expired')
      setSessionReady(true)
      return
    }
    if (errorCode) {
      setLinkError('invalid')
      setSessionReady(true)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLinkError('invalid')
      }
      setSessionReady(true)
    })
  }, [])

  function clearActionUrl() {
    const url = new URL(window.location.href)
    url.searchParams.delete('action')
    url.hash = ''
    window.history.replaceState({}, '', url.pathname + url.search)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_LENGTH) {
      setError(t(`${ns}.errMin`))
      return
    }
    if (password !== confirm) {
      setError(t(`${ns}.errMismatch`))
      return
    }

    setSaving(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) {
        setError(updErr.message)
        return
      }
      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  function handleContinue() {
    clearActionUrl()
    // Reload so App re-evaluates auth + URL state from a clean slate.
    window.location.reload()
  }

  async function handleBackToLogin() {
    await supabase.auth.signOut()
    clearActionUrl()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col px-5 py-6 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(closest-side, var(--accent-soft), transparent 70%)' }}
      />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1 bg-surface/70 backdrop-blur border border-border rounded-full p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code as Lang)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                lang === l.code ? 'bg-fg text-bg' : 'text-muted hover:text-fg'
              }`}
              title={l.label}
            >
              <span className="mr-1">{l.flag}</span>
              <span className="uppercase">{l.code}</span>
            </button>
          ))}
        </div>
        <button
          onClick={toggle}
          className="icon-btn bg-surface/70 backdrop-blur border border-border"
          title={theme === 'dark' ? t('common.light') : t('common.dark')}
          aria-label={t('common.theme')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={foretagNamn ?? ''} className="h-16 max-w-[260px] object-contain mx-auto mb-4" />
            ) : (
              <img src="/branding/logo-opencrm-icon.png" alt="OpenCRM" className="inline-block h-14 w-14 object-contain mb-4" />
            )}
            <h1 className="text-2xl font-semibold text-fg tracking-tight">{t(`${ns}.title`)}</h1>
            <p className="text-sm text-muted mt-1.5">{t(`${ns}.description`)}</p>
          </div>

          {!sessionReady ? (
            <div className="card p-5 text-center">
              <p className="text-xs text-subtle">{t('common.loading')}</p>
            </div>
          ) : linkError ? (
            <div className="card p-5 flex flex-col gap-3">
              <div className="px-3 py-2 rounded-lg bg-danger-soft text-danger text-xs">
                {linkError === 'expired' ? t(`${ns}.errLinkExpired`) : t(`${ns}.errInvalidLink`)}
              </div>
              <button onClick={handleBackToLogin} className="btn btn-ghost text-sm">
                {t(`${ns}.backToLogin`)}
              </button>
            </div>
          ) : done ? (
            <div className="card p-5 flex flex-col gap-3 text-center">
              <CheckCircle2 size={32} className="mx-auto text-success" />
              <p className="text-sm text-fg">{t(`${ns}.success`)}</p>
              <button onClick={handleContinue} className="btn btn-primary group mt-1">
                {t(`${ns}.goToApp`)}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-3">
              <Field
                icon={<Lock size={15} />}
                type={showPassword ? 'text' : 'password'}
                placeholder={t(`${ns}.newPassword`)}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="p-2 text-subtle hover:text-fg transition-colors"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                    title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
              <Field
                icon={<Lock size={15} />}
                type={showConfirm ? 'text' : 'password'}
                placeholder={t(`${ns}.confirmPassword`)}
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="p-2 text-subtle hover:text-fg transition-colors"
                    aria-label={showConfirm ? t('login.hidePassword') : t('login.showPassword')}
                    title={showConfirm ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {error && (
                <div className="px-3 py-2 rounded-lg bg-danger-soft text-danger text-xs">{error}</div>
              )}

              <button type="submit" className="btn btn-primary mt-1 group" disabled={saving}>
                {saving ? t(`${ns}.submitting`) : t(`${ns}.submit`)}
                {!saving && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  trailing?: React.ReactNode
}

function Field({ icon, type, placeholder, value, onChange, autoComplete, required, trailing }: FieldProps) {
  return (
    <label className="relative block">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none">{icon}</span>
      <input
        className={`input pl-9 ${trailing ? 'pr-10' : ''}`}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
      />
      {trailing && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2">
          {trailing}
        </span>
      )}
    </label>
  )
}
