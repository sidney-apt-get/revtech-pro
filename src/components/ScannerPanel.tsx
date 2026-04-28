import { X, Smartphone } from 'lucide-react'
import { ScannerPairing } from '@/components/ScannerPairing'
import type { FilledFields } from '@/hooks/usePairedScanner'
import { cn } from '@/lib/utils'

interface ScannerPanelProps {
  open: boolean
  onClose: () => void
  onFieldsFilled: (fields: FilledFields) => void
}

export function ScannerPanel({ open, onClose, onFieldsFilled }: ScannerPanelProps) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={cn(
        'fixed top-0 right-0 h-full z-50 flex flex-col bg-[#1A1D27] border-l border-border shadow-2xl transition-transform duration-300',
        'w-[300px]',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-text-primary">Scanner Telemóvel</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ScannerPairing onFieldsFilled={onFieldsFilled} />

          <div className="mt-4 text-xs text-text-muted space-y-1 px-1">
            <p>• Liga o telemóvel como scanner permanente</p>
            <p>• Tira fotos ou escaneia códigos remotamente</p>
            <p>• A ligação persiste por 4 horas</p>
          </div>
        </div>
      </div>
    </>
  )
}
