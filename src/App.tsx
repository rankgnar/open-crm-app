import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { PasswordPage } from './pages/PasswordPage'
import { TidrapportPage } from './pages/TidrapportPage'
import { LedighetPage } from './pages/LedighetPage'
import { MaterialPage } from './pages/MaterialPage'
import { MerPage } from './pages/MerPage'
import { ChatPage } from './pages/ChatPage'
import { Layout } from './components/Layout'
import { useI18n } from './lib/i18n'
import { useBrandingInjector } from './lib/branding'

type Page = 'timmar' | 'ledighet' | 'material' | 'chat' | 'mer'

function readAction(): 'set-password' | 'reset-password' | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('action')
  return v === 'set-password' || v === 'reset-password' ? v : null
}

export function App() {
  useBrandingInjector()
  const { user, personal, loading, lookupError, signOut } = useAuth()
  const { t } = useI18n()
  const [page, setPage] = useState<Page>('timmar')

  const action = readAction()
  if (action === 'set-password') return <PasswordPage mode="set" />
  if (action === 'reset-password') return <PasswordPage mode="reset" />

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <p className="text-xs text-subtle">{t('common.loading')}</p>
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (!personal) {
    const errKey =
      lookupError === 'ambiguous' ? 'app.errorAmbiguous'
      : lookupError === 'inactive' ? 'app.errorInactive'
      : lookupError === 'unknown'  ? 'app.errorUnknown'
      :                              'app.errorNotFound'
    return (
      <div className="flex h-full items-center justify-center flex-col gap-3 px-8 text-center bg-bg">
        <p className="text-sm text-muted">{t(errKey, { email: user.email ?? '' })}</p>
        <p className="text-xs text-subtle">{t('app.contactAdmin')}</p>
        <button className="btn btn-ghost text-sm mt-2" onClick={signOut}>
          {t('common.logout')}
        </button>
      </div>
    )
  }

  return (
    <Layout personal={personal} page={page} onNavigate={setPage} onSignOut={signOut}>
      {page === 'timmar'   && <TidrapportPage personal={personal} />}
      {page === 'ledighet' && <LedighetPage personal={personal} />}
      {page === 'material' && <MaterialPage personal={personal} />}
      {page === 'chat'     && <ChatPage personal={personal} />}
      {page === 'mer'      && <MerPage personal={personal} />}
    </Layout>
  )
}
