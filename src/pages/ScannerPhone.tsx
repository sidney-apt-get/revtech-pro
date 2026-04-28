import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'wouter'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { supabase } from '@/lib/supabase'

type Screen = 'loading' | 'ready' | 'photo_preview' | 'uploading' | 'sent' | 'barcode_scan' | 'barcode_confirm' | 'expired' | 'error'

function getDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  const android = ua.match(/Android .+?; ([^)]+)/)
  if (android) return android[1].split(';')[0].trim()
  return 'Telemóvel'
}

export default function ScannerPhone() {
  const { token } = useParams<{ token: string }>()
  const [screen, setScreen] = useState<Screen>('loading')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [detectedCode, setDetectedCode] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const codeConfirmedRef = useRef(false)

  const stopReader = useCallback(() => {
    readerRef.current?.reset()
  }, [])

  // Initialise: check session + mark as paired
  useEffect(() => {
    if (!token) { setScreen('error'); setErrorMsg('Token inválido'); return }
    ;(async () => {
      const { data: session } = await supabase
        .from('camera_sessions')
        .select('id,status,expires_at,session_type,paired')
        .eq('session_token', token)
        .single()

      if (!session) { setScreen('expired'); return }
      if (new Date(session.expires_at) < new Date()) { setScreen('expired'); return }

      // Mark as paired
      await supabase
        .from('camera_sessions')
        .update({
          paired: true,
          device_name: getDeviceName(),
          last_active: new Date().toISOString(),
          status: 'waiting',
        })
        .eq('session_token', token)

      // Check if we should jump directly to photo or barcode mode via hash
      const hash = window.location.hash
      if (hash === '#photo') {
        fileInputRef.current?.click()
      } else if (hash === '#barcode') {
        setScreen('barcode_scan')
        return
      }
      setScreen('ready')
    })()
    return () => { stopReader() }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Barcode scanner lifecycle
  useEffect(() => {
    if (screen !== 'barcode_scan') { stopReader(); return }
    if (!videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    codeConfirmedRef.current = false

    reader.listVideoInputDevices().then(devices => {
      const back = devices.find(d => /back|rear|environment/i.test(d.label))
      const deviceId = back?.deviceId ?? devices[0]?.deviceId
      if (!deviceId || !videoRef.current) return

      reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result && !codeConfirmedRef.current) {
          codeConfirmedRef.current = true
          reader.reset()
          setDetectedCode(result.getText())
          setScreen('barcode_confirm')
          try { navigator.vibrate?.(100) } catch {}
        }
        if (err && !(err instanceof NotFoundException)) { /* normal */ }
      }).catch(() => {
        setErrorMsg('Não foi possível aceder à câmara.')
        setScreen('error')
      })
    }).catch(() => {
      setErrorMsg('Sem acesso à câmara.')
      setScreen('error')
    })

    return () => { reader.reset() }
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoSelected = (file: File) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setScreen('photo_preview')
  }

  const sendPhoto = async () => {
    if (!photoFile || !token) return
    setScreen('uploading')
    try {
      const ext = photoFile.name.split('.').pop() ?? 'jpg'
      const path = `scanner/${token}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('camera-photos')
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('camera-photos').getPublicUrl(path)

      await supabase
        .from('camera_sessions')
        .update({
          photo_url: urlData.publicUrl,
          status: 'photo_taken',
          last_active: new Date().toISOString(),
          barcode: null,
        })
        .eq('session_token', token)

      setScreen('sent')
      // Reset after 3s to allow next photo
      setTimeout(() => {
        setPhotoFile(null)
        setPhotoPreview(null)
        setScreen('ready')
      }, 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar')
      setScreen('error')
    }
  }

  const useCode = async () => {
    if (!detectedCode || !token) return
    await supabase
      .from('camera_sessions')
      .update({
        barcode: detectedCode,
        last_active: new Date().toISOString(),
        status: 'waiting',
      })
      .eq('session_token', token)
    setDetectedCode(null)
    codeConfirmedRef.current = false
    setScreen('ready')
  }

  const Btn = ({ onClick, children, secondary = false, className = '' }: {
    onClick: () => void; children: React.ReactNode; secondary?: boolean; className?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[80px] rounded-2xl text-lg font-semibold transition-colors flex flex-col items-center justify-center gap-2
        ${secondary
          ? 'border border-[#2A2D3A] bg-[#1A1D27] text-[#8B8FA8] active:bg-[#2A2D3A]'
          : 'bg-[#4F8EF7] hover:bg-[#3B7AE3] active:bg-[#2E6AD0] text-white'
        } ${className}`}
    >
      {children}
    </button>
  )

  return (
    <div
      className="min-h-screen flex flex-col bg-[#0F1117] text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-[#1E2030]">
        <div className="h-8 w-8 rounded-lg bg-[#4F8EF7] flex items-center justify-center text-sm font-bold">R</div>
        <div>
          <p className="text-sm font-bold leading-tight">RevTech Scanner</p>
          <p className="text-xs text-[#8B8FA8]">Livingston · Sidney N.</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Ligado
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5">

        {/* LOADING */}
        {screen === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-[#4F8EF7] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* READY */}
        {screen === 'ready' && (
          <div className="flex-1 flex flex-col justify-center gap-4">
            <Btn onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*'
                fileInputRef.current.setAttribute('capture', 'environment')
                fileInputRef.current.click()
              }
            }}>
              <span className="text-3xl">📷</span>
              <span>Fotografar Produto</span>
            </Btn>

            <Btn onClick={() => setScreen('barcode_scan')} secondary>
              <span className="text-3xl">🔍</span>
              <span>Escanear Código / IMEI</span>
            </Btn>

            <p className="text-center text-xs text-[#8B8FA8] mt-4">
              🟢 Ligado ao formulário · Pronto para usar
            </p>
          </div>
        )}

        {/* PHOTO PREVIEW */}
        {screen === 'photo_preview' && photoPreview && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-sm text-[#8B8FA8]">Pré-visualização</p>
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full rounded-2xl object-cover"
              style={{ maxHeight: '55vh' }}
            />
            <div className="flex flex-col gap-3 mt-auto">
              <Btn onClick={sendPhoto}>✅ Enviar esta foto</Btn>
              <Btn secondary onClick={() => {
                setPhotoFile(null)
                setPhotoPreview(null)
                setScreen('ready')
              }}>🔄 Tirar outra</Btn>
            </div>
          </div>
        )}

        {/* UPLOADING */}
        {screen === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-12 w-12 border-2 border-[#4F8EF7] border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-semibold">A enviar foto...</p>
          </div>
        )}

        {/* SENT */}
        {screen === 'sent' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-6xl">📤</span>
            <p className="text-xl font-bold text-green-400">Enviado!</p>
            <p className="text-[#8B8FA8]">A analisar com IA...</p>
            <p className="text-sm text-[#8B8FA8]">Podes tirar outra foto daqui a pouco</p>
          </div>
        )}

        {/* BARCODE SCAN */}
        {screen === 'barcode_scan' && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="relative bg-black rounded-2xl overflow-hidden" style={{ height: '55vw', minHeight: 200 }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-2/3 border-2 border-[#4F8EF7]/70 rounded-xl relative">
                  <span className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-[#4F8EF7] rounded-tl" />
                  <span className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-[#4F8EF7] rounded-tr" />
                  <span className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-[#4F8EF7] rounded-bl" />
                  <span className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-[#4F8EF7] rounded-br" />
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-[#4F8EF7]/60"
                    style={{ animation: 'scan 2s linear infinite', top: '50%' }}
                  />
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-[#8B8FA8]">Aponta para um código de barras, QR, EAN ou IMEI</p>
            <Btn secondary onClick={() => { stopReader(); setScreen('ready') }}>
              ← Voltar
            </Btn>
          </div>
        )}

        {/* BARCODE CONFIRM */}
        {screen === 'barcode_confirm' && detectedCode && (
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="rounded-2xl border border-[#2A2D3A] bg-[#1A1D27] p-5 text-center space-y-2">
              <p className="text-sm text-[#8B8FA8]">Código detectado</p>
              <p className="text-2xl font-bold font-mono break-all text-[#4F8EF7]">{detectedCode}</p>
            </div>
            <Btn onClick={useCode}>✅ Usar este código</Btn>
            <Btn secondary onClick={() => {
              setDetectedCode(null)
              codeConfirmedRef.current = false
              setScreen('barcode_scan')
            }}>🔄 Escanear outro</Btn>
          </div>
        )}

        {/* EXPIRED */}
        {screen === 'expired' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-6xl">⏰</span>
            <p className="text-xl font-bold text-yellow-400">Sessão expirada</p>
            <p className="text-[#8B8FA8] text-sm">Gera um novo código QR no RevTech.</p>
          </div>
        )}

        {/* ERROR */}
        {screen === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-6xl">❌</span>
            <p className="text-xl font-bold text-red-400">Erro</p>
            <p className="text-[#8B8FA8] text-sm">{errorMsg}</p>
            <Btn secondary onClick={() => setScreen('ready')}>Tentar novamente</Btn>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handlePhotoSelected(file)
          e.target.value = ''
        }}
      />

      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  )
}
