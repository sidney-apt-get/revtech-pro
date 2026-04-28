import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { usePairedScanner, type FilledFields } from '@/hooks/usePairedScanner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Smartphone, Wifi, WifiOff, Camera, ScanLine, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ScannerPairingProps {
  onFieldsFilled: (fields: FilledFields) => void
}

export function ScannerPairing({ onFieldsFilled }: ScannerPairingProps) {
  const { t, i18n } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const {
    state, token, deviceName, lastActive,
    fieldCount, confidence, detectedProduct, progress,
    createPairingSession, disconnect, newPhoto,
  } = usePairedScanner(onFieldsFilled)

  const locale = i18n.language === 'pt' ? ptBR : undefined
  const lastActiveStr = lastActive
    ? formatDistanceToNow(lastActive, { addSuffix: true, locale })
    : null

  const scannerUrl = token ? `${window.location.origin}/scanner/${token}` : ''

  const confidenceLabel =
    confidence >= 90 ? t('scanner.confidenceHigh') :
    confidence >= 70 ? t('scanner.confidenceMed') :
    t('scanner.confidenceLow')

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all duration-300',
      state === 'waiting' && 'border-accent/40 animate-pulse-border',
      state === 'paired' && 'border-green-500/40',
      state === 'analysing' && 'border-accent/60',
      state === 'done' && 'border-green-500/60',
      (state === 'idle') && 'border-border',
    )} style={{ background: '#1A1D27' }}>
      {/* Header — sempre visível */}
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Smartphone className={cn(
            'h-4 w-4',
            state === 'paired' || state === 'done' ? 'text-green-400' :
            state === 'waiting' || state === 'analysing' ? 'text-accent' :
            'text-text-muted'
          )} />
          <span className="text-sm font-semibold text-text-primary">
            {state === 'paired' || state === 'done'
              ? t('scanner.connected')
              : t('scanner.connect_phone')}
          </span>
          {state === 'paired' && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              {deviceName ?? t('scanner.connected_subtitle')}
            </span>
          )}
          {state === 'waiting' && (
            <span className="text-xs text-text-muted animate-pulse">{t('scanner.waiting')}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40">
          {/* IDLE */}
          {state === 'idle' && (
            <div className="p-4 text-center space-y-3">
              <p className="text-sm text-text-muted">{t('scanner.point_camera')}</p>
              <button
                type="button"
                onClick={createPairingSession}
                className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Wifi className="h-4 w-4" />
                {t('scanner.connect_phone')}
              </button>
            </div>
          )}

          {/* WAITING — QR code */}
          {state === 'waiting' && scannerUrl && (
            <div className="p-4 flex flex-col items-center gap-3">
              <div className="p-3 bg-white rounded-xl border border-border">
                <QRCodeSVG
                  value={scannerUrl}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#0F1117"
                  level="M"
                  imageSettings={{
                    src: '/logo192.png',
                    height: 28,
                    width: 28,
                    excavate: true,
                  }}
                />
              </div>
              <p className="text-xs text-text-muted text-center">{t('scanner.point_camera')}</p>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className="h-2 w-2 rounded-full bg-text-muted/40 animate-pulse" />
                {t('scanner.waiting')}
              </div>
              <button
                type="button"
                onClick={disconnect}
                className="text-xs text-text-muted hover:text-danger transition-colors"
              >
                {t('scanner.disconnect')}
              </button>
            </div>
          )}

          {/* PAIRED */}
          {state === 'paired' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Wifi className="h-4 w-4" />
                <span className="font-medium">{deviceName ?? t('scanner.connected_subtitle')}</span>
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse ml-auto" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`${scannerUrl}#photo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-border bg-surface/50 hover:border-accent/40 hover:bg-accent/5 transition-colors text-text-muted hover:text-accent"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs font-medium">{t('scanner.take_photo')}</span>
                </a>
                <a
                  href={`${scannerUrl}#barcode`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-border bg-surface/50 hover:border-accent/40 hover:bg-accent/5 transition-colors text-text-muted hover:text-accent"
                >
                  <ScanLine className="h-5 w-5" />
                  <span className="text-xs font-medium">{t('scanner.scan_code')}</span>
                </a>
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted">
                {lastActiveStr && <span>{t('scanner.last_scan', { time: lastActiveStr })}</span>}
                <button
                  type="button"
                  onClick={disconnect}
                  className="ml-auto flex items-center gap-1 hover:text-danger transition-colors"
                >
                  <WifiOff className="h-3 w-3" />
                  {t('scanner.disconnect')}
                </button>
              </div>
            </div>
          )}

          {/* ANALYSING */}
          {state === 'analysing' && (
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium text-text-primary">{t('scanner.analysing')}</p>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted">{progress}%</p>
              </div>
            </div>
          )}

          {/* DONE */}
          {state === 'done' && (
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-green-400 text-lg">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {t('scanner.fields_filled', { count: fieldCount })}
                  </p>
                  {confidence > 0 && (
                    <p className="text-xs text-text-muted">
                      {t('scanner.confidence', { percent: Math.round(confidence * 100) })} — {confidenceLabel}
                    </p>
                  )}
                  {detectedProduct && (
                    <p className="text-xs text-accent mt-0.5 truncate">
                      {t('scanner.detected', { product: detectedProduct })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={newPhoto}
                  className="flex-1 py-2 rounded-lg border border-border bg-surface/50 hover:bg-surface text-xs font-medium text-text-muted hover:text-text-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('scanner.new_photo')}
                </button>
                <button
                  type="button"
                  onClick={disconnect}
                  className="px-3 py-2 rounded-lg border border-border bg-surface/50 hover:border-danger/40 hover:text-danger text-xs text-text-muted transition-colors"
                >
                  {t('scanner.disconnect')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
