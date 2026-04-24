import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { X, Camera, CameraOff, CheckCircle } from 'lucide-react'

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
  title?: string
}

export function BarcodeScanner({ onDetected, onClose, title = 'Scanner' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState<string | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader()
    readerRef.current = codeReader

    codeReader.listVideoInputDevices().then(devices => {
      setCameras(devices)
      // Prefer back camera on mobile
      const back = devices.find(d => /back|rear|environment/i.test(d.label))
      const defaultId = back?.deviceId ?? devices[0]?.deviceId
      setSelectedCamera(defaultId)
    }).catch(() => setError('Sem acesso à câmara'))

    return () => {
      codeReader.reset()
    }
  }, [])

  useEffect(() => {
    if (!selectedCamera || !videoRef.current || !readerRef.current) return
    const reader = readerRef.current

    reader.decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
      if (result) {
        const text = result.getText()
        setDetected(text)
        try { navigator.clipboard.writeText(text) } catch {}
        reader.reset()
        setTimeout(() => {
          onDetected(text)
          onClose()
        }, 800)
      }
      if (err && !(err instanceof NotFoundException)) {
        // ignore decode errors — normal when no barcode in frame
      }
    }).catch(() => setError('Não foi possível aceder à câmara. Verifica as permissões.'))

    return () => {
      reader.reset()
    }
  }, [selectedCamera]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-card border border-border overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-text-primary">{title}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera feed */}
        <div className="relative bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

          {/* Crosshair overlay */}
          {!detected && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-32 border-2 border-accent/70 rounded-lg relative">
                <span className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-accent rounded-tl" />
                <span className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-accent rounded-tr" />
                <span className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-accent rounded-bl" />
                <span className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-accent rounded-br" />
                {/* Scan line animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-accent/60 animate-[scan_2s_linear_infinite]" style={{ top: '50%' }} />
              </div>
            </div>
          )}

          {/* Detected overlay */}
          {detected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-success/20 backdrop-blur-sm">
              <CheckCircle className="h-12 w-12 text-success mb-2" />
              <p className="text-success font-semibold text-sm px-4 text-center break-all">{detected}</p>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <CameraOff className="h-10 w-10 text-danger mb-2" />
              <p className="text-danger text-xs text-center px-4">{error}</p>
            </div>
          )}
        </div>

        {/* Camera selector + hint */}
        <div className="px-4 py-3 space-y-2">
          {cameras.length > 1 && (
            <select
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {cameras.map(c => (
                <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmara ${c.deviceId.slice(0, 6)}`}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-text-muted text-center">Aponta a câmara para um código de barras ou QR code</p>
        </div>
      </div>
    </div>
  )
}
