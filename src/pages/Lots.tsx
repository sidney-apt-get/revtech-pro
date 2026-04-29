import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLots, useCreateLot, useUpdateLot, useDeleteLot } from '@/hooks/useSmartCatalog'
import { useProjects } from '@/hooks/useProjects'
import { useCreateInventoryItem } from '@/hooks/useInventory'
import { useCategories } from '@/hooks/useCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase, type Lot, type InventoryItem } from '@/lib/supabase'
import { fmtGBP, fmtDate, STATUS_COLORS, cn } from '@/lib/utils'
import { calcROI } from '@/lib/utils'
import { Plus, Pencil, Trash2, Package, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, X, Camera } from 'lucide-react'
import { useLocation } from 'wouter'

type LotStatus = Lot['status']
type LotItemDest = 'inventory' | 'project'

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

interface LotItemForm {
  name: string
  category_slug: string
  condition: string
  notes: string
  photos: string[]
  destination: LotItemDest
  quantity: number
  location: string
  defect: string
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

const DEFAULT_ITEM_FORM: LotItemForm = {
  name: '',
  category_slug: '',
  condition: 'unknown',
  notes: '',
  photos: [],
  destination: 'inventory',
  quantity: 1,
  location: '',
  defect: '',
}

function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_W = 800, MAX_H = 600
      let { width, height } = img
      if (width > MAX_W || height > MAX_H) {
        const ratio = Math.min(MAX_W / width, MAX_H / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = reject
    img.src = url
  })
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
  const createInventoryItem = useCreateInventoryItem()
  const { categories: subCategories } = useCategories('inventory')

  useEffect(() => { document.title = t('nav.lots') + ' — RevTech PRO' }, [t])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lot | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lot | null>(null)

  const [addItemLotId, setAddItemLotId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<LotItemForm>(DEFAULT_ITEM_FORM)
  const [addingItem, setAddingItem] = useState(false)
  const [lotInvItems, setLotInvItems] = useState<Record<string, InventoryItem[]>>({})

  async function loadLotInventory(lotId: string) {
    const { data } = await supabase
      .from('inventory')
      .select('id, item_name, quantity, photos, category_slug, item_context')
      .eq('lot_id', lotId)
    if (data) setLotInvItems(prev => ({ ...prev, [lotId]: data as InventoryItem[] }))
  }

  async function handleAddLotItem() {
    if (!addItemLotId || !itemForm.name.trim()) return
    const lot = lots.find(l => l.id === addItemLotId)
    const costPerItem = lot && lot.estimated_items ? lot.purchase_price / lot.estimated_items : 0
    setAddingItem(true)
    try {
      if (itemForm.destination === 'inventory') {
        await createInventoryItem.mutateAsync({
          item_name: itemForm.name,
          category: 'Peças',
          category_slug: itemForm.category_slug || null,
          quantity: itemForm.quantity || 1,
          min_stock: 1,
          unit_cost: costPerItem,
          location: itemForm.location || null,
          supplier: lot?.supplier || null,
          notes: itemForm.notes || null,
          calibration_date: null,
          next_maintenance: null,
          item_context: 'lot',
          lot_id: addItemLotId,
          source_project_id: null,
          cannibalization_reason: null,
          condition_tested: false,
          photos: itemForm.photos,
          entry_date: new Date().toISOString().split('T')[0],
        })
      } else {
        await supabase.from('projects').insert({
          equipment: itemForm.name,
          defect_description: itemForm.defect || 'A diagnosticar',
          purchase_price: costPerItem,
          lot_id: addItemLotId,
          status: 'Recebido',
        })
      }
      await loadLotInventory(addItemLotId)
      setAddItemLotId(null)
      setItemForm(DEFAULT_ITEM_FORM)
    } finally {
      setAddingItem(false)
    }
  }

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

  function setItem(k: keyof LotItemForm, v: unknown) {
    setItemForm(f => ({ ...f, [k]: v }))
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
            const invItems = lotInvItems[lot.id] ?? []
            const estimated = lot.estimated_items ?? 0
            const created = lotProjects.length + invItems.length
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
                  onClick={() => {
                    const newId = isExpanded ? null : lot.id
                    setExpandedId(newId)
                    if (newId && !lotInvItems[newId]) loadLotInventory(newId)
                  }}
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

                    {/* Add item button */}
                    <button
                      onClick={e => { e.stopPropagation(); setAddItemLotId(lot.id); setItemForm(DEFAULT_ITEM_FORM) }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/60 px-3 py-2.5 text-sm text-accent transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      {t('lots.add_item')}
                    </button>

                    {/* Items in this lot (inventory + projects) */}
                    {(lotProjects.length > 0 || invItems.length > 0) ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                          {t('lots.items_in_lot')} ({lotProjects.length + invItems.length})
                        </p>

                        {/* Inventory items */}
                        {invItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => navigate(`/inventory/${item.id}`)}
                            className="w-full flex items-center justify-between gap-3 rounded-lg bg-card border border-border px-3 py-2 hover:border-accent/40 hover:bg-accent/5 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {Array.isArray(item.photos) && item.photos[0]
                                ? <img src={item.photos[0]} alt="" className="h-8 w-8 rounded object-cover border border-border shrink-0" />
                                : <div className="h-8 w-8 rounded bg-surface border border-border flex items-center justify-center shrink-0"><Package className="h-3.5 w-3.5 text-text-muted" /></div>
                              }
                              <p className="text-sm font-medium text-text-primary truncate">{item.item_name}</p>
                            </div>
                            <span className="text-[10px] font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-2 py-0.5 shrink-0">
                              📦 {lang === 'pt' ? 'Inventário' : 'Inventory'}
                            </span>
                          </button>
                        ))}

