import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'wouter'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from '@/hooks/useInventory'
import { useCategories } from '@/hooks/useCategories'
import { saveItemFieldValues } from '@/hooks/useItemFieldValues'
import { DynamicFields } from '@/components/DynamicFields'
import { supabase } from '@/lib/supabase'
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
import { Plus, Pencil, Trash2, AlertTriangle, ScanLine, Package, Search } from 'lucide-react'

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
  entry_date: z.string().optional(),
  barcode: z.string().optional(),
  supplier_ref: z.string().optional(),
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
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onRowClick: () => void
}

function ItemRow({ item, onEdit, onDelete, onRowClick }: ItemRowProps) {
  const low = item.quantity < item.min_stock
  const thumb = item.photos?.[0]
  const totalValue = item.quantity * item.unit_cost

  return (
    <tr
      onClick={onRowClick}
      className={`border-b border-border group hover:bg-surface/50 transition-colors cursor-pointer ${low ? 'bg-warning/3' : ''}`}
    >
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
      <td className="px-3 py-2.5 text-sm text-text-primary">{fmtGBP(item.unit_cost)}</td>
      <td className="px-3 py-2.5 text-sm text-text-primary hidden md:table-cell">{fmtGBP(totalValue)}</td>
      <td className="px-3 py-2.5 text-sm text-text-muted hidden md:table-cell">{item.location || '—'}</td>
      <td className="px-3 py-2.5 text-xs text-text-muted hidden lg:table-cell">
        {item.entry_date ? fmtDate(item.entry_date) : fmtDate(item.created_at)}
      </td>
      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
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

const today = new Date().toISOString().split('T')[0]

export function Inventory() {
  const { t, i18n } = useTranslation()
  const [, navigate] = useLocation()
  useEffect(() => { document.title = 'Inventário — RevTech PRO' }, [])
  const { data: inventory = [], isLoading } = useInventory()
  const create = useCreateInventoryItem()
  const update = useUpdateInventoryItem()
  const remove = useDeleteInventoryItem()

  const [activeTab, setActiveTab] = useState<ContextTab>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [dynCategorySlug, setDynCategorySlug] = useState('')
  const [dynValues, setDynValues] = useState<Record<string, string>>({})
  const { categories: subCategories } = useCategories('inventory')
  const targetLang = (i18n.language.startsWith('en') ? 'en' : 'pt') as 'pt' | 'en'

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      category: 'Peças', quantity: 0, min_stock: 5, unit_cost: 0,
      item_context: 'new', condition_tested: false, entry_date: today,
    },
  })

  const watchedContext = watch('item_context')
  const isToolOrAsset = watch('category') === 'Ferramentas' || watch('category') === 'Patrimônio'

  const tabItems = filterByTab(inventory, activeTab)
  const filteredItems = useMemo(() => {
    if (!search.trim()) return tabItems
    const q = search.toLowerCase()
    return tabItems.filter(i =>
      i.item_name.toLowerCase().includes(q) ||
      i.supplier?.toLowerCase().includes(q) ||
      i.location?.toLowerCase().includes(q) ||
      i.barcode?.toLowerCase().includes(q)
    )
  }, [tabItems, search])

  const lowCount = inventory.filter(i => i.quantity < i.min_stock).length

  async function handleScanDetected(code: string) {
    setScannerOpen(false)
    const byBarcode = inventory.find(i => i.barcode === code)
    if (byBarcode) { navigate(`/inventory/${byBarcode.id}`); return }
    const byName = inventory.find(i => i.item_name.toLowerCase().includes(code.toLowerCase()))
    if (byName) { navigate(`/inventory/${byName.id}`); return }
    openNew()
    setValue('barcode', code)
    setValue('item_name', code)
    const info = await lookupBarcode(code)
    if (info) {
      if (info.name) setValue('item_name', info.name)
      if (info.brand) setValue('supplier', info.brand)
    }
  }

  function openNew() {
    setEditing(null)
    setDynCategorySlug('')
    setDynValues({})
    reset({
      category: 'Peças', quantity: 0, min_stock: 5, unit_cost: 0,
      item_context: 'new', condition_tested: false, entry_date: today,
    })
    setModalOpen(true)
  }

  async function openEdit(item: InventoryItem) {
    setEditing(item)
    setDynCategorySlug(item.category_slug ?? '')
    const { data } = await supabase.from('item_field_values').select('field_key, value')
      .eq('item_id', item.id).eq('item_type', 'inventory')
    const map: Record<string, string> = {}
    if (data) for (const row of data) if (row.field_key && row.value != null) map[row.field_key] = row.value
    setDynValues(map)
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
      entry_date: item.entry_date ?? today,
      barcode: item.barcode ?? '',
      supplier_ref: item.supplier_ref ?? '',
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
      entry_date: data.entry_date || null,
      barcode: data.barcode || null,
      supplier_ref: data.supplier_ref || null,
      category_slug: dynCategorySlug || null,
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload })
      await saveItemFieldValues(editing.id, 'inventory', dynValues)
    } else {
      const newItem = await create.mutateAsync(payload as Parameters<typeof create.mutateAsync>[0])
      if (newItem?.id) await saveItemFieldValues(newItem.id, 'inventory', dynValues)
    }
    setModalOpen(false)
  }

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('inventory.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {inventory.length} itens
            {lowCount > 0 && <span className="ml-2 text-warning font-medium">· {lowCount} com stock baixo</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('inventory.search')}
              className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={() => setScannerOpen(true)}
            title={t('inventory.scan')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-accent transition-colors shrink-0"
          >
            <ScanLine className="h-4 w-4" />
          </button>
          <Button onClick={openNew} size="sm" className="shrink-0">
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
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Custo</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">{t('inventory.totalValue')}</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Local</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">{t('inventory.entry_date')}</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {filteredItems.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-text-muted text-sm">
                {search ? t('inventory.noItems') : t('inventory.noItemsInCategory')}
              </td></tr>
            ) : (
              filteredItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onRowClick={() => navigate(`/inventory/${item.id}`)}
                  onEdit={e => { e.stopPropagation(); openEdit(item) }}
                  onDelete={e => { e.stopPropagation(); setDeleteTarget(item) }}
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

            {/* Sub-categoria */}
            {subCategories.length > 0 && (
              <div className="space-y-1.5">
                <Label>Sub-categoria</Label>
                <select
                  value={dynCategorySlug}
                  onChange={e => { setDynCategorySlug(e.target.value); setDynValues({}) }}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">— Nenhuma —</option>
                  {subCategories.map(c => (
                    <option key={c.slug} value={c.slug}>
                      {c.icon ? `${c.icon} ` : ''}{targetLang === 'en' ? c.name_en : c.name_pt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {dynCategorySlug && (
              <DynamicFields
                categorySlug={dynCategorySlug}
                values={dynValues}
                onChange={(key, val) => setDynValues(prev => ({ ...prev, [key]: val }))}
                language={targetLang}
              />
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

            {/* Barcode + Ref Fornecedor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('inventory.barcode')}</Label>
                <Input {...register('barcode')} placeholder="EAN / SKU" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('inventory.supplier_ref')}</Label>
                <Input {...register('supplier_ref')} placeholder="REF-12345" />
              </div>
            </div>

            {/* Data de entrada */}
            <div className="space-y-1.5">
              <Label>{t('inventory.entry_date')}</Label>
              <Input type="date" {...register('entry_date')} />
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

      {/* Barcode scanner */}
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
