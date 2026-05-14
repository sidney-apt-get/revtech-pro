import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useRmaItems, useCreateRmaItem, useUpdateRmaItem, useDeleteRmaItem,
  RMA_STATUSES, RMA_STATUS_LABELS, RMA_STATUS_COLORS,
  DEFECT_CATEGORIES, RMA_DESTINATIONS,
} from '@/hooks/useRMA'
import { useProjects } from '@/hooks/useProjects'
import { sendTelegramNotification } from '@/lib/telegram'
import { fmtDate, fmtGBP, cn } from '@/lib/utils'
import { type RmaItem, type RmaStatus, type RmaDestination } from '@/lib/supabase'
import {
  Plus, X, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, Wrench,
  PackageX, TrendingDown, Filter, RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// RMA Card
function RmaCard({
  item,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  item: RmaItem
  onChangeStatus: (id: string, status: RmaStatus, note?: string) => void
  onEdit: (item: RmaItem) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const nextStatuses: RmaStatus[] = useMemo(() => {
    const flow: Record<RmaStatus, RmaStatus[]> = {
      received:         ['triage'],
      triage:           ['pending_decision', 'in_repair'],
      pending_decision: ['in_repair', 'cannibalized', 'written_off'],
      in_repair:        ['resolved', 'cannibalized', 'written_off'],
      resolved:         [],
      cannibalized:     [],
      written_off:      [],
    }
    return flow[item.status] ?? []
  }, [item.status])

  const isClosed = ['resolved', 'cannibalized', 'written_off'].includes(item.status)

  return (
    <Card className={cn('transition-colors', isClosed ? 'opacity-70' : 'hover:border-accent/30')}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('text-xs font-medium rounded-full border px-2 py-0.5', RMA_STATUS_COLORS[item.status])}>
                {RMA_STATUS_LABELS[item.status]}
              </span>
              {item.rma_number && (
                <span className="text-xs font-mono text-text-muted">{item.rma_number}</span>
              )}
              {item.defect_category && (
                <span className="text-xs text-text-muted border border-border rounded-full px-2 py-0.5">
                  {item.defect_category}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-text-primary">
              {item.brand ? `${item.brand} ` : ''}{item.model ? `${item.model} - ` : ''}{item.equipment}
            </p>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{item.defect_description}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(item)} className="p-1 text-text-muted hover:text-accent transition-colors">
              <Wrench className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button onClick={() => onDelete(item.id)} className="p-1 text-text-muted hover:text-danger transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!isClosed && (
          <div className="flex items-center gap-1">
            {(['received', 'triage', 'pending_decision', 'in_repair', 'resolved'] as RmaStatus[]).map((s, i, arr) => {
              const idx = arr.indexOf(item.status)
              const active = i <= idx
              return (
                <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', active ? 'bg-accent' : 'bg-border')} />
              )
            })}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
              {item.supplier && <div>Fornecedor: <span className="text-text-primary">{item.supplier}</span></div>}
              {item.purchase_price != null && <div>Compra: <span className="text-text-primary">{fmtGBP(item.purchase_price)}</span></div>}
              {item.purchase_date && <div>Data: <span className="text-text-primary">{fmtDate(item.purchase_date)}</span></div>}
              {item.serial_number && <div>S/N: <span className="font-mono text-text-primary">{item.serial_number}</span></div>}
              {item.imei && <div>IMEI: <span className="font-mono text-text-primary">{item.imei}</span></div>}
              {item.repair_cost != null && <div>Custo rep.: <span className="text-danger">{fmtGBP(item.repair_cost)}</span></div>}
              {item.recovery_value != null && <div>Recuperado: <span className="text-success">{fmtGBP(item.recovery_value)}</span></div>}
              {item.write_off_value != null && <div>Write-off: <span className="text-danger">{fmtGBP(item.write_off_value)}</span></div>}
            </div>

            {item.destination && (
              <div className="text-xs">
                <span className="text-text-muted">Destino: </span>
                <span className="text-text-primary font-medium">
                  {RMA_DESTINATIONS.find(d => d.value === item.destination)?.label ?? item.destination}
                </span>
                {item.destination_notes && <span className="text-text-muted ml-1">- {item.destination_notes}</span>}
              </div>
            )}

            {item.notes && (
              <p className="text-xs text-text-muted italic border-l-2 border-border pl-2">{item.notes}</p>
            )}

            {item.activity_log?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Historico</p>
                {[...item.activity_log].reverse().slice(0, 4).map((entry, i) => (
                  <div key={i} className="flex gap-2 text-xs text-text-muted">
                    <span className="shrink-0 font-mono">
                      {new Date(entry.ts).toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit' })}
                    </span>
                    <span>
                      {entry.action.startsWith('status:')
                        ? `-> ${RMA_STATUS_LABELS[entry.action.replace('status:','') as RmaStatus] ?? entry.action}`
                        : entry.action}
                    </span>
                    {entry.note && entry.note !== 'Item RMA criado' && (
                      <span className="italic">- {entry.note}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {nextStatuses.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-1">
                {nextStatuses.map(s => (
                  <button key={s}
                    onClick={() => onChangeStatus(item.id, s)}
                    className="text-xs px-3 py-1 rounded-lg border border-border text-text-muted hover:bg-surface hover:text-text-primary transition-colors">
                    {'-> '}{RMA_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// RMA Modal
function RmaModal({ item, onClose }: { item?: RmaItem; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: projects = [] } = useProjects()
  const createRma = useCreateRmaItem()
  const updateRma = useUpdateRmaItem()
  const isEdit = !!item

  const [form, setForm] = useState<Partial<RmaItem>>({
    equipment: '',
    brand: '',
    model: '',
    serial_number: '',
    imei: '',
    supplier: '',
    purchase_price: undefined,
    purchase_date: new Date().toISOString().split('T')[0],
    status: 'received',
    defect_description: '',
    defect_category: '',
    destination: undefined,
    destination_notes: '',
    repair_cost: undefined,
    recovery_value: undefined,
    write_off_value: undefined,
    project_id: null,
    notes: '',
    photo_urls: [],
    ...item,
  })

  function set(k: keyof RmaItem, v: unknown) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.equipment || !form.defect_description) return

    const payload = {
      equipment: form.equipment!,
      brand: form.brand || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      imei: form.imei || null,
      supplier: form.supplier || null,
      purchase_price: form.purchase_price ?? null,
      purchase_date: form.purchase_date || null,
      status: form.status as RmaStatus ?? 'received',
      defect_description: form.defect_description!,
      defect_category: form.defect_category || null,
      destination: (form.destination as RmaDestination) || null,
      destination_notes: form.destination_notes || null,
      repair_cost: form.repair_cost ?? null,
      recovery_value: form.recovery_value ?? null,
      write_off_value: form.write_off_value ?? null,
      project_id: form.project_id || null,
      order_id: null,
      notes: form.notes || null,
      photo_urls: form.photo_urls ?? [],
    }

    if (isEdit && item) {
      await updateRma.mutateAsync({ id: item.id, ...payload })
      sendTelegramNotification(
        `[EDIT] RMA actualizado\n${item.rma_number ?? ''} - ${form.brand} ${form.model}\nEstado: ${RMA_STATUS_LABELS[form.status as RmaStatus ?? 'received']}`
      )
    } else {
      const created = await createRma.mutateAsync(payload)
      sendTelegramNotification(
        `[NEW] Novo RMA criado\n${created.rma_number} - ${form.brand ?? ''} ${form.model ?? ''} ${form.equipment}\nDefeito: ${form.defect_description}`
      )
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEdit ? `Editar ${item?.rma_number ?? 'RMA'}` : 'Novo Item RMA'}
          </h2>
          <button onClick={onClose}><X className="h-4 w-4 text-text-muted" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Produto */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Produto</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 space-y-1">
                <label className="text-xs text-text-muted">Equipamento *</label>
                <input value={form.equipment ?? ''} onChange={e => set('equipment', e.target.value)} required
                  placeholder="Portatil, Telemovel, Tablet..."
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Marca</label>
                <input value={form.brand ?? ''} onChange={e => set('brand', e.target.value)}
                  placeholder="Apple, HP..."
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-text-muted">Modelo</label>
                <input value={form.model ?? ''} onChange={e => set('model', e.target.value)}
                  placeholder="MacBook Air M1..."
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-text-muted">Numero de Serie</label>
                <input value={form.serial_number ?? ''} onChange={e => set('serial_number', e.target.value)}
                  placeholder="SN..."
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">IMEI</label>
                <input value={form.imei ?? ''} onChange={e => set('imei', e.target.value)}
                  placeholder="IMEI..."
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
            </div>
          </div>

          {/* Origem */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Origem</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 space-y-1">
                <label className="text-xs text-text-muted">Fornecedor</label>
                <input value={form.supplier ?? ''} onChange={e => set('supplier', e.target.value)}
                  placeholder="eBay, Loja X..."
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Preco pago (GBP)</label>
                <input type="number" step="0.01" min="0"
                  value={form.purchase_price ?? ''}
                  onChange={e => set('purchase_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-text-muted">Data de compra</label>
                <input type="date" value={form.purchase_date ?? ''}
                  onChange={e => set('purchase_date', e.target.value)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="col-span-3 space-y-1">
                <label className="text-xs text-text-muted">Projecto associado</label>
                <select value={form.project_id ?? ''} onChange={e => set('project_id', e.target.value || null)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                  <option value="">Nenhum projecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.ticket_number ? `${p.ticket_number} - ` : ''}{p.equipment}{p.brand ? ` (${p.brand})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Defeito */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Defeito</p>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Descricao do defeito *</label>
                <textarea value={form.defect_description ?? ''} onChange={e => set('defect_description', e.target.value)}
                  required rows={2} placeholder="Descreve o defeito observado..."
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Categoria do defeito</label>
                <select value={form.defect_category ?? ''} onChange={e => set('defect_category', e.target.value || null)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                  <option value="">Seleccionar...</option>
                  {DEFECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Estado e Decisao</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Estado RMA</label>
                <select value={form.status ?? 'received'} onChange={e => set('status', e.target.value)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                  {RMA_STATUSES.map(s => <option key={s} value={s}>{RMA_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Destino</label>
                <select value={form.destination ?? ''} onChange={e => set('destination', e.target.value || null)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                  <option value="">A definir</option>
                  {RMA_DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              {form.destination && (
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-text-muted">Notas sobre destino</label>
                  <input value={form.destination_notes ?? ''} onChange={e => set('destination_notes', e.target.value)}
                    placeholder="Ex: vender no eBay por £XX..."
                    className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
              )}
            </div>
          </div>

          {/* Financeiro */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Financeiro</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Custo reparacao (GBP)</label>
                <input type="number" step="0.01" min="0"
                  value={form.repair_cost ?? ''}
                  onChange={e => set('repair_cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Valor recuperado (GBP)</label>
                <input type="number" step="0.01" min="0"
                  value={form.recovery_value ?? ''}
                  onChange={e => set('recovery_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Write-off (GBP)</label>
                <input type="number" step="0.01" min="0"
                  value={form.write_off_value ?? ''}
                  onChange={e => set('write_off_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Notas internas</label>
            <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Observacoes adicionais..."
              className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit"
              disabled={createRma.isPending || updateRma.isPending}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              {(createRma.isPending || updateRma.isPending)
                ? t('common.saving')
                : isEdit ? 'Guardar alteracoes' : 'Criar RMA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Page
export function RMA() {
  const { t } = useTranslation()
  useEffect(() => { document.title = 'RMA - RevTech PRO' }, [])

  const { data: items = [], isLoading } = useRmaItems()
  const updateRma = useUpdateRmaItem()
  const deleteRma = useDeleteRmaItem()

  const [filterStatus, setFilterStatus] = useState<RmaStatus | ''>('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<RmaItem | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  const stats = useMemo(() => {
    const open = items.filter(i => !['resolved', 'cannibalized', 'written_off'].includes(i.status))
    const closed = items.filter(i => ['resolved', 'cannibalized', 'written_off'].includes(i.status))
    const totalWriteOff = items
      .filter(i => i.status === 'written_off')
      .reduce((s, i) => s + (i.write_off_value ?? i.purchase_price ?? 0), 0)
    const totalRecovered = items.reduce((s, i) => s + (i.recovery_value ?? 0), 0)
    const byStatus = Object.fromEntries(
      RMA_STATUSES.map(s => [s, items.filter(i => i.status === s).length])
    ) as Record<RmaStatus, number>
    return { open: open.length, closed: closed.length, totalWriteOff, totalRecovered, byStatus }
  }, [items])

  const filtered = useMemo(() => {
    const closedStatuses = ['resolved', 'cannibalized', 'written_off']
    return items.filter(i => {
      if (!showClosed && closedStatuses.includes(i.status)) return false
      if (filterStatus && i.status !== filterStatus) return false
      if (filterCategory && i.defect_category !== filterCategory) return false
      return true
    })
  }, [items, showClosed, filterStatus, filterCategory])

  const closedCount = items.filter(i => ['resolved', 'cannibalized', 'written_off'].includes(i.status)).length

  async function handleChangeStatus(id: string, status: RmaStatus, note?: string) {
    const item = items.find(i => i.id === id)
    await updateRma.mutateAsync({ id, status, _note: note })
    if (item) {
      sendTelegramNotification(
        `[RMA] ${item.rma_number ?? ''} - ${item.brand ?? ''} ${item.model ?? ''}\n${RMA_STATUS_LABELS[item.status]} -> ${RMA_STATUS_LABELS[status]}`
      )
    }
    setToast(`Estado actualizado: ${RMA_STATUS_LABELS[status]}`)
  }

  function handleEdit(item: RmaItem) {
    setEditItem(item)
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditItem(undefined)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">RMA</h1>
          </div>
          <p className="text-text-muted text-sm mt-0.5">
            Controlo de Estoque com Defeito &middot; {stats.open} em aberto
            {!showClosed && closedCount > 0 && (
              <span className="text-gray-500 ml-1">(+{closedCount} fechados)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClosed(!showClosed)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              showClosed ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-accent/40',
            )}>
            {showClosed ? 'Ocultar fechados' : 'Mostrar fechados'}
          </button>
          <button onClick={() => setShowFilters(f => !f)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
              (filterStatus || filterCategory) ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-accent/40',
            )}>
            <Filter className="h-3 w-3" />
            Filtrar
          </button>
          <button
            onClick={() => { setEditItem(undefined); setShowModal(true) }}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
            <Plus className="h-4 w-4" />
            Novo RMA
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-text-muted">Em Aberto</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.open}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-text-muted">Fechados</p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.closed}</p>
        </div>
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-danger" />
            <p className="text-xs text-text-muted">Total Write-offs</p>
          </div>
          <p className="text-2xl font-bold text-danger">{fmtGBP(stats.totalWriteOff)}</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <PackageX className="h-4 w-4 text-success" />
            <p className="text-xs text-text-muted">Valor Recuperado</p>
          </div>
          <p className="text-2xl font-bold text-success">{fmtGBP(stats.totalRecovered)}</p>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        {RMA_STATUSES.filter(s => !['resolved','cannibalized','written_off'].includes(s) || showClosed).map(s => {
          const count = stats.byStatus[s] ?? 0
          return (
            <button key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                filterStatus === s
                  ? RMA_STATUS_COLORS[s] + ' ring-1 ring-current'
                  : 'border-border text-text-muted hover:border-accent/40',
              )}>
              {RMA_STATUS_LABELS[s]}
              {count > 0 && <span className="font-bold">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Extra filters */}
      {showFilters && (
        <div className="flex gap-3 flex-wrap p-3 rounded-xl bg-surface border border-border">
          <div className="flex-1 min-w-40 space-y-1">
            <label className="text-xs text-text-muted">Categoria de defeito</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
              <option value="">Todas as categorias</option>
              {DEFECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(filterStatus || filterCategory) && (
            <button onClick={() => { setFilterStatus(''); setFilterCategory('') }}
              className="self-end text-xs text-danger hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
          <AlertTriangle className="h-12 w-12 opacity-30" />
          <p className="text-sm">
            {items.length === 0
              ? 'Ainda nao ha items RMA. Clica em "Novo RMA" para comecar.'
              : 'Nenhum item corresponde aos filtros activos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <RmaCard
              key={item.id}
              item={item}
              onChangeStatus={handleChangeStatus}
              onEdit={handleEdit}
              onDelete={id => { setDeleteTarget(id); setDeleteInput('') }}
            />
          ))}
        </div>
      )}

      {showModal && <RmaModal item={editItem} onClose={handleCloseModal} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4"
          onClick={() => { setDeleteTarget(null); setDeleteInput('') }}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">{t('orders.deleteTitle')}</h2>
            <p className="text-sm text-text-muted">
              {t('delete.will_delete')}: <span className="font-medium text-text-primary">
                {items.find(i => i.id === deleteTarget)?.rma_number ?? 'item RMA'}
              </span>. {t('delete.irreversible')}
            </p>
            <p className="text-xs text-text-muted">
              {t('delete.instruction')} <span className="font-mono font-bold text-danger">{t('delete.confirm_word')}</span>.
            </p>
            <input autoFocus value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              placeholder={t('delete.confirm_word')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-danger" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteTarget(null); setDeleteInput('') }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">
                {t('common.cancel')}
              </button>
              <button
                disabled={deleteInput !== t('delete.confirm_word') || deleteRma.isPending}
                onClick={() => { deleteRma.mutate(deleteTarget!); setDeleteTarget(null); setDeleteInput('') }}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 transition-colors">
                {deleteRma.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-card border border-border rounded-xl shadow-2xl px-5 py-3 text-sm font-medium text-text-primary animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
