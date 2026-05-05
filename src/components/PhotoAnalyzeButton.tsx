import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Camera, Loader2 } from 'lucide-react'

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
  notes?: string
}

interface Props {
  onResult: (result: AIPhotoResult, imageBase64: string) => void
  className?: string
}

function compressToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1024
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

export function PhotoAnalyzeButton({ onResult, className }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setAnalysing(true)
    try {
      const { base64, mimeType } = await compressToBase64(file)
      const { data, error: fnError } = await supabase.functions.invoke('ai-analyze', {
        body: { type: 'analyze_image', imageBase64: base64, mimeType },
      })
      if (fnError || !data?.result) {
        setError(t('ai_photo.error'))
        return
      }
      onResult(data.result as AIPhotoResult, base64)
    } catch {
      setError(t('ai_photo.error_generic'))
    } finally {
      setAnalysing(false)
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={analysing}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-accent hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {analysing
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Camera className="h-4 w-4" />
        }
        <span>{analysing ? t('ai_photo.analysing') : t('ai_photo.button')}</span>
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
