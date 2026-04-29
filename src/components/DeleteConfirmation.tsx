import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export function DeleteConfirmation({ open, onClose, onConfirm, itemName, loading }: DeleteConfirmationProps) {
  const { t } = useTranslation()
  const confirmWord = t('delete.confirm_word')
  const [typed, setTyped] = useState('')

  function handleClose() {
    setTyped('')
    onClose()
  }

  function handleConfirm() {
    if (typed !== confirmWord) return
    onConfirm()
    setTyped('')
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" />
            {t('delete.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {itemName && (
            <p className="text-sm text-text-muted">
              {t('delete.will_delete')}: <span className="font-medium text-text-primary">"{itemName}"</span>
            </p>
          )}
          <p className="text-sm text-text-muted">
            {t('delete.irreversible')} {t('delete.instruction')}{' '}
            <span className="font-mono font-bold text-text-primary">{confirmWord}</span>:
          </p>
          <Input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={confirmWord}
            className={typed === confirmWord ? 'border-danger focus-visible:ring-danger' : ''}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={typed !== confirmWord || loading}
          >
            {loading ? t('common.deleting') : t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