                        {/* Projects */}
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
                                <span className="text-[10px] font-medium text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5">
                                  🔧 {lang === 'pt' ? 'Projecto' : 'Project'}
                                </span>
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
                      <p className="text-xs text-text-muted text-center py-2">{t('lots.no_items_yet')}</p>
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

      {/* Lot modal */}
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

      {/* Add Item to Lot modal */}
      {addItemLotId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" onClick={() => setAddItemLotId(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">{t('lots.add_item')}</h2>
              <button onClick={() => setAddItemLotId(null)}><X className="h-4 w-4 text-text-muted" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>{t('lots.item_name')} *</Label>
                <Input
                  value={itemForm.name}
                  onChange={e => setItem('name', e.target.value)}
                  placeholder={lang === 'pt' ? 'ex: MacBook Pro A1398' : 'e.g. MacBook Pro A1398'}
                />
              </div>

              {/* Category */}
              {subCategories.length > 0 && (
                <div className="space-y-1.5">
                  <Label>{t('inventory_form.subcategory_label', { defaultValue: 'Sub-categoria' })}</Label>
                  <select
                    value={itemForm.category_slug}
                    onChange={e => setItem('category_slug', e.target.value)}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">— {lang === 'pt' ? 'Nenhuma' : 'None'} —</option>
                    {[...subCategories]
                      .sort((a, b) => (lang === 'en' ? a.name_en : a.name_pt).localeCompare(lang === 'en' ? b.name_en : b.name_pt))
                      .map(c => (
                        <option key={c.slug} value={c.slug}>
                          {lang === 'en' ? c.name_en : c.name_pt}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Condition */}
              <div className="space-y-1.5">
                <Label>{t('lots.item_condition')}</Label>
                <select
                  value={itemForm.condition}
                  onChange={e => setItem('condition', e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="working">{t('lots.conditions.working')}</option>
                  <option value="faulty">{t('lots.conditions.faulty')}</option>
                  <option value="for_parts">{t('lots.conditions.for_parts')}</option>
                  <option value="unknown">{t('lots.conditions.unknown')}</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>{lang === 'pt' ? 'Notas' : 'Notes'}</Label>
                <Textarea
                  value={itemForm.notes}
                  onChange={e => setItem('notes', e.target.value)}
                  rows={2}
                  placeholder={lang === 'pt' ? 'Observações sobre o item...' : 'Notes about the item...'}
                />
              </div>

              {/* Photos */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {lang === 'pt' ? 'Fotos (máx. 3)' : 'Photos (max 3)'}
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {itemForm.photos.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => setItem('photos', itemForm.photos.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger text-white flex items-center justify-center text-xs"
                      >×</button>
                    </div>
                  ))}
                  {itemForm.photos.length < 3 && (
                    <label className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted hover:border-accent/40 hover:text-accent transition-colors cursor-pointer">
                      <Camera className="h-5 w-5" />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const b64 = await compressToBase64(file)
                            setItem('photos', [...itemForm.photos, b64])
                          }
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label>{t('lots.destination')}</Label>
                <div className="space-y-2">
                  {(['inventory', 'project'] as LotItemDest[]).map(dest => (
                    <label key={dest} className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      itemForm.destination === dest ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'
                    )}>
                      <input
                        type="radio"
                        name="destination"
                        value={dest}
                        checked={itemForm.destination === dest}
                        onChange={() => setItem('destination', dest)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {dest === 'inventory' ? `📦 ${t('lots.dest_inventory')}` : `🔧 ${t('lots.dest_project')}`}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {dest === 'inventory'
                            ? (lang === 'pt' ? 'Cria item no inventário ligado a este lote' : 'Creates an inventory item linked to this lot')
                            : (lang === 'pt' ? 'Cria projecto de reparação com custo do lote' : 'Creates a repair project with lot cost per item')
                          }
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Inventory-specific fields */}
              {itemForm.destination === 'inventory' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{lang === 'pt' ? 'Quantidade' : 'Quantity'}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={itemForm.quantity}
                      onChange={e => setItem('quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{lang === 'pt' ? 'Localização' : 'Location'}</Label>
                    <Input
                      value={itemForm.location}
                      onChange={e => setItem('location', e.target.value)}
                      placeholder="Prateleira A1"
                    />
                  </div>
                </div>
              )}

              {/* Project-specific fields */}
              {itemForm.destination === 'project' && (
                <div className="space-y-1.5">
                  <Label>{t('lots.defect_observed')}</Label>
                  <Input
                    value={itemForm.defect}
                    onChange={e => setItem('defect', e.target.value)}
                    placeholder={lang === 'pt' ? 'Defeito observado...' : 'Observed defect...'}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => setAddItemLotId(null)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddLotItem}
                disabled={!itemForm.name.trim() || addingItem}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {addingItem ? t('common.saving') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

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
