import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Camera, Loader2, RefreshCw } from 'lucide-react'

export interface AIPhotoResult {
  category_slug?: string
  confidence?: number
  brand?: string
  model?: string
  year_manufactured?: number | null
  color?: string | null
  storage_gb?: number | null
  ram_gb?: number | null
  battery_mah?: number | null
  power_watts?: number | null
  screen_size_inches?: number | null
  cpu_model?: string | null
  gpu_model?: string | null
  serial_number?: string | null
  imei?: string | null
  visible_damage?: string[]
  suggested_defect?: string | null
  condition_grade?: string
  estimated_value_gbp?: number | null
  repair_complexity?: 'simple' | 'moderate' | 'complex' | 'unknown' | null
  notes?: string
}

interface Props {
  onResult: (result: AIPhotoResult, imageBase64: string) => void
  className?: string
}

type Stage = 'idle' | 'compressing' | 'analysing' | 'retrying'

const MAX_PX = 1280 // Higher resolution = better Gemini identification

function compressToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_PX || height > MAX_PX) {
        const ratio = Math.min(MAX_PX / width, MAX_PX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

async function callAnalyze(base64: string, mimeType: string) {
  return supabase.functions.invoke('ai-analyze', {
    body: { type: 'analyze_image', imageBase64: base64, mimeType },
  })
}

export function PhotoAnalyzeButton({ onResult, className }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  const isLoading = stage !== 'idle'

  async function handleFile(file: File) {
    setError(null)
    setStage('compressing')

    let base64: string
    let mimeType: string
    try {
      const compressed = await compressToBase64(file)
      base64 = compressed.base64
      mimeType = compressed.mimeType
    } catch {
      setError(t('ai_photo.error_generic'))
      setStage('idle')
      return
    }

    setStage('analysing')

    try {
      let { data, error: fnError } = await callAnalyze(base64, mimeType)

      // Auto-retry once on timeout
      if (!fnError && data?.error === 'timeout') {
        setStage('retrying')
        await new Promise(r => setTimeout(r, 1500))
        ;({ data, error: fnError } = await callAnalyze(base64, mimeType))
      }

      if (fnError) {
        console.error('[PhotoAnalyze] Edge function error:', fnError)
        setError(t('ai_photo.error_generic'))
        return
      }

      if (!data?.result) {
        const detail = data?.detail ?? data?.error ?? ''
        console.error('[PhotoAnalyze] No result:', data)
        if (data?.error === 'timeout') {
          setError(t('ai_photo.error_timeout'))
        } else if (detail) {
          setError(`${t('ai_photo.error')}: ${detail}`)
        } else {
          setError(t('ai_photo.error'))
        }
        return
      }

      onResult(data.result as AIPhotoResult, base64)
    } catch (e) {
      console.error('[PhotoAnalyze] Unexpected error:', e)
      setError(t('ai_photo.error_generic'))
    } finally {
      setStage('idle')
    }
  }

  function getLabel() {
    switch (stage) {
      case 'compressing': return t('ai_photo.compressing')
      case 'analysing':   return t('ai_photo.analysing')
      case 'retrying':    return t('ai_photo.retrying')
      default:            return t('ai_photo.button')
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-accent hover:bg-accent/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          stage === 'retrying'
            ? <RefreshCw className="h-4 w-4 animate-spin" />
            : <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        <span>{getLabel()}</span>
      </button>
      {error && (
        <p className="text-xs text-danger mt-1 leading-snug">{error}</p>
      )}
    </div>
  )
}
