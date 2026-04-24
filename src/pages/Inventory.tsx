import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from '@/hooks/useInventory'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InventoryItem } from '@/lib/supabase'
import { fmtGBP, fmtDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, AlertTriangle, Wrench, Package, Beaker, Building } from 'lucide-react'

const categories = ['Peças', 'Consumíveis', 'Ferramentas', 'Patrimônio'] as const
type Category = typeof categories[number]

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
})

type FormData = z.infer<typeof schema>

const CATEGORY_ICONS: Record<Category, typeof Package> = {
  'Peças': Package,
  'Consumíveis': Beaker,
  'Ferramentas': Wrench,
  'Patrimônio': Building,
}

function ItemRow({ item, onEdit, onDelete }: { item: InventoryItem; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  const low = item.quantity < item.min_stock

  return (
    <tr className={`border-b border-border hover:bg-surface/50 transition-colors ${low ? 'bg-warning/3' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {low && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
          <span className="text-sm font-medium text-text-primary">{item.item_name}</span>
        </div>
        {item.supplier && <p className="text-xs text-text-muted mt-0.5">{t('inventory.supplier')}: {item.supplier}</p>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-bold ${low ? 'text-warning' : 'text-text-primary'}`}>{item.quantity}</span>
        <span className="text-text-muted text-xs"> / {item.min_stock} mín</span>
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">{item.location || '—'}</td>
      <td className="px-4 py-3 text-sm text-text-primary">{fmtGBP(item.unit_cost)}</td>
      {(item.category === 'Ferramentas' || item.category === 'Patrimônio') && (
        <td className="px-4 py-3 text-xs text-text-muted">
          {item.calibration_date ? <p>{t('inventory.fields.calibration')}: {fmtDate(item.calibration_date)}</p> : null}
          {item.next_maintenance ? <p>{t('inventory.fields.maintenance')}: {fmtDate(item.next_maintenance)}</p> : null}
        </td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
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

export function Inventory() {
  const { t } = useTranslation()
  const { data: inventory = [], isLoading } = useInventory()
  const create = useCreateInventoryItem()
  const update = useUpdateInventoryItem()
  const remove = useDeleteInventoryItem()

  const [activeTab, setActiveTab] = useState<Category>('Peças')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { category: 'Peças', quantity: 0, min_stock: 5, unit_cost: 0 },
  })

  function openNew(cat: Category) {
    setEditing(null)
    reset({ category: cat, quantity: 0, min_stock: 5, unit_cost: 0 })
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
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload })
    } else {
      await create.mutateAsync(payload as Parameters<typeof create.mutateAsync>[0])
    }
    setModalOpen(false)
  }

  const isToolOrAsset = watch('category') === 'Ferramentas' || watch('category') === 'Patrimônio'

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('inventory.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('inventory.itemsRegistered', { count: inventory.length })}</p>
        </div>
        <Button onClick={() => openNew(activeTab)} size="sm">
          <Plus className="h-4 w-4" /> {t('inventory.new')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
        <TabsList>
          {categories.map(cat => {
            const Icon = CATEGORY_ICONS[cat]
            const count = inventory.filter(i => i.category === cat).length
            const lowCount = inventory.filter(i => i.category === cat && i.quantity < i.min_stock).length
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {t(`categoryMap.${cat}`, { defaultValue: cat })}
                {lowCount > 0 && <span className="ml-1 h-4 min-w-4 rounded-full bg-warning text-black text-xs font-bold flex items-center justify-center px-1">{lowCount}</span>}
                <span className="text-text-muted ml-0.5">({count})</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {categories.map(cat => {
          const items = inventory.filter(i => i.category === cat)
          const showCalColumns = cat === 'Ferramentas' || cat === 'Patrimônio'
          return (
            <TabsContent key={cat} value={cat}>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{t('inventory.fields.name')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{t('inventory.fields.quantityLabel')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{t('inventory.fields.location')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{t('inventory.fields.price')}</th>
                      {showCalColumns && <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{t('inventory.fields.dates')}</th>}
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {items.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-text-muted text-sm">{t('inventory.noItemsInCategory')}</td></tr>
                    ) : (
                      items.map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          onEdit={() => openEdit(item)}
                          onDelete={() => remove.mutate(item.id)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('inventory.editItem') : t('inventory.newItem')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('inventory.fields.itemName')} *</Label>
              <Input {...register('item_name')} placeholder="ex: Pasta térmica Arctic MX-4" />
              {errors.item_name && <p className="text-xs text-danger">{t('common.required')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('inventory.fields.category')}</Label>
              <Select value={watch('category')} onValueChange={(v) => setValue('category', v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{t(`categoryMap.${c}`, { defaultValue: c })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t('inventory.fields.quantityLabel')}</Label>
                <Input type="number" {...register('quantity')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('inventory.fields.minStockLabel')}</Label>
                <Input type="number" {...register('min_stock')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('inventory.fields.unitCost')}</Label>
                <Input type="number" step="0.01" {...register('unit_cost')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('inventory.fields.location')}</Label>
                <Input {...register('location')} placeholder={t('inventory.fields.locationPlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('inventory.fields.supplier')}</Label>
                <Input {...register('supplier')} placeholder={t('inventory.fields.supplierPlaceholder')} />
              </div>
            </div>
            {isToolOrAsset && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('inventory.fields.calibrationDate')}</Label>
                  <Input type="date" {...register('calibration_date')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('inventory.fields.nextMaintenance')}</Label>
                  <Input type="date" {...register('next_maintenance')} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t('inventory.fields.notes')}</Label>
              <Textarea {...register('notes')} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : editing ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
