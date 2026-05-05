import { useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Scan, X, Loader2, Smartphone, CheckCircle2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScannerSession, type ScannerResult } from '@/hooks/useScannerSession'

interface ScannerButtonProps {
  onResult: (value: string, type: 'barcode' | 'photo' | 'cancelled') => void
  label?: string
  className?: string
}

export function ScannerButton({ onResult, label = 'Scan com Telemóvel', className }: ScannerButtonProps) {
  const [open, setOpen] = useState(false)

  const handleSessionResult = useCallback((result: ScannerResult) => {
    if (result.type !== 'cancelled') {
      onResult(result.value, result.type)
    }
    setTimeout(() => setOpen(false), 1500)
  }, [onResult])

  const { status, sessionUrl, timeLeft, timeFmt, start, close } = useScannerSession({
    onResult: handleSessionResult,
  })

  const openModal = async () => {
    setOpen(true)
    await start()
  }

  const handleClose = () => {
    close()
    setOpen(false)
  }

  const fmt_time = timeFmt

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openModal}
        className={cn('gap-1.5', className)}
      >
        <Scan className="h-4 w-4" />
        {label}
      </Button>

      {open && (
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

            {(status === 'waiting' || status === 'paired') && (
              <div className="text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-text-primary">Scan com Telemóvel</h3>
                  <p className="text-xs text-text-muted">
                    {status === 'waiting'
                      ? 'Aponta o telemóvel para o QR code'
                      : 'Telemóvel ligado — escolhe uma opção no telemóvel'}
                  </p>
                </div>

                <div className="flex justify-center">
                  {sessionUrl ? (
                    <div className={cn(
                      'p-3 bg-white rounded-xl border-2 transition-colors',
                      status === 'paired' ? 'border-success' : 'border-border'
                    )}>
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

                {status === 'paired' && (
                  <div className="flex items-center justify-center gap-2 text-success text-sm font-medium">
                    <Smartphone className="h-4 w-4" />
                    Telemóvel ligado — a aguardar scan
                  </div>
                )}

                <p className="text-xs text-text-muted">
                  Expira em{' '}
                  <span className={cn('font-mono font-bold', timeLeft < 120 ? 'text-danger' : 'text-accent')}>
                    {fmt_time}
                  </span>
                </p>
              </div>
            )}

            {status === 'result' && (
              <div className="text-center space-y-4 py-6">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
                <p className="font-semibold text-success text-lg">Resultado recebido!</p>
              </div>
            )}

            {status === 'expired' && (
              <div className="text-center space-y-4 py-4">
                <p className="font-semibold text-danger">Sessão expirada</p>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => start()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Novo QR code
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4 py-4">
                <p className="font-semibold text-danger">Erro ao criar sessão</p>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => start()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
