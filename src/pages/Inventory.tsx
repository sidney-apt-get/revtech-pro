import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { NumberInput } from '@/components/NumberInput'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { lookupBarcode } from '@/lib/productLookup'
import type { InventoryItem } from '@/lib/supabase'
import { fmtGBP, fmtDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, AlertTriangle, ScanLine, Package } from 'lucide-react'

const categories = ['Peças', 'Consumíveis', 'Ferramentas', 'Patrimônio'] as const
type Category = typeof categories[number]

type ContextTab = 'all' | 'new' | 'cannibalized' | 'lot' | 'consumables' | 'tools'

const schema = z.object({
  item_name: z.string().min(1),
  category: z.enum(categories),
  quantity: z.coerce.number().int().min(0).default(0),
  min_stock: z.coerce.number().int().min(0).default(5),
  unit_cost: z.coerce.number().min(0).default(0),
  location: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  calibration_date: z.string().optional(),
  next_maintenance: z.string().optional(),
  item_context: z.enum(['new', 'cannibalized', 'lot']).default('new'),
  lot_id: z.string().optional(),
  source_project_id: z.string().optional(),
  cannibalization_reason: z.string().optional(),
  condition_tested: z.boolean().default(false),
})
type FormData = z.infer<typeof schema>

function ContextBadge({ ctx }: { ctx?: string | null }) {
  if (ctx === 'cannibalized') return (
    <span className="text-[10px] font-semibold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-full">♻️ Reaproveitada</span>
  )
  if (ctx === 'lot') return (
    <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full">📦 Lote</span>
  )
  return null
}

interface ItemRowProps {
  item: InventoryItem
  onEdit: () => void
  onDelete: () => void
}

