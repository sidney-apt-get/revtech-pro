import { BarcodeScanner } from '@/components/BarcodeScanner'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function MobileScanner() {
  const [lastCode, setLastCode] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 gap-4">
      {lastCode ? (
        <>
          <CheckCircle2 className="h-16 w-16 text-success" />
          <p className="text-xl font-semibold text-text-primary">Código detectado</p>
          <p className="text-sm font-mono bg-surface border border-border rounded-lg px-4 py-2 text-text-primary">{lastCode}</p>
          <button
            onClick={() => { setLastCode(null); setScannerOpen(true) }}
            className="mt-4 px-6 py-2 rounded-lg bg-accent text-white text-sm font-medium"
          >
            Escanear novamente
          </button>
        </>
      ) : (
        <p className="text-text-muted text-sm">A iniciar câmara...</p>
      )}

      {scannerOpen && (
        <BarcodeScanner
          title="Scanner — RevTech"
          onScan={code => { setLastCode(code); setScannerOpen(false) }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}
