import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { analyzeWithGemini, type GeminiResult } from '@/lib/aiAnalysis'
import { Button } from '@/components/ui/button'
import { Camera, X, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartCameraButtonProps {
  context: 'project' | 'inventory'
  onResult: (result: GeminiResult, photoUrl: string) => void
  className?: string
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function SmartCameraButton({ context, onResult, className }: SmartCameraButtonProps) {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const [sessionUrl, setSessionUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'analyzing' | 'done' | 'error'>('idle')
  const [timeLeft, setTimeLeft] = useState(600)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleClose = useCallback(() => {
    cleanup()
    setModalOpen(false)
    setStatus('idle')
    setSessionUrl(null)
    setTimeLeft(600)
  }, [cleanup])

  const processPhoto = useCallback(async (photoUrl: string) => {
    setStatus('analyzing')
    try {
      const resp = await fetch(photoUrl)
      const blob = await resp.blob()
      const reader = new FileReader()
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })

      const result = await analyzeWithGemini(base64, blob.type || 'image/jpeg')
      if (result) {
        setStatus('done')
        onResult(result, photoUrl)
        setTimeout(handleClose, 1500)
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error('Photo processing error:', err)
      setStatus('error')
    }
  }, [onResult, handleClose])

  const startSession = useCallback(async () => {
    const token = generateToken()
    setStatus('waiting')
    setSessionUrl(null)
    setTimeLeft(600)

    const url = `${window.location.origin}/camera/${token}`
    console.log('Session token:', token)
    console.log('QR URL:', url)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('camera_sessions').insert({
        session_token: token,
        context,
        user_id: user!.id,
      })
      if (error) console.error('camera_sessions insert error:', error)
    } catch (err) {
      console.error('Session create error:', err)
    }

    // Set URL immediately — QRCodeSVG renders synchronously
    setSessionUrl(url)

    const ch = supabase
      .channel(`camera-${token}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'camera_sessions', filter: `session_token=eq.${token}` },
        (payload) => {
          const row = payload.new as { status: string; photo_url: string | null }
          if (row.status === 'photo_taken' && row.photo_url) {
            cleanup()
            processPhoto(row.photo_url)
          }
        }
      )
      .subscribe()
    channelRef.current = ch

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          cleanup()
          setStatus('idle')
          setModalOpen(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }, [context, cleanup, processPhoto])

  const handleLocalFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('analyzing')
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const result = await analyzeWithGemini(base64, file.type)
      if (result) {
        setStatus('done')
        onResult(result, URL.createObjectURL(file))
        setTimeout(handleClose, 1500)
      } else {
        setStatus('error')
      }
    }
    reader.readAsDataURL(file)
  }, [onResult, handleClose])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const openModal = async () => {
    setModalOpen(true)
    await startSession()
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openModal}
        className={cn('gap-1.5', className)}
      >
        <Camera className="h-4 w-4" />
        {t('ai.photographDevice')}
      </Button>

      {modalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 p-4"
          style={{ zIndex: 9999 }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {status === 'waiting' && (
              <div className="text-center space-y-4">
                <h3 className="font-semibold text-text-primary">{t('ai.qrTitle')}</h3>
                <p className="text-xs text-text-muted">{t('ai.qrDesc')}</p>

                <div className="flex justify-center">
                  {sessionUrl ? (
                    <div className="p-3 bg-white rounded-xl border border-border">
                      <QRCodeSVG
                        value={sessionUrl}
                        size={192}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center rounded-xl border border-border bg-surface">
                      <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-text-muted">
                  {t('ai.expiresIn')}{' '}
                  <span className={cn('font-mono font-bold', timeLeft < 60 ? 'text-danger' : 'text-accent')}>
                    {fmt(timeLeft)}
                  </span>
                </p>

                <div className="border-t border-border pt-3">
                  <p className="text-xs text-text-muted mb-2">{t('ai.orUploadLocal')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t('ai.uploadFromDevice')}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLocalFile}
                  />
                </div>
              </div>
            )}

            {status === 'analyzing' && (
              <div className="text-center space-y-4 py-4">
                <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto" />
                <div>
                  <p className="font-semibold text-text-primary">{t('ai.analyzing')}</p>
                  <p className="text-xs text-text-muted mt-1">{t('ai.analyzingDesc')}</p>
                </div>
              </div>
            )}

            {status === 'done' && (
              <div className="text-center space-y-4 py-4">
                <div className="text-4xl">✅</div>
                <p className="font-semibold text-success">{t('ai.analysisComplete')}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4 py-4">
                <div className="text-4xl">❌</div>
                <p className="font-semibold text-danger">{t('ai.analysisFailed')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startSession()}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('ai.retry')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
