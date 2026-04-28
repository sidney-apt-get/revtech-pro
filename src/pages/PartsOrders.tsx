import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { sendTelegramNotification } from '@/lib/telegram'
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder } from '@/hooks/useOrders'
import { useProjects, useUpdateProject } from '@/hooks/useProjects'
import { useCreateInventoryItem } from '@/hooks/useInventory'
import { type PartsOrder, type Project } from '@/lib/supabase'
import { fmtDate, fmtGBP } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plus, X, ExternalLink, Trash2, Package, ChevronDown, ChevronUp, CheckCircle2, Wrench, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const ORDER_STATUSES = ['Encomendado', 'Em Trânsito', 'Entregue', 'Cancelado'] as const
const STATUS_COLORS: Record<string, string> = {
  'Encomendado': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Em Trânsito': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Entregue': 'bg-success/15 text-success border-success/30',
  'Cancelado': 'bg-danger/15 text-danger border-danger/30',
}

const SUPPLIERS_LINKS = [
  { name: 'eBay UK', url: 'https://www.ebay.co.uk' },
  { name: 'Amazon UK', url: 'https://www.amazon.co.uk' },
  { name: 'AliExpress', url: 'https://www.aliexpress.com' },
]

function OrderCard({ order, onUpdateStatus, onDelete }: {
  order: PartsOrder
  onUpdateStatus: (id: string, status: PartsOrder['status']) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="hover:border-accent/30 transition-colors">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs font-medium rounded-full border px-2 py-0.5', STATUS_COLORS[order.status])}>
                {t(`orderStatusMap.${order.status}`, { defaultValue: order.status })}
              </span>
              <span className="text-xs text-text-muted">{order.supplier}</span>
            </div>
            <p className="text-sm font-semibold text-text-primary mt-1">{order.part_name}</p>
            <p className="text-xs text-text-muted">{t('orders.fields.quantity')}: {order.quantity} · {order.total_cost != null ? fmtGBP(order.total_cost) : '—'}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button onClick={() => onDelete(order.id)} className="p-1 text-text-muted hover:text-danger transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {ORDER_STATUSES.filter(s => s !== 'Cancelado').map((s, i) => {
            const statuses = ORDER_STATUSES.filter(s => s !== 'Cancelado')
            const currentIdx = statuses.indexOf(order.status as typeof statuses[number])
            const isActive = i <= currentIdx && order.status !== 'Cancelado'
            return (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={cn('h-1.5 flex-1 rounded-full transition-colors', isActive ? 'bg-accent' : 'bg-border')} />
                {i === statuses.length - 1 && (
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', isActive ? 'bg-success' : 'bg-border')} />
                )}
              </div>
            )
          })}
        </div>

        {expanded && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
              <div>{t('orders.orderedDate')}: {fmtDate(order.ordered_at)}</div>
              {order.expected_at && <div>{t('orders.expectedDate')}: {fmtDate(order.expected_at)}</div>}
              {order.delivered_at && <div>{t('orders.deliveredDate')}: {fmtDate(order.delivered_at)}</div>}
              {order.order_number && <div>{t('orders.orderNo')}: {order.order_number}</div>}
              {order.tracking_number && <div>Tracking: {order.tracking_number}</div>}
            </div>
            {order.notes && <p className="text-xs text-text-muted italic">{order.notes}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              {order.order_url && (
                <a href={order.order_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:underline">
                  <ExternalLink className="h-3 w-3" />
                  {t('orders.viewOrder')}
                </a>
              )}
              <div className="flex gap-1 ml-auto">
                {ORDER_STATUSES.filter(s => s !== order.status).map(s => (
                  <button key={s}
                    onClick={() => onUpdateStatus(order.id, s)}
                    className="text-xs px-2 py-0.5 rounded border border-border text-text-muted hover:bg-surface hover:text-text-primary transition-colors">
                    → {t(`orderStatusMap.${s}`, { defaultValue: s })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddOrderModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const createOrder = useCreateOrder()
  const { data: projects = [] } = useProjects()
  const [form, setForm] = useState<Partial<Omit<PartsOrder, 'id' | 'user_id' | 'created_at'>>>({
    status: 'Encomendado',
    quantity: 1,
    ordered_at: new Date().toISOString().split('T')[0],
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.supplier || !form.part_name) return
    const qty = form.quantity ?? 1
    const unit = form.unit_cost ?? 0
    await createOrder.mutateAsync({
      supplier: form.supplier!,
      part_name: form.part_name!,
      quantity: qty,
      unit_cost: unit,
      total_cost: form.total_cost ?? ((qty * unit) || null),
      order_number: form.order_number ?? null,
      order_url: form.order_url ?? null,
      status: form.status as PartsOrder['status'] ?? 'Encomendado',
      ordered_at: form.ordered_at ?? new Date().toISOString().split('T')[0],
      expected_at: form.expected_at ?? null,
      delivered_at: form.delivered_at ?? null,
      tracking_number: form.tracking_number ?? null,
      notes: form.notes ?? null,
      project_id: form.project_id ?? null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">{t('orders.newOrder')}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {SUPPLIERS_LINKS.map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:underline border border-accent/30 rounded px-2 py-1">
                <ExternalLink className="h-3 w-3" />
                {s.name}
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">{t('orders.associatedProject')}</label>
              <select value={form.project_id ?? ''} onChange={e => set('project_id', e.target.value || null)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">{t('common.noProject')}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.ticket_number ? `${p.ticket_number} — ` : ''}{p.equipment}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.supplier')} *</label>
              <input value={form.supplier ?? ''} onChange={e => set('supplier', e.target.value)} required
                placeholder="eBay, Amazon, AliExpress..."
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.part')} *</label>
              <input value={form.part_name ?? ''} onChange={e => set('part_name', e.target.value)} required
                placeholder="Ecrã LCD, Bateria..."
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.quantity')}</label>
              <input type="number" min="1" defaultValue={1} onBlur={e => set('quantity', parseInt(e.target.value) || 1)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.unitCost')}</label>
              <input type="number" step="0.01" min="0" defaultValue="" onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) set('unit_cost', v) }}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.totalCost')}</label>
              <input type="number" step="0.01" min="0" defaultValue="" onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) set('total_cost', v) }}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.status')}</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`orderStatusMap.${s}`, { defaultValue: s })}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.orderedAt')}</label>
              <input type="date" value={form.ordered_at ?? ''} onChange={e => set('ordered_at', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.expectedAt')}</label>
              <input type="date" value={form.expected_at ?? ''} onChange={e => set('expected_at', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">{t('orders.orderTracking')}</label>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.order_number ?? ''} onChange={e => set('order_number', e.target.value)} placeholder="Order #"
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
                <input value={form.tracking_number ?? ''} onChange={e => set('tracking_number', e.target.value)} placeholder="Tracking"
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">{t('orders.orderUrl')}</label>
              <input value={form.order_url ?? ''} onChange={e => set('order_url', e.target.value)} placeholder="https://..."
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">{t('contacts.fields.notes')}</label>
              <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={createOrder.isPending}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              {createOrder.isPending ? t('common.saving') : t('orders.createOrder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReceivedOrderModal({
  order,
  projects,
  onAddToInventory,
  onUseInProject,
  onIgnore,
}: {
  order: PartsOrder
  projects: Project[]
  onAddToInventory: () => void
  onUseInProject: (project: Project) => void
  onIgnore: () => void
}) {
  const { t } = useTranslation()
  const [selecting, setSelecting] = useState(false)
  const activeProjects = projects.filter(p => !['Vendido', 'Cancelado'].includes(p.status))

  if (selecting) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4" onClick={onIgnore}>
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">🔧 {t('orders.select_project')}</h2>
            <button onClick={() => setSelecting(false)}><X className="h-4 w-4 text-text-muted" /></button>
          </div>
          <div className="overflow-y-auto flex-1">
            {activeProjects.length === 0 ? (
              <p className="text-center py-8 text-text-muted text-sm">Nenhum projecto activo</p>
            ) : (
              activeProjects.map(p => (
                <button key={p.id} onClick={() => onUseInProject(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-surface transition-colors text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{p.equipment}</p>
                    {p.brand && <p className="text-xs text-text-muted">{p.brand} {p.model}</p>}
                  </div>
                  {p.ticket_number && <span className="text-xs font-mono text-accent/70 shrink-0">{p.ticket_number}</span>}
                  <ArrowRight className="h-4 w-4 text-text-muted shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4" onClick={onIgnore}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 text-center border-b border-border">
          <div className="text-3xl mb-2">📦</div>
          <h2 className="text-base font-semibold text-text-primary">{t('orders.received_modal_title')}</h2>
          <p className="text-sm font-medium text-accent mt-1">{order.part_name}</p>
          <p className="text-xs text-text-muted mt-1">{t('orders.received_modal_subtitle')}</p>
        </div>
        <div className="p-3 space-y-2">
          <button onClick={onAddToInventory}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface hover:border-accent/40 hover:bg-accent/5 p-3 text-left transition-colors group">
            <span className="text-2xl shrink-0">📦</span>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{t('orders.add_to_inventory')}</p>
              <p className="text-xs text-text-muted">{t('orders.add_to_inventory_desc')}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-success ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button onClick={() => setSelecting(true)}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface hover:border-accent/40 hover:bg-accent/5 p-3 text-left transition-colors group">
            <span className="text-2xl shrink-0">🔧</span>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{t('orders.use_in_project')}</p>
              <p className="text-xs text-text-muted">{t('orders.use_in_project_desc')}</p>
            </div>
            <Wrench className="h-4 w-4 text-accent ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button onClick={onIgnore}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface hover:border-border hover:bg-surface/80 p-3 text-left transition-colors">
            <span className="text-2xl shrink-0">⏭️</span>
            <div>
              <p className="text-sm font-semibold text-text-muted">{t('orders.ignore_for_now')}</p>
              <p className="text-xs text-text-muted">{t('orders.ignore_desc')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export function PartsOrders() {
  const { t } = useTranslation()
  useEffect(() => { document.title = 'Encomendas — RevTech PRO' }, [])
  const { data: orders = [], isLoading } = useOrders()
  const { data: projects = [] } = useProjects()
  const updateOrder = useUpdateOrder()
  const updateProject = useUpdateProject()
  const deleteOrder = useDeleteOrder()
  const createInventoryItem = useCreateInventoryItem()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [receivedOrder, setReceivedOrder] = useState<PartsOrder | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = orders.filter(o => {
    if (filterStatus && o.status !== filterStatus) return false
    if (filterSupplier && !o.supplier.toLowerCase().includes(filterSupplier.toLowerCase())) return false
    return true
  })

  const totalPending = orders.filter(o => ['Encomendado', 'Em Trânsito'].includes(o.status)).length
  const totalCost = orders.filter(o => o.status !== 'Cancelado').reduce((s, o) => s + (o.total_cost ?? 0), 0)

  function handleStatusChange(id: string, status: PartsOrder['status']) {
    const order = orders.find(o => o.id === id)
    const update: Partial<PartsOrder> & { id: string } = { id, status }
    if (status === 'Entregue') {
      update.delivered_at = new Date().toISOString().split('T')[0]
      updateOrder.mutate(update)
      if (order) {
        setReceivedOrder(order)
        sendTelegramNotification(
          `📦 <b>Encomenda recebida</b>\n${order.part_name} de ${order.supplier}\nQty: ${order.quantity}${order.total_cost != null ? `\nTotal: £${order.total_cost.toFixed(2)}` : ''}`
        )
      }
    } else {
      updateOrder.mutate(update)
    }
  }

  async function handleAddToInventory() {
    if (!receivedOrder) return
    await createInventoryItem.mutateAsync({
      item_name: receivedOrder.part_name,
      category: 'Peças',
      quantity: receivedOrder.quantity,
      min_stock: 1,
      unit_cost: receivedOrder.unit_cost ?? 0,
      supplier: receivedOrder.supplier,
      notes: `Adicionado da encomenda${receivedOrder.order_number ? ' #' + receivedOrder.order_number : ''}`,
      location: null,
      calibration_date: null,
      next_maintenance: null,
      item_context: 'new',
      lot_id: null,
      source_project_id: null,
      cannibalization_reason: null,
      condition_tested: false,
    })
    setReceivedOrder(null)
    setToast('✅ ' + t('orders.added_to_inventory'))
  }

  async function handleUseInProject(project: Project) {
    if (!receivedOrder) return
    const partCost = (receivedOrder.unit_cost ?? 0) * receivedOrder.quantity
    await updateProject.mutateAsync({
      id: project.id,
      parts_cost: (project.parts_cost ?? 0) + partCost,
      notes: [project.notes, `Peça recebida: ${receivedOrder.part_name} (${receivedOrder.supplier})`]
        .filter(Boolean).join('\n'),
    })
    setReceivedOrder(null)
    setToast('✅ ' + t('orders.added_to_project'))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('orders.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('orders.pendingLabel', { count: totalPending })} · {fmtGBP(totalCost)} total</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('orders.new')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ORDER_STATUSES.map(s => {
          const count = orders.filter(o => o.status === s).length
          return (
            <button key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                filterStatus === s ? 'border-accent bg-accent/10' : 'border-border bg-card hover:border-accent/30',
              )}>
              <p className="text-xs text-text-muted">{t(`orderStatusMap.${s}`, { defaultValue: s })}</p>
              <p className="text-xl font-bold text-text-primary">{count}</p>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          value={filterSupplier}
          onChange={e => setFilterSupplier(e.target.value)}
          placeholder={t('orders.filterSupplier')}
          className="flex-1 min-w-48 rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <div className="flex gap-2">
          {SUPPLIERS_LINKS.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline border border-accent/30 rounded px-2 py-2">
              <ExternalLink className="h-3 w-3" />
              {s.name}
            </a>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-muted">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
          <Package className="h-12 w-12 opacity-30" />
          <p>{t('orders.noOrders')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(o => (
            <OrderCard key={o.id} order={o} onUpdateStatus={handleStatusChange} onDelete={id => { setDeleteTarget(id); setDeleteInput('') }} />
          ))}
        </div>
      )}

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} />}

      {receivedOrder && (
        <ReceivedOrderModal
          order={receivedOrder}
          projects={projects}
          onAddToInventory={handleAddToInventory}
          onUseInProject={handleUseInProject}
          onIgnore={() => setReceivedOrder(null)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" onClick={() => { setDeleteTarget(null); setDeleteInput('') }}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Eliminar encomenda</h2>
            <p className="text-sm text-text-muted">
              Tens a certeza que queres eliminar <span className="font-medium text-text-primary">{orders.find(o => o.id === deleteTarget)?.part_name}</span>? Esta acção é irreversível.
            </p>
            <p className="text-xs text-text-muted">Escreve <span className="font-mono font-bold text-danger">ELIMINAR</span> para confirmar.</p>
            <input autoFocus value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="ELIMINAR"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-danger" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteTarget(null); setDeleteInput('') }} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                disabled={deleteInput !== 'ELIMINAR' || deleteOrder.isPending}
                onClick={() => { deleteOrder.mutate(deleteTarget!); setDeleteTarget(null); setDeleteInput('') }}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 transition-colors"
              >
                {deleteOrder.isPending ? 'A eliminar...' : 'Eliminar'}
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
