import { useState } from 'react'
import { translateText } from '@/lib/translateContent'

interface TranslateButtonProps {
  value: string
  targetLang: 'pt' | 'en'
  onTranslated: (text: string) => void
}

export function TranslateButton({ value, targetLang, onTranslated }: TranslateButtonProps) {
  const [translating, setTranslating] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [badge, setBadge] = useState(false)

  if (!value || value.trim().length < 5) return null

  async function handleTranslate() {
    setTranslating(true)
    setPreview(null)
    const result = await translateText(value, targetLang)
    setTranslating(false)
    if (result && result !== value) setPreview(result)
  }

  function apply() {
    if (!preview) return
    onTranslated(preview)
    setPreview(null)
    setBadge(true)
    setTimeout(() => setBadge(false), 5000)
  }

  return (
    <div className="mt-1 space-y-1">
      <button
        type="button"
        disabled={translating}
        onClick={handleTranslate}
        className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 disabled:opacity-50 transition-colors"
      >
        {translating ? '⏳ A traduzir...' : '🌐 Traduzir'}
      </button>

      {preview && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-2 space-y-1.5">
          <p className="text-xs text-text-primary">{preview}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              className="text-xs font-semibold text-accent hover:underline"
            >
              ✓ Usar esta
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {badge && !preview && (
        <p className="text-[10px] text-text-muted">🤖 Traduzido automaticamente — pode conter imprecisões</p>
      )}
    </div>
  )
}
