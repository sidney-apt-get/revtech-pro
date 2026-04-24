import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder } from '@/hooks/useOrders'
import { useProjects } from '@/hooks/useProjects'
import { type PartsOrder } from '@/lib/supabase'
import { fmtDate, fmtGBP } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plus, X, ExternalLink, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react'
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

        {/* Status timeline */}
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
              {/* Status buttons */}
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
          {/* Quick links */}
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
                  <option key={p.id} value={p.id}>
                    {p.ticket_number ? `${p.ticket_number} — ` : ''}{p.equipment}
                  </option>
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
              <input type="number" min="1" value={form.quantity ?? 1} onChange={e => set('quantity', parseInt(e.target.value))}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.unitCost')}</label>
              <input type="number" step="0.01" value={form.unit_cost ?? ''} onChange={e => set('unit_cost', parseFloat(e.target.value))}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">{t('orders.fields.totalCost')}</label>
              <input type="number" step="0.01" value={form.total_cost ?? ''} onChange={e => set('total_cost', parseFloat(e.target.value))}
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

export function PartsOrders() {
  const { t } = useTranslation()
  const { data: orders = [], isLoading } = useOrders()
  const updateOrder = useUpdateOrder()
  const deleteOrder = useDeleteOrder()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = orders.filter(o => {
    if (filterStatus && o.status !== filterStatus) return false
    if (filterSupplier && !o.supplier.toLowerCase().includes(filterSupplier.toLowerCase())) return false
    return true
  })

  const totalPending = orders.filter(o => ['Encomendado', 'Em Trânsito'].includes(o.status)).length
  const totalCost = orders.filter(o => o.status !== 'Cancelado').reduce((s, o) => s + (o.total_cost ?? 0), 0)

  function handleStatusChange(id: string, status: PartsOrder['status']) {
    const update: Partial<PartsOrder> & { id: string } = { id, status }
    if (status === 'Entregue') update.delivered_at = new Date().toISOString().split('T')[0]
    updateOrder.mutate(update)
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

      {/* Stats */}
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

      {/* Filters */}
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
            <OrderCard key={o.id} order={o} onUpdateStatus={handleStatusChange} onDelete={id => deleteOrder.mutate(id)} />
          ))}
        </div>
      )}

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
