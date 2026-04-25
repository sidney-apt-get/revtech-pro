import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { useCreateWarranty } from '@/hooks/useWarranties'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const WARRANTY_OPTIONS = [
  { months: 0, label: 'Sem garantia' },
  { months: 1, label: '1 mês' },
  { months: 3, label: '3 meses' },
  { months: 6, label: '6 meses' },
  { months: 12, label: '1 ano' },
]

interface WarrantyModalProps {
  projectId: string
  equipmentName: string
  onClose: () => void
}

export function WarrantyModal({ projectId, equipmentName, onClose }: WarrantyModalProps) {
  const { user } = useAuth()
  const createWarranty = useCreateWarranty()
  const [selectedMonths, setSelectedMonths] = useState(3)
  const [terms, setTerms] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (selectedMonths === 0) { onClose(); return }
    if (!user) return
    setSaving(true)
    try {
      await createWarranty.mutateAsync({
        projectId,
        userId: user.id,
        months: selectedMonths,
        terms: terms || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            Adicionar Garantia?
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-2 space-y-4">
          <p className="text-sm text-text-muted">
            <span className="font-medium text-text-primary">{equipmentName}</span> foi marcado como vendido.
            Deseja adicionar uma garantia?
          </p>

          <div className="grid grid-cols-3 gap-2">
            {WARRANTY_OPTIONS.map(opt => (
              <button
                key={opt.months}
                onClick={() => setSelectedMonths(opt.months)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                  selectedMonths === opt.months
                    ? opt.months === 0
                      ? 'border-danger/50 bg-danger/10 text-danger'
                      : 'border-success/50 bg-success/10 text-success'
                    : 'border-border text-text-muted hover:border-accent/40 hover:text-text-primary'
                )}
              >
                {opt.months === 0 ? <><ShieldOff className="h-3 w-3 mx-auto mb-0.5" />{opt.label}</> : opt.label}
              </button>
            ))}
          </div>

          {selectedMonths > 0 && (
            <div className="space-y-1.5">
              <Label>Termos (opcional)</Label>
              <Textarea
                value={terms}
                onChange={e => setTerms(e.target.value)}
                placeholder="ex: Não cobre danos físicos ou líquidos..."
                rows={2}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Ignorar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : selectedMonths === 0 ? 'Sem garantia' : `Criar garantia (${selectedMonths}m)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
