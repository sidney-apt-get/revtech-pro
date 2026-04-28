import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { useTranslation } from 'react-i18next'
import { useInventory, useUpdateInventoryItem, useDeleteInventoryItem } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'
import { fmtGBP, fmtDate, cn } from '@/lib/utils'
import { ArrowLeft, Pencil, Trash2, Plus, Minus, Package, Wrench, Droplets, Cpu } from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Peças': <Package className="h-4 w-4" />,
  'Ferramentas': <Wrench className="h-4 w-4" />,
  'Consumíveis': <Droplets className="h-4 w-4" />,
  'Patrimônio': <Cpu className="h-4 w-4" />,
}

const CONTEXT_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: 'Novo', cls: 'bg-success/10 text-success border-success/20' },
  cannibalized: { label: '♻️ Reaproveitado', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  lot: { label: '📦 Lote', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  )
}

export function InventoryDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { data: items = [], isLoading } = useInventory()
  const { data: projects = [] } = useProjects()
  const updateItem = useUpdateInventoryItem()
  const deleteItem = useDeleteInventoryItem()

  const [deleteInput, setDeleteInput] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [qtySaving, setQtySaving] = useState(false)

  const item = items.find(i => i.id === id) ?? null
  const sourceProject = item?.source_project_id ? projects.find(p => p.id === item!.source_project_id) ?? null : null

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Item não encontrado.</p>
        <button onClick={() => navigate('/inventory')} className="mt-4 text-accent hover:underline text-sm">← Voltar</button>
      </div>
    )
  }

  const totalValue = item.quantity * item.unit_cost
  const stockLow = item.quantity <= item.min_stock
  const ctx = (item.item_context ?? 'new') as keyof typeof CONTEXT_BADGE
  const badge = CONTEXT_BADGE[ctx] ?? CONTEXT_BADGE.new

  async function adjustQty(delta: number) {
    const next = Math.max(0, item!.quantity + delta)
    setQtySaving(true)
    try { await updateItem.mutateAsync({ id: item!.id, quantity: next }) } finally { setQtySaving(false) }
  }

  async function handleDelete() {
    await deleteItem.mutateAsync(item!.id)
    navigate('/inventory')
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/inventory')} className="p-2 rounded-lg border border-border bg-surface hover:bg-accent/5 text-text-muted hover:text-accent transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-text-muted">{CATEGORY_ICONS[item.category]}</span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', badge.cls)}>{badge.label}</span>
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-text-muted">{item.category}</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{item.item_name}</h1>
            {item.supplier && <p className="text-sm text-text-muted">{item.supplier}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate('/inventory')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-accent/5 hover:border-accent/40 text-sm text-text-muted hover:text-accent transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button onClick={() => setDeleteOpen(true)} className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-danger hover:border-danger/30 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stock cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={cn('rounded-xl border p-4 text-center', stockLow ? 'border-danger/30 bg-danger/5' : 'border-border bg-card')}>
          <p className="text-xs text-text-muted mb-2">Quantidade</p>
          <div className="flex items-center justify-center gap-3">
            <button disabled={qtySaving || item.quantity === 0} onClick={() => adjustQty(-1)}
              className="h-7 w-7 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-danger hover:border-danger/40 disabled:opacity-30 transition-colors">
              <Minus className="h-3 w-3" />
            </button>
            <span className={cn('text-2xl font-bold', stockLow ? 'text-danger' : 'text-text-primary')}>{item.quantity}</span>
            <button disabled={qtySaving} onClick={() => adjustQty(1)}
              className="h-7 w-7 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-success hover:border-success/40 disabled:opacity-30 transition-colors">
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {stockLow && <p className="text-[10px] text-danger mt-1">Abaixo do mínimo</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-text-muted mb-1">Stock mínimo</p>
          <p className="text-2xl font-bold text-text-primary">{item.min_stock}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-text-muted mb-1">Custo unitário</p>
          <p className="text-base font-bold text-text-primary">{fmtGBP(item.unit_cost)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-text-muted mb-1">Valor em stock</p>
          <p className="text-base font-bold text-text-primary">{fmtGBP(totalValue)}</p>
          <p className="text-[10px] text-text-muted mt-0.5">{item.quantity} × {fmtGBP(item.unit_cost)}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Detalhes</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label="Categoria" value={item.category} />
            <InfoRow label="Localização" value={item.location} />
            <InfoRow label="Fornecedor" value={item.supplier} />
            <InfoRow label="Adicionado" value={fmtDate(item.created_at)} />
            <InfoRow label="Última actualização" value={fmtDate(item.updated_at)} />
            {item.calibration_date && <InfoRow label="Calibração" value={fmtDate(item.calibration_date)} />}
            {item.next_maintenance && <InfoRow label="Próx. manutenção" value={fmtDate(item.next_maintenance)} />}
          </div>
          {item.notes && (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm text-text-primary">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Origin (if cannibalized) */}
        {item.item_context === 'cannibalized' && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">♻️ Origem — Reaproveitada</h2>
            <div className="grid grid-cols-1 gap-y-3">
              {item.cannibalization_reason && <InfoRow label="Motivo" value={item.cannibalization_reason} />}
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Testada</p>
                <p className={cn('text-sm font-semibold', item.condition_tested ? 'text-success' : 'text-text-muted')}>
                  {item.condition_tested ? '✓ Sim' : 'Não verificado'}
                </p>
              </div>
              {sourceProject ? (
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Projecto de origem</p>
                  <button
                    onClick={() => navigate(`/projects/${sourceProject.id}`)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-accent/40 hover:text-accent transition-colors w-full text-left"
                  >
                    <span className="font-medium text-text-primary truncate">{sourceProject.equipment}</span>
                    {sourceProject.ticket_number && <span className="text-xs font-mono text-accent/70 shrink-0">{sourceProject.ticket_number}</span>}
                  </button>
                </div>
              ) : item.source_project_id ? (
                <InfoRow label="ID do projecto" value={<span className="font-mono text-xs">{item.source_project_id}</span>} />
              ) : null}
            </div>
          </div>
        )}

        {/* Photos */}
        {item.photos && item.photos.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Fotos ({item.photos.length})</h2>
            <div className="grid grid-cols-3 gap-2">
              {item.photos.map((photo, i) => (
                <img key={i} src={photo} alt={`Foto ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" onClick={() => { setDeleteOpen(false); setDeleteInput('') }}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Eliminar item</h2>
            <p className="text-sm text-text-muted">Tens a certeza que queres eliminar <span className="font-medium text-text-primary">{item.item_name}</span>?</p>
            <p className="text-xs text-text-muted">Escreve <span className="font-mono font-bold text-danger">ELIMINAR</span> para confirmar.</p>
            <input autoFocus value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="ELIMINAR"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-danger" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteOpen(false); setDeleteInput('') }} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button disabled={deleteInput !== 'ELIMINAR' || deleteItem.isPending} onClick={handleDelete}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 transition-colors">
                {deleteItem.isPending ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
