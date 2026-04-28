import { useState } from 'react'
import { BarcodeScanner } from './BarcodeScanner'
import { ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScanButtonProps {
  onScan: (code: string) => void
  label?: string
  className?: string
  title?: string
}

export function ScanButton({ onScan, label, className, title = 'Escanear código' }: ScanButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        title={title}
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 px-2 h-9 rounded-lg border border-border bg-surface text-text-muted hover:text-accent hover:border-accent/40 transition-colors shrink-0',
          className
        )}
      >
        <ScanLine className="h-4 w-4" />
        {label && <span className="text-sm">{label}</span>}
      </button>
      {open && (
        <BarcodeScanner
          onDetected={code => { onScan(code); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
