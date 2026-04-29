import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLots, useCreateLot, useUpdateLot, useDeleteLot } from '@/hooks/useSmartCatalog'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Lot } from '@/lib/supabase'
import { fmtGBP, fmtDate, STATUS_COLORS, cn } from '@/lib/utils'
import { calcROI } from '@/lib/utils'
import { Plus, Pencil, Trash2, Package, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocation } from 'wouter'

type LotStatus = Lot['status']

const STATUS_CONFIG: Record<LotStatus, { label_pt: string; label_en: string; icon: typeof Clock; color: string }> = {
  untriaged:   { label_pt: 'Não Triado',   label_en: 'Untriaged',   icon: AlertCircle, color: 'text-warning border-warning/30 bg-warning/5' },
  in_progress: { label_pt: 'Em Progresso', label_en: 'In Progress', icon: Clock,        color: 'text-accent border-accent/30 bg-accent/5' },
  completed:   { label_pt: 'Concluído',    label_en: 'Completed',   icon: CheckCircle,  color: 'text-success border-success/30 bg-success/5' },
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
  const [, navigate] = useLocation()
  const { data: lots = [], isLoading } = useLots()
  const { data: allProjects = [] } = useProjects()
  const create = useCreateLot()
  const update = useUpdateLot()
  const remove = useDeleteLot()

  useEffect(() => { document.title = t('nav.lots') + ' — RevTech PRO' }, [t])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lot | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lot | null>(null)

  function openNew() {
    setEditing(null)
    const nextNum = lots.length + 1
    const year = new Date().getFullYear()
    setForm({ ...DEFAULT_FORM, lot_number: `L-${year}-${String(nextNum).padStart(3, '0')}` })
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
        <div className="space-y-3">
          {lots.map(lot => {
            const cfg = STATUS_CONFIG[lot.status]
            const Icon = cfg.icon
            const lotProjects = allProjects.filter(p => p.lot_id === lot.id)
            const estimated = lot.estimated_items ?? 0
            const created = lotProjects.length
            const progressPct = estimated > 0 ? Math.min(100, Math.round((created / estimated) * 100)) : 0
            const costPerItem = estimated > 0 ? lot.purchase_price / estimated : 0
            const isExpanded = expandedId === lot.id

            const soldProjects = lotProjects.filter(p => p.status === 'Vendido')
            const totalInvested = lotProjects.reduce((s, p) => s + p.purchase_price + p.parts_cost + p.shipping_in + p.shipping_out, 0)
            const totalRevenue = soldProjects.reduce((s, p) => s + (p.sale_price ?? 0), 0)
            const totalProfit = totalRevenue - totalInvested
            const remaining = estimated > 0 ? Math.max(0, estimated - created) : null

            return (
              <div key={lot.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-accent/30 transition-colors">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : lot.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-text-primary">
                        📦 {lot.lot_number ? `#${lot.lot_number}` : t('lots.unnamed')}
                      </p>
                      <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', cfg.color)}>
                        <Icon className="h-3 w-3" />
                        {lang === 'pt' ? cfg.label_pt : cfg.label_en}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted flex-wrap">
                      {lot.supplier && <span>{lot.supplier}</span>}
                      <span>{fmtDate(lot.purchase_date)}</span>
                      <span>{fmtGBP(lot.purchase_price)}</span>
                      {costPerItem > 0 && <span>{fmtGBP(costPerItem)}/{t('lots.perItem')}</span>}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 min-w-[120px]">
                    <p className="text-xs text-text-muted">
                      {created}/{estimated > 0 ? estimated : '?'} {t('lots.items_created')}
                    </p>
                    {estimated > 0 && (
                      <div className="w-28 h-1.5 rounded-full bg-surface border border-border overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', progressPct >= 100 ? 'bg-success' : progressPct >= 50 ? 'bg-accent' : 'bg-warning')}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                    {totalProfit !== 0 && (
                      <p className={cn('text-xs font-semibold', totalProfit >= 0 ? 'text-success' : 'text-danger')}>
                        {totalProfit >= 0 ? '+' : ''}{fmtGBP(totalProfit)} {t('lots.profit')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(lot) }}
                      className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-accent transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(lot) }}
                      className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border bg-surface/50 p-4 space-y-4">
                    {/* Stats summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: t('lots.cost_per_item'), value: fmtGBP(costPerItem) },
                        { label: t('lots.items_created'), value: `${created}${estimated > 0 ? `/${estimated}` : ''}` },
                        { label: t('lots.total_invested'), value: fmtGBP(totalInvested) },
                        { label: t('lots.profit'), value: fmtGBP(totalProfit), colored: true, profit: totalProfit },
                      ].map(({ label, value, colored, profit }) => (
                        <div key={label} className="rounded-lg bg-card border border-border p-2.5 text-center">
                          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</p>
                          <p className={cn('text-sm font-bold', colored ? (profit! >= 0 ? 'text-success' : 'text-danger') : 'text-text-primary')}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {remaining !== null && remaining > 0 && (
                      <p className="text-xs text-warning flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {remaining} {t('lots.items_remaining')}
                      </p>
                    )}

                    {/* Projects from this lot */}
                    {lotProjects.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('lots.projects_in_lot')} ({lotProjects.length})</p>
                        {lotProjects.map(p => {
                          const { profit: sp } = calcROI(p)
                          return (
                            <button
                              key={p.id}
                              onClick={() => navigate(`/projects/${p.id}`)}
                              className="w-full flex items-center justify-between gap-3 rounded-lg bg-card border border-border px-3 py-2 hover:border-accent/40 hover:bg-accent/5 transition-colors text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-text-primary truncate">{p.equipment}</p>
                                <p className="text-xs text-text-muted">{p.ticket_number ? `${p.ticket_number} · ` : ''}{fmtDate(p.received_at)}</p>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={cn('text-[10px] font-medium rounded-full border px-2 py-0.5', STATUS_COLORS[p.status])}>
                                  {t(`statusMap.${p.status}`, { defaultValue: p.status })}
                                </span>
                                {p.sale_price != null && (
                                  <span className={cn('text-xs font-semibold', sp >= 0 ? 'text-success' : 'text-danger')}>
                                    {sp >= 0 ? '+' : ''}{fmtGBP(sp)}
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted text-center py-2">{t('lots.no_projects_yet')}</p>
                    )}

                    {lot.notes && (
                      <p className="text-xs text-text-muted italic border-t border-border pt-3">{lot.notes}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
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

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">{t('common.delete')} #{deleteTarget.lot_number}</h2>
            <p className="text-sm text-text-muted">{t('delete.irreversible')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
              <Button
                variant="destructive"
                onClick={() => { remove.mutate(deleteTarget.id); setDeleteTarget(null) }}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
