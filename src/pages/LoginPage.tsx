import { useState } from 'react'
import { Sun, Moon, Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme'
import { useI18n, LANGS, type Lang } from '../lib/i18n'
import { useForetag } from '../lib/foretag'

type Step = 'signin' | 'forgot' | 'forgotSent'

export function LoginPage() {
  const { theme, toggle } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { logoUrl, namn: foretagNamn, loading: foretagLoading } = useForetag()
  const [step, setStep] = useState<Step>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/?action=reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setStep('forgotSent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col px-5 py-6 relative overflow-hidden">
      {/* Decorative gradient blob */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none opacity-60"
        style={{
          background: 'radial-gradient(closest-side, var(--accent-soft), transparent 70%)',
        }}
      />

      {/* Top utility row */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1 bg-surface/70 backdrop-blur border border-border rounded-full p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code as Lang)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                lang === l.code
                  ? 'bg-fg text-bg'
                  : 'text-muted hover:text-fg'
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

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="text-center mb-8 min-h-[88px]">
            {!foretagLoading && (
              <>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={foretagNamn ?? ''}
                    className="h-16 max-w-[260px] object-contain mx-auto mb-4"
                  />
                ) : foretagNamn ? (
                  <h1 className="text-2xl font-semibold text-fg tracking-tight mb-4">
                    {foretagNamn}
                  </h1>
                ) : (
                  <img
                    src={theme === 'dark' ? '/branding/logo-opencrm-text-dark.png' : '/branding/logo-opencrm-text-light.png'}
                    alt="OpenCRM"
                    className="h-12 max-w-[220px] object-contain mx-auto mb-4"
                  />
                )}
                <p className="text-sm text-muted mt-1.5">
                  {t('login.tagline')}
                </p>
              </>
            )}
          </div>

          {/* Card */}
          {step === 'signin' && (
            <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-3">
              <Field
                icon={<Mail size={15} />}
                type="email"
                placeholder={t('login.email')}
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <Field
                icon={<Lock size={15} />}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.password')}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
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

              {error && (
                <div className="px-3 py-2 rounded-lg bg-danger-soft text-danger text-xs">{error}</div>
              )}

              <button type="submit" className="btn btn-primary mt-1 group" disabled={loading}>
                {loading ? t('login.signingIn') : t('login.signIn')}
                {!loading && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => { setStep('forgot'); setError(null) }}
                className="text-xs text-muted hover:text-fg transition-colors text-center mt-1"
              >
                {t('login.forgotPassword')}
              </button>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="card p-5 flex flex-col gap-3">
              <p className="text-xs text-muted">{t('login.forgotDescription')}</p>
              <Field
                icon={<Mail size={15} />}
                type="email"
                placeholder={t('login.email')}
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />

              {error && (
                <div className="px-3 py-2 rounded-lg bg-danger-soft text-danger text-xs">{error}</div>
              )}

              <button type="submit" className="btn btn-primary mt-1 group" disabled={loading}>
                {loading ? t('login.forgotSubmitting') : t('login.forgotSubmit')}
                {!loading && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => { setStep('signin'); setError(null) }}
                className="text-xs text-muted hover:text-fg transition-colors text-center mt-1 inline-flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} />
                {t('login.forgotBack')}
              </button>
            </form>
          )}

          {step === 'forgotSent' && (
            <div className="card p-5 flex flex-col gap-3 text-center">
              <p className="text-sm text-fg">{t('login.forgotSent', { email })}</p>
              <button
                type="button"
                onClick={() => { setStep('signin'); setError(null); setPassword('') }}
                className="btn btn-ghost text-sm inline-flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} />
                {t('login.forgotBack')}
              </button>
            </div>
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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none">
        {icon}
      </span>
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
