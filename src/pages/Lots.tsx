import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLots, useCreateLot, useUpdateLot, useDeleteLot } from '@/hooks/useSmartCatalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Lot } from '@/lib/supabase'
import { fmtGBP, fmtDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, Package, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type LotStatus = Lot['status']

const STATUS_CONFIG: Record<LotStatus, { label_pt: string; label_en: string; icon: typeof Clock; color: string }> = {
  untriaged:   { label_pt: 'Não Triado',  label_en: 'Untriaged',   icon: AlertCircle,   color: 'text-warning border-warning/30 bg-warning/5' },
  in_progress: { label_pt: 'Em Progresso',label_en: 'In Progress', icon: Clock,         color: 'text-accent border-accent/30 bg-accent/5' },
  completed:   { label_pt: 'Concluído',   label_en: 'Completed',   icon: CheckCircle,   color: 'text-success border-success/30 bg-success/5' },
}

type FormState = {
  lot_number: string
  supplier: string
  purchase_price: string
  purchase_date: string
  description: string
  estimated_items: string
  status: LotStatus
  notes: string
}

const DEFAULT_FORM: FormState = {
  lot_number: '',
  supplier: '',
  purchase_price: '',
  purchase_date: new Date().toISOString().slice(0, 10),
  description: '',
  estimated_items: '',
  status: 'untriaged',
  notes: '',
}

export function Lots() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const { data: lots = [], isLoading } = useLots()
  const create = useCreateLot()
  const update = useUpdateLot()
  const remove = useDeleteLot()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lot | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  function openNew() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setModalOpen(true)
  }

  function openEdit(lot: Lot) {
    setEditing(lot)
    setForm({
      lot_number: lot.lot_number ?? '',
      supplier: lot.supplier ?? '',
      purchase_price: String(lot.purchase_price),
      purchase_date: lot.purchase_date,
      description: lot.description ?? '',
      estimated_items: String(lot.estimated_items ?? ''),
      status: lot.status,
      notes: lot.notes ?? '',
    })
    setModalOpen(true)
  }

  async function handleSubmit() {
    const payload = {
      lot_number: form.lot_number || null,
      supplier: form.supplier || null,
      purchase_price: parseFloat(form.purchase_price) || 0,
      purchase_date: form.purchase_date,
      description: form.description || null,
      estimated_items: form.estimated_items ? parseInt(form.estimated_items) : null,
      status: form.status,
      notes: form.notes || null,
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    setModalOpen(false)
  }

  function set(k: keyof FormState, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  if (isLoading) return <div className="animate-pulse text-text-muted p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Package className="h-6 w-6 text-accent" />
            {t('lots.title')}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">{t('lots.total', { count: lots.length })}</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" />
          {t('lots.new')}
        </Button>
      </div>

      {lots.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">{t('lots.noLots')}</p>
          <Button onClick={openNew} className="mt-4" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> {t('lots.createFirst')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lots.map(lot => {
            const cfg = STATUS_CONFIG[lot.status]
            const Icon = cfg.icon
            return (
              <div key={lot.id} className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-accent/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-text-primary flex items-center gap-1.5">
                      📦 {lot.lot_number ? `#${lot.lot_number}` : t('lots.unnamed')}
                    </p>
                    {lot.supplier && <p className="text-xs text-text-muted mt-0.5">{lot.supplier}</p>}
                  </div>
                  <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', cfg.color)}>
                    <Icon className="h-3 w-3" />
                    {lang === 'pt' ? cfg.label_pt : cfg.label_en}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">{t('lots.purchasePrice')}: </span>
                    <span className="font-semibold text-text-primary">{fmtGBP(lot.purchase_price)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">{t('lots.date')}: </span>
                    <span className="text-text-primary">{fmtDate(lot.purchase_date)}</span>
                  </div>
                  {lot.estimated_items && (
                    <div className="col-span-2">
                      <span className="text-text-muted">{t('lots.estimatedItems')}: </span>
                      <span className="text-text-primary">{lot.estimated_items}</span>
                      {lot.purchase_price > 0 && lot.estimated_items > 0 && (
                        <span className="text-text-muted ml-1">
                          ({fmtGBP(lot.purchase_price / lot.estimated_items)}/{t('lots.perItem')})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {lot.description && (
                  <p className="text-xs text-text-muted line-clamp-2">{lot.description}</p>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(lot)} className="h-7 px-2 gap-1 text-xs">
                    <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(lot.id)}
                    className="h-7 px-2 gap-1 text-xs text-danger hover:text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={o => !o && setModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('lots.editLot') : t('lots.newLot')}</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('lots.fields.lotNumber')}</Label>
                <Input value={form.lot_number} onChange={e => set('lot_number', e.target.value)} placeholder="L-2026-001" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('lots.fields.supplier')}</Label>
                <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="eBay, Gumtree..." />
              </div>
              <div className="space-y-1.5">
                <Label>{t('lots.fields.purchasePrice')} *</Label>
                <Input type="number" step="0.01" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('lots.fields.purchaseDate')}</Label>
                <Input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('lots.fields.estimatedItems')}</Label>
                <Input type="number" value={form.estimated_items} onChange={e => set('estimated_items', e.target.value)} placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('lots.fields.status')}</Label>
                <Select value={form.status} onValueChange={v => set('status', v as LotStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as LotStatus[]).map(s => (
                      <SelectItem key={s} value={s}>
                        {lang === 'pt' ? STATUS_CONFIG[s].label_pt : STATUS_CONFIG[s].label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('lots.fields.description')}</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder={t('lots.fields.descriptionPlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('lots.fields.notes')}</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.purchase_price || create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? t('common.saving') : editing ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
