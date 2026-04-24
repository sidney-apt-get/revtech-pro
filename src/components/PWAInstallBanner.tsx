import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('revtech_pwa_dismissed')
    if (dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('revtech_pwa_dismissed', '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 rounded-2xl border border-border bg-card shadow-2xl p-4 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-4">
        <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-accent" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-text-primary">{t('pwa.installTitle')}</p>
          <p className="text-xs text-text-muted">{t('pwa.installDesc')}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleInstall}
          className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          {t('pwa.install')}
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface transition-colors"
        >
          {t('pwa.later')}
        </button>
      </div>
    </div>
  )
}
