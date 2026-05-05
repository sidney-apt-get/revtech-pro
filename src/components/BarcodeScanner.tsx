import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

interface BarcodeScannerProps {
  onScan: (result: string) => void
  onClose: () => void
  title?: string
}

export function BarcodeScanner({ onScan, onClose, title = 'Scanner' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    navigator.mediaDevices.enumerateDevices()
      .then(allDevices => {
        const videoInputDevices = allDevices.filter(d => d.kind === 'videoinput') as MediaDeviceInfo[]
        setDevices(videoInputDevices)

        const backCamera = videoInputDevices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('traseira')
        )

        const deviceId =
          backCamera?.deviceId ||
          videoInputDevices[videoInputDevices.length - 1]?.deviceId ||
          videoInputDevices[0]?.deviceId ||
          ''

        setSelectedDevice(deviceId)
        startScanning(reader, deviceId)
      })
      .catch(err => {
        console.error('Error listing cameras:', err)
        setError('Não foi possível aceder às câmaras. Verifica as permissões.')
      })

    return () => {
      reader.reset()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startScanning(reader: BrowserMultiFormatReader, deviceId: string) {
    if (!videoRef.current || !deviceId) return

    setScanning(true)
    setError('')

    try {
      await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err: unknown) => {
        if (result) {
          const text = result.getText()
          if (navigator.vibrate) navigator.vibrate(100)
          onScan(text)
          reader.reset()
        }
        if (err && !(err instanceof NotFoundException)) {
          console.debug('Scan error:', err)
        }
      })
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      console.error('Camera error:', err)
      if (e.name === 'NotAllowedError') {
        setError('Permissão de câmara negada. Vai às definições do browser e permite o acesso à câmara.')
      } else if (e.name === 'NotFoundError') {
        setError('Nenhuma câmara encontrada neste dispositivo.')
      } else {
        setError('Erro ao iniciar câmara: ' + (e.message ?? 'desconhecido'))
      }
      setScanning(false)
    }
  }

  async function switchCamera(deviceId: string) {
    if (!readerRef.current) return
    readerRef.current.reset()
    setSelectedDevice(deviceId)
    await startScanning(readerRef.current, deviceId)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'black',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.8)',
      }}>
        <h2 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
          📷 {title}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {devices.length > 1 && (
            <select
              value={selectedDevice}
              onChange={e => switchCamera(e.target.value)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '12px',
              }}
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId} style={{ color: 'black' }}>
                  Câmara {i + 1}: {d.label.slice(0, 20) || `Câmara ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => { readerRef.current?.reset(); onClose() }}
            style={{
              color: 'white',
              fontSize: '24px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Video */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          autoPlay
          playsInline
          muted
        />

        {/* Scan overlay */}
        {scanning && !error && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: '260px',
              height: '260px',
              border: '3px solid #4F8EF7',
              borderRadius: '16px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              position: 'relative',
            }}>
              {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map(corner => (
                <div key={corner} style={{
                  position: 'absolute',
                  width: '20px',
                  height: '20px',
                  borderColor: '#4F8EF7',
                  borderStyle: 'solid',
                  ...(corner === 'topLeft' && { top: -3, left: -3, borderWidth: '3px 0 0 3px', borderRadius: '4px 0 0 0' }),
                  ...(corner === 'topRight' && { top: -3, right: -3, borderWidth: '3px 3px 0 0', borderRadius: '0 4px 0 0' }),
                  ...(corner === 'bottomLeft' && { bottom: -3, left: -3, borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 4px' }),
                  ...(corner === 'bottomRight' && { bottom: -3, right: -3, borderWidth: '0 3px 3px 0', borderRadius: '0 0 4px 0' }),
                }} />
              ))}
              <div style={{
                position: 'absolute',
                left: '10px',
                right: '10px',
                height: '2px',
                backgroundColor: '#4F8EF7',
                animation: 'scanLine 2s linear infinite',
                top: '50%',
              }} />
            </div>
          </div>
        )}

        {/* Bottom message */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: 0,
          right: 0,
          textAlign: 'center',
        }}>
          {error ? (
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.9)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '12px',
              margin: '0 16px',
              fontSize: '14px',
            }}>
              {error}
            </div>
          ) : (
            <p style={{
              color: 'white',
              fontSize: '14px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'inline-block',
            }}>
              Aponta para o código de barras, IMEI ou QR code
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 10px; }
          50% { top: calc(100% - 10px); }
          100% { top: 10px; }
        }
      `}</style>
    </div>
  )
}
