import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'revtech_language'

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation()
  const current = i18n.language?.startsWith('en') ? 'en' : 'pt'

  function toggle(lang: 'en' | 'pt') {
    console.log('Language changed to:', lang)
    localStorage.setItem(STORAGE_KEY, lang)
    i18n.changeLanguage(lang)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
        <button
          onClick={() => toggle('pt')}
          title="Português"
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            current === 'pt' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'
          )}
        >
          🇧🇷
        </button>
        <button
          onClick={() => toggle('en')}
          title="English"
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            current === 'en' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'
          )}
        >
          🇬🇧
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      <button
        onClick={() => toggle('pt')}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          current === 'pt' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'
        )}
      >
        🇧🇷 <span>Português</span>
      </button>
      <button
        onClick={() => toggle('en')}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          current === 'en' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'
        )}
      >
        🇬🇧 <span>English</span>
      </button>
    </div>
  )
}
