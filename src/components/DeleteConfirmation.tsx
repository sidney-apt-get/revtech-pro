import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmationProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  itemName?: string
  loading?: boolean
}

const CONFIRM_WORD = 'ELIMINAR'

export function DeleteConfirmation({ open, onClose, onConfirm, itemName, loading }: DeleteConfirmationProps) {
  const [typed, setTyped] = useState('')

  function handleClose() {
    setTyped('')
    onClose()
  }

  function handleConfirm() {
    if (typed !== CONFIRM_WORD) return
    onConfirm()
    setTyped('')
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" />
            Confirmar eliminação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {itemName && (
            <p className="text-sm text-text-muted">
              Vai eliminar: <span className="font-medium text-text-primary">"{itemName}"</span>
            </p>
          )}
          <p className="text-sm text-text-muted">
            Esta acção é <span className="font-semibold text-danger">irreversível</span>. Para confirmar, escreve{' '}
            <span className="font-mono font-bold text-text-primary">{CONFIRM_WORD}</span> em maiúsculas:
          </p>
          <Input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={CONFIRM_WORD}
            className={typed === CONFIRM_WORD ? 'border-danger focus-visible:ring-danger' : ''}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={typed !== CONFIRM_WORD || loading}
          >
            {loading ? 'A eliminar...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
