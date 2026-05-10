import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { App } from './App'
import { ThemeProvider } from './lib/theme'
import { I18nProvider } from './lib/i18n'
import { applyBrandingFromCache } from './lib/branding'

applyBrandingFromCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