function ItemRow({ item, onEdit, onDelete }: ItemRowProps) {
  const low = item.quantity < item.min_stock
  const thumb = item.photos?.[0]

  return (
    <tr className={`border-b border-border group hover:bg-surface/50 transition-colors ${low ? 'bg-warning/3' : ''}`}>
      <td className="px-3 py-2.5 w-12">
        {thumb
          ? <img src={thumb} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
          : <div className="h-10 w-10 rounded-lg bg-surface border border-border flex items-center justify-center"><Package className="h-4 w-4 text-text-muted" /></div>
        }
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {low && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
          <span className="text-sm font-medium text-text-primary">{item.item_name}</span>
          <ContextBadge ctx={item.item_context} />
        </div>
        {item.supplier && <p className="text-xs text-text-muted mt-0.5">{item.supplier}</p>}
      </td>
      <td className="px-3 py-2.5 text-sm">
        <span className={`font-bold ${low ? 'text-warning' : 'text-text-primary'}`}>{item.quantity}</span>
        <span className="text-text-muted text-xs"> / {item.min_stock}</span>
      </td>
      <td className="px-3 py-2.5 text-sm text-text-muted">{item.location || '—'}</td>
      <td className="px-3 py-2.5 text-sm text-text-primary">{fmtGBP(item.unit_cost)}</td>
      {(item.category === 'Ferramentas' || item.category === 'Patrimônio') && (
        <td className="px-3 py-2.5 text-xs text-text-muted">
          {item.calibration_date && <p>Cal: {fmtDate(item.calibration_date)}</p>}
          {item.next_maintenance && <p>Maint: {fmtDate(item.next_maintenance)}</p>}
        </td>
      )}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-accent transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-danger transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

const TABS: { id: ContextTab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'new', label: '🆕 Novas' },
  { id: 'cannibalized', label: '♻️ Reaproveitadas' },
  { id: 'lot', label: '📦 Lotes' },
  { id: 'consumables', label: 'Consumíveis' },
  { id: 'tools', label: 'Ferramentas' },
]

function filterByTab(items: InventoryItem[], tab: ContextTab): InventoryItem[] {
  switch (tab) {
    case 'all': return items
    case 'new': return items.filter(i => !i.item_context || i.item_context === 'new')
    case 'cannibalized': return items.filter(i => i.item_context === 'cannibalized')
    case 'lot': return items.filter(i => i.item_context === 'lot')
    case 'consumables': return items.filter(i => i.category === 'Consumíveis')
    case 'tools': return items.filter(i => i.category === 'Ferramentas' || i.category === 'Patrimônio')
    default: return items
  }
}

export function Inventory() {
  const { t } = useTranslation()
  useEffect(() => { document.title = 'Inventário — RevTech PRO' }, [])
  const { data: inventory = [], isLoading } = useInventory()
  const create = useCreateInventoryItem()
  const update = useUpdateInventoryItem()
  const remove = useDeleteInventoryItem()

  const [activeTab, setActiveTab] = useState<ContextTab>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { category: 'Peças', quantity: 0, min_stock: 5, unit_cost: 0, item_context: 'new', condition_tested: false },
  })

  const watchedContext = watch('item_context')
  const isToolOrAsset = watch('category') === 'Ferramentas' || watch('category') === 'Patrimônio'

  async function handleScanDetected(code: string) {
    setScannerOpen(false)
    const match = inventory.find(i => i.item_name.toLowerCase().includes(code.toLowerCase()))
    if (match) { openEdit(match); return }
    openNew()
    setValue('item_name', code)
    const info = await lookupBarcode(code)
    if (info) {
      if (info.name) setValue('item_name', info.name)
      if (info.brand) setValue('supplier', info.brand)
    }
  }

  function openNew() {
    setEditing(null)
    reset({ category: 'Peças', quantity: 0, min_stock: 5, unit_cost: 0, item_context: 'new', condition_tested: false })
    setModalOpen(true)
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    reset({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      min_stock: item.min_stock,
      unit_cost: item.unit_cost,
      location: item.location ?? '',
      supplier: item.supplier ?? '',
      notes: item.notes ?? '',
      calibration_date: item.calibration_date ?? '',
      next_maintenance: item.next_maintenance ?? '',
      item_context: item.item_context ?? 'new',
      lot_id: item.lot_id ?? '',
      source_project_id: item.source_project_id ?? '',
      cannibalization_reason: item.cannibalization_reason ?? '',
      condition_tested: item.condition_tested ?? false,
    })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      item_name: data.item_name,
      category: data.category,
      quantity: data.quantity,
      min_stock: data.min_stock,
      unit_cost: data.unit_cost,
      location: data.location || null,
      supplier: data.supplier || null,
      notes: data.notes || null,
      calibration_date: data.calibration_date || null,
      next_maintenance: data.next_maintenance || null,
      item_context: data.item_context,
      lot_id: data.lot_id || null,
      source_project_id: data.source_project_id || null,
      cannibalization_reason: data.cannibalization_reason || null,
      condition_tested: data.condition_tested,
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload })
    } else {
      await create.mutateAsync(payload as Parameters<typeof create.mutateAsync>[0])
    }
    setModalOpen(false)
  }

  const tabItems = filterByTab(inventory, activeTab)
  const lowCount = inventory.filter(i => i.quantity < i.min_stock).length

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('inventory.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {inventory.length} itens
            {lowCount > 0 && <span className="ml-2 text-warning font-medium">· {lowCount} com stock baixo</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            title={t('inventory.scan')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-accent transition-colors"
          >
            <ScanLine className="h-4 w-4" />
          </button>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" /> {t('inventory.new')}
          </Button>
        </div>
      </div>

      {/* Context tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const count = filterByTab(inventory, tab.id).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-text-muted hover:text-text-primary hover:border-accent/40'
              }`}
            >
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-3 py-2.5 w-12"></th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Nome</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Qty / Mín</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Local</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Custo</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {tabItems.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-text-muted text-sm">{t('inventory.noItemsInCategory')}</td></tr>
            ) : (
              tabItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={o => !o && setModalOpen(false)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('inventory.editItem') : t('inventory.newItem')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="p-4 pt-2 space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome do item *</Label>
              <Input {...register('item_name')} placeholder="ex: Pasta térmica Arctic MX-4" />
              {errors.item_name && <p className="text-xs text-danger">Campo obrigatório</p>}
            </div>

            {/* Categoria + Contexto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  value={watch('category')}
                  onChange={e => setValue('category', e.target.value as Category)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{t(`categoryMap.${c}`, { defaultValue: c })}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <select
                  value={watchedContext}
                  onChange={e => setValue('item_context', e.target.value as 'new' | 'cannibalized' | 'lot')}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="new">{t('inventory.context.new')}</option>
                  <option value="cannibalized">♻️ {t('inventory.context.cannibalized')}</option>
                  <option value="lot">📦 {t('inventory.context.lot')}</option>
                </select>
              </div>
            </div>

            {watchedContext === 'cannibalized' && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo de reaproveitamento</Label>
                  <Input {...register('cannibalization_reason')} placeholder="Porquê foi retirada esta peça?" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="condition_tested" {...register('condition_tested')} className="rounded" />
                  <Label htmlFor="condition_tested" className="text-sm cursor-pointer">Condição testada / verificada</Label>
                </div>
              </div>
            )}

            {watchedContext === 'cannibalized' && (
              <div className="space-y-1.5">
                <Label className="text-xs">ID do projecto de origem (opcional)</Label>
                <Input {...register('source_project_id')} placeholder="UUID do projecto" />
              </div>
            )}

            {/* Quantidade, Stock mín, Custo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <NumberInput
                  value={watch('quantity')}
                  onChange={v => setValue('quantity', v)}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock mínimo</Label>
                <NumberInput
                  value={watch('min_stock')}
                  onChange={v => setValue('min_stock', v)}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Custo unit. (£)</Label>
                <NumberInput
                  value={watch('unit_cost')}
                  onChange={v => setValue('unit_cost', v)}
                  isDecimal
                  step="0.01"
                  min={0}
                />
              </div>
            </div>

            {/* Localização + Fornecedor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Localização</Label>
                <Input {...register('location')} placeholder="Prateleira A1" />
              </div>
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Input {...register('supplier')} placeholder="AliExpress, Amazon..." />
              </div>
            </div>

            {/* Ferramentas/Patrimônio */}
            {isToolOrAsset && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Data de calibração</Label>
                  <Input type="date" {...register('calibration_date')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Próxima manutenção</Label>
                  <Input type="date" {...register('next_maintenance')} />
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea {...register('notes')} rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : editing ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <DeleteConfirmation
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            remove.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
        itemName={deleteTarget?.item_name}
        loading={remove.isPending}
      />

      {/* QR barcode scanner */}
      {scannerOpen && (
        <BarcodeScanner
          title={t('inventory.scan')}
          onDetected={handleScanDetected}
          onClose={() => setScannerOpen(false)}
        />
      )}

    </div>
  )
}
