import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'wouter'
import { useTranslation } from 'react-i18next'
import { useInventory, useUpdateInventoryItem, useDeleteInventoryItem } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'
import { useItemFieldValues } from '@/hooks/useItemFieldValues'
import { sendTelegramNotification } from '@/lib/telegram'
import { supabase, type ItemHistory } from '@/lib/supabase'
import { fmtGBP, fmtDate, cn } from '@/lib/utils'
import { TranslateButton } from '@/components/TranslateButton'
import { DynamicFieldsDisplay } from '@/components/DynamicFields'
import { ArrowLeft, Pencil, Trash2, Plus, Minus, Package, Wrench, Droplets, Cpu, Camera, X, Clock } from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Peças': <Package className="h-4 w-4" />,
  'Ferramentas': <Wrench className="h-4 w-4" />,
  'Consumíveis': <Droplets className="h-4 w-4" />,
  'Patrimônio': <Cpu className="h-4 w-4" />,
}

const CONTEXT_BADGE_CLS: Record<string, string> = {
  new: 'bg-success/10 text-success border-success/20',
  cannibalized: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  lot: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
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

async function compressImage(file: File): Promise<Blob> {
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
      canvas.width = width
      canvas.height = height
      const ctx2d = canvas.getContext('2d')!
      ctx2d.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Compression failed'))
      }, 'image/jpeg', 0.75)
    }
    img.onerror = reject
    img.src = url
  })
}

function EventIcon({ type }: { type: string }) {
  if (type === 'quantity_adjusted') return <span className="text-xs font-bold text-accent">±</span>
  if (type === 'movement_in') return <span className="text-xs font-bold text-success">↑</span>
  if (type === 'movement_out') return <span className="text-xs font-bold text-danger">↓</span>
  if (type === 'movement_sold') return <span className="text-xs font-bold text-warning">£</span>
  return <span className="text-xs text-text-muted">•</span>
}

function EventDetail({ event_type, event_data }: { event_type: string; event_data: Record<string, unknown> }) {
  if (event_type === 'quantity_adjusted') {
    const from = event_data.from as number
    const to = event_data.to as number
    const delta = to - from
    return (
      <span className={cn('text-xs font-medium', delta > 0 ? 'text-success' : 'text-danger')}>
        {from} → {to} ({delta > 0 ? '+' : ''}{delta})
      </span>
    )
  }
  return null
}

export function InventoryDetail() {
  const { t, i18n } = useTranslation()

  const CONTEXT_BADGE: Record<string, { label: string; cls: string }> = {
    new: { label: t('inventory.context.new'), cls: CONTEXT_BADGE_CLS.new },
    cannibalized: { label: '♻️ ' + t('inventory.context.cannibalized'), cls: CONTEXT_BADGE_CLS.cannibalized },
    lot: { label: '📦 ' + t('inventory.context.lot'), cls: CONTEXT_BADGE_CLS.lot },
  }

  const EVENT_LABELS: Record<string, string> = {
    quantity_adjusted: t('inventory.movement_adjusted'),
    movement_in: t('inventory.movement_in'),
    movement_out: t('inventory.movement_out'),
    movement_sold: t('inventory.movement_sold'),
    stock_out: t('stock_out.title'),
    part_used: t('history.events.used_in_project'),
    created: t('history.events.item_created'),
    updated: t('history.events.field_updated'),
  }
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { data: items = [], isLoading } = useInventory()
  const { data: projects = [] } = useProjects()
  const updateItem = useUpdateInventoryItem()
  const deleteItem = useDeleteInventoryItem()
  const fieldValues = useItemFieldValues(id ?? null, 'inventory')

  const [deleteInput, setDeleteInput] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [qtySaving, setQtySaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [history, setHistory] = useState<ItemHistory[]>([])
  const [noteTranslated, setNoteTranslated] = useState<string | null>(null)
  const [nameTranslated, setNameTranslated] = useState<string | null>(null)
  const [cannibalReasonTranslated, setCannibalReasonTranslated] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showStockOut, setShowStockOut] = useState(false)
  const [stockOutQty, setStockOutQty] = useState(1)
  const [stockOutReason, setStockOutReason] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [salePrice, setSalePrice] = useState(0)
  const [stockOutNotes, setStockOutNotes] = useState('')
  const [stockOutSuccess, setStockOutSuccess] = useState(false)

  const item = items.find(i => i.id === id) ?? null
  const sourceProject = item?.source_project_id ? projects.find(p => p.id === item!.source_project_id) ?? null : null
  const targetLang = i18n.language.startsWith('en') ? 'en' : 'pt' as 'pt' | 'en'

  useEffect(() => {
    if (item) document.title = `${item.item_name} — RevTech PRO`
  }, [item?.item_name])

  useEffect(() => {
    if (!id) return
    supabase
      .from('item_history')
      .select('*')
      .eq('item_id', id)
      .eq('item_type', 'inventory')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setHistory(data as ItemHistory[]) })
  }, [id])

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">{t('inventory_detail.notFound')}</p>
        <button onClick={() => navigate('/inventory')} className="mt-4 text-accent hover:underline text-sm">{t('inventory_detail.backToInventory')}</button>
      </div>
    )
  }

  const totalValue = item.quantity * item.unit_cost
  const stockLow = item.quantity <= item.min_stock
  const ctx = (item.item_context ?? 'new') as keyof typeof CONTEXT_BADGE
  const badge = CONTEXT_BADGE[ctx] ?? CONTEXT_BADGE.new
  const photos = item.photos ?? []

  const activeProjects = projects.filter(p =>
    p.status !== 'Vendido' && p.status !== 'Cancelado'
  )

  async function handleStockOut() {
    if (!item || !stockOutReason || stockOutQty < 1) return
    const newQty = Math.max(0, item.quantity - stockOutQty)
    try {
      await updateItem.mutateAsync({ id: item.id, quantity: newQty })
      const { data: { user } } = await supabase.auth.getUser()
      const { data: entry } = await supabase.from('item_history').insert({
        item_id: item.id,
        item_type: 'inventory',
        event_type: 'stock_out',
        event_data: {
          quantity: stockOutQty,
          reason: stockOutReason,
          project_id: selectedProjectId || null,
          sale_price: salePrice || null,
          notes: stockOutNotes,
        },
        notes: stockOutNotes || null,
        user_id: user?.id ?? null,
      }).select().single()
      if (entry) setHistory(prev => [entry as ItemHistory, ...prev])

      if (stockOutReason === 'project' && selectedProjectId) {
        const { data: proj } = await supabase.from('projects').select('parts_cost').eq('id', selectedProjectId).single()
        const newPartsCost = ((proj?.parts_cost ?? 0) as number) + item.unit_cost * stockOutQty
        await supabase.from('projects').update({ parts_cost: newPartsCost }).eq('id', selectedProjectId)
        await supabase.from('item_history').insert({
          item_id: selectedProjectId,
          item_type: 'project',
          event_type: 'part_used',
          event_data: {
            part_name: item.item_name,
            quantity: stockOutQty,
            cost: item.unit_cost * stockOutQty,
            inventory_id: item.id,
          },
          user_id: user?.id ?? null,
        })
      }

      if (newQty <= item.min_stock) {
        sendTelegramNotification(
          `⚠️ <b>Stock baixo após baixa</b>\n${item.item_name}: ${newQty} unidades restantes (mínimo: ${item.min_stock})`
        ).catch(() => {})
      }

      setShowStockOut(false)
      setStockOutQty(1)
      setStockOutReason('')
      setSelectedProjectId('')
      setSalePrice(0)
      setStockOutNotes('')
      setStockOutSuccess(true)
      setTimeout(() => setStockOutSuccess(false), 4000)
    } catch (err) {
      console.error('Stock out failed:', err)
    }
  }

  async function adjustQty(delta: number) {
    const from = item!.quantity
    const next = Math.max(0, from + delta)
    if (next === from) return
    setQtySaving(true)
    try {
      await updateItem.mutateAsync({ id: item!.id, quantity: next })
      const { data: { user } } = await supabase.auth.getUser()
      const { data: entry } = await supabase
        .from('item_history')
        .insert({
          item_id: item!.id,
          item_type: 'inventory',
          event_type: 'quantity_adjusted',
          event_data: { from, to: next, delta, reason: 'manual' },
          notes: null,
          user_id: user?.id ?? null,
        })
        .select()
        .single()
      if (entry) setHistory(prev => [entry as ItemHistory, ...prev])
      // Low stock telegram notification
      if (next <= item!.min_stock && from > item!.min_stock) {
        sendTelegramNotification(
          `⚠️ <b>Stock baixo</b>\n${item!.item_name}: ${next} unidades restantes\n(mínimo: ${item!.min_stock})`
        ).catch(() => {})
      }
    } finally {
      setQtySaving(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photos.length >= 3) return
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user!.id}/${item!.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('inventory-photos')
        .upload(path, compressed, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('inventory-photos').getPublicUrl(path)
      await updateItem.mutateAsync({ id: item!.id, photos: [...photos, publicUrl] })
    } catch (err) {
      console.error('Photo upload failed:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handlePhotoDelete(url: string) {
    await updateItem.mutateAsync({ id: item!.id, photos: photos.filter(p => p !== url) })
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
            <h1 className="text-xl font-bold text-text-primary">{nameTranslated ?? item.item_name}</h1>
            <TranslateButton
              value={nameTranslated ?? item.item_name}
              targetLang={targetLang}
              onTranslated={v => { setNameTranslated(v); updateItem.mutateAsync({ id: item.id, item_name: v }).catch(() => {}) }}
            />
            {item.supplier && <p className="text-sm text-text-muted">{item.supplier}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setShowStockOut(true); setStockOutQty(1); setStockOutReason(''); setSelectedProjectId(''); setSalePrice(0); setStockOutNotes('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-warning/40 bg-warning/5 hover:bg-warning/10 text-sm text-warning transition-colors"
          >
            📤 {t('stock_out.title')}
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-accent/5 hover:border-accent/40 text-sm text-text-muted hover:text-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
          </button>
          <button onClick={() => setDeleteOpen(true)} className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-danger hover:border-danger/30 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {stockOutSuccess && (
        <div className="rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success flex items-center gap-2">
          ✓ {t('stock_out.success')}
        </div>
      )}

      {/* Stock cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={cn('rounded-xl border p-4 text-center', stockLow ? 'border-danger/30 bg-danger/5' : 'border-border bg-card')}>
          <p className="text-xs text-text-muted mb-2">{t('inventory_detail.quantityLabel')}</p>
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
          {stockLow && <p className="text-[10px] text-danger mt-1">{t('inventory_detail.belowMin')}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-text-muted mb-1">{t('inventory_detail.minStockLabel')}</p>
          <p className="text-2xl font-bold text-text-primary">{item.min_stock}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-text-muted mb-1">{t('inventory_detail.unitCostLabel')}</p>
          <p className="text-base font-bold text-text-primary">{fmtGBP(item.unit_cost)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-text-muted mb-1">{t('inventory_detail.totalValueLabel')}</p>
          <p className="text-base font-bold text-text-primary">{fmtGBP(totalValue)}</p>
          <p className="text-[10px] text-text-muted mt-0.5">{item.quantity} × {fmtGBP(item.unit_cost)}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('inventory_detail.detailsSection')}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label={t('inventory_detail.categoryLabel')} value={item.category} />
            <InfoRow label={t('inventory_detail.locationLabel')} value={item.location} />
            <InfoRow label={t('inventory_detail.supplierLabel')} value={item.supplier} />
            <InfoRow label={t('inventory.entry_date')} value={item.entry_date ? fmtDate(item.entry_date) : fmtDate(item.created_at)} />
            {item.barcode && <InfoRow label={t('inventory.barcode')} value={<span className="font-mono text-xs">{item.barcode}</span>} />}
            {item.supplier_ref && <InfoRow label={t('inventory.supplier_ref')} value={item.supplier_ref} />}
            <InfoRow label={t('inventory_detail.lastUpdated')} value={fmtDate(item.updated_at)} />
            {item.calibration_date && <InfoRow label={t('inventory_detail.calibrationLabel')} value={fmtDate(item.calibration_date)} />}
            {item.next_maintenance && <InfoRow label={t('inventory_detail.nextMaintenanceLabel')} value={fmtDate(item.next_maintenance)} />}
          </div>
          {item.notes && (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t('inventory_detail.notesLabel')}</p>
              <p className="text-sm text-text-primary">
                {noteTranslated ?? item.notes}
              </p>
              <TranslateButton
                value={noteTranslated ?? item.notes}
                targetLang={targetLang}
                onTranslated={v => {
                  setNoteTranslated(v)
                  updateItem.mutateAsync({ id: item!.id, notes: v }).catch(() => {})
                }}
              />
            </div>
          )}
        </div>

        {/* Origin (if cannibalized) */}
        {item.item_context === 'cannibalized' && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">{t('inventory_detail.reclaimSection')}</h2>
            <div className="grid grid-cols-1 gap-y-3">
              {item.cannibalization_reason && (
                <div>
                  <InfoRow label={t('inventory_detail.reclaimReason')} value={cannibalReasonTranslated ?? item.cannibalization_reason} />
                  <TranslateButton
                    value={cannibalReasonTranslated ?? item.cannibalization_reason}
                    targetLang={targetLang}
                    onTranslated={v => { setCannibalReasonTranslated(v); updateItem.mutateAsync({ id: item.id, cannibalization_reason: v }).catch(() => {}) }}
                  />
                </div>
              )}
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{t('inventory_detail.testedLabel')}</p>
                <p className={cn('text-sm font-semibold', item.condition_tested ? 'text-success' : 'text-text-muted')}>
                  {item.condition_tested ? '✓ ' + t('common.yes') : t('common.no')}
                </p>
              </div>
              {sourceProject ? (
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t('inventory_detail.sourceProject')}</p>
                  <button
                    onClick={() => navigate(`/projects/${sourceProject.id}`)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-accent/40 hover:text-accent transition-colors w-full text-left"
                  >
                    <span className="font-medium text-text-primary truncate">{sourceProject.equipment}</span>
                    {sourceProject.ticket_number && <span className="text-xs font-mono text-accent/70 shrink-0">{sourceProject.ticket_number}</span>}
                  </button>
                </div>
              ) : item.source_project_id ? (
                <InfoRow label={t('inventory_detail.projectId')} value={<span className="font-mono text-xs">{item.source_project_id}</span>} />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic fields for this inventory item's sub-category */}
      <DynamicFieldsDisplay
        categorySlug={item.category_slug ?? null}
        values={fieldValues}
        language={targetLang}
      />

      {/* Photos */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {t('inventory.photos')} ({photos.length}/3)
          </h2>
          {photos.length < 3 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              {uploading ? 'A carregar...' : t('inventory.addPhoto')}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        {photos.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-lg border-2 border-dashed border-border py-8 flex flex-col items-center gap-2 text-text-muted hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
          >
            <Camera className="h-6 w-6" />
            <span className="text-sm">{t('inventory.addPhoto')}</span>
            <span className="text-xs">{t('inventory.maxPhotos')}</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-border" />
                <button
                  onClick={() => handlePhotoDelete(photo)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-text-muted hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Movement history */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-text-muted" />
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('inventory.history')}</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">{t('inventory.noHistory')}</p>
        ) : (
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
            <ul className="space-y-3">
              {history.map(entry => (
                <li key={entry.id} className="flex items-start gap-3 pl-1">
                  <div className="relative z-10 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center shrink-0 mt-0.5">
                    <EventIcon type={entry.event_type} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-text-primary font-medium">
                        {EVENT_LABELS[entry.event_type] ?? entry.event_type}
                      </span>
                      <EventDetail event_type={entry.event_type} event_data={entry.event_data} />
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {new Date(entry.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    {entry.notes && <p className="text-xs text-text-muted mt-0.5 italic">{entry.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Stock Out Modal */}
      {showStockOut && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] px-4" onClick={() => setShowStockOut(false)}>
          <div className="bg-[#1A1D27] rounded-xl p-6 w-full max-w-sm border border-[#2E3141] space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">📤 {t('stock_out.title')} — {item.item_name}</h3>
            <p className="text-gray-400 text-sm">
              {t('stock_out.current_stock')}: <strong className="text-white">{item.quantity}</strong> {t('stock_out.units')}
            </p>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 block">{t('stock_out.quantity_label')}</label>
              <input
                type="number" min={1} max={item.quantity}
                value={stockOutQty}
                onChange={e => setStockOutQty(Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-[#252836] border border-[#2E3141] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4F8EF7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 block">{t('stock_out.reason_label')}</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'project', label: `🔧 ${t('stock_out.reason_project')}` },
                  { value: 'sold',    label: `💰 ${t('stock_out.reason_sold')}` },
                  { value: 'broken',  label: `💔 ${t('stock_out.reason_broken')}` },
                  { value: 'adjustment', label: `✏️ ${t('stock_out.reason_adjustment')}` },
                ] as const).map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setStockOutReason(r.value)}
                    className={`p-3 rounded-lg border text-xs text-left transition-colors ${
                      stockOutReason === r.value
                        ? 'border-[#4F8EF7] bg-[#4F8EF7]/10 text-white'
                        : 'border-[#2E3141] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {stockOutReason === 'project' && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 block">{t('stock_out.select_project')}</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#252836] border border-[#2E3141] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4F8EF7]"
                >
                  <option value="">{t('stock_out.select_project')}</option>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.ticket_number ? `${p.ticket_number} — ` : ''}{p.equipment}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stockOutReason === 'sold' && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 block">{t('stock_out.sale_price')}</label>
                <input
                  type="number" step="0.01" min={0}
                  value={salePrice || ''}
                  onChange={e => setSalePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#252836] border border-[#2E3141] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4F8EF7]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-400 block">{t('stock_out.notes')}</label>
              <input
                type="text"
                value={stockOutNotes}
                onChange={e => setStockOutNotes(e.target.value)}
                placeholder="..."
                className="w-full bg-[#252836] border border-[#2E3141] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4F8EF7]"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowStockOut(false)}
                className="flex-1 bg-[#252836] text-gray-300 rounded-lg py-2 text-sm hover:bg-[#2E3141] transition-colors"
              >
                {t('stock_out.cancel')}
              </button>
              <button
                type="button"
                disabled={!stockOutReason || stockOutQty < 1 || updateItem.isPending}
                onClick={handleStockOut}
                className="flex-1 bg-[#4F8EF7] text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-30 hover:bg-[#4F8EF7]/90 transition-colors"
              >
                {updateItem.isPending ? t('common.saving') : t('stock_out.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" onClick={() => { setDeleteOpen(false); setDeleteInput('') }}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">{t('inventory_detail.deleteTitle')}</h2>
            <p className="text-sm text-text-muted">{t('delete.will_delete')}: <span className="font-medium text-text-primary">{item.item_name}</span>. {t('delete.irreversible')}</p>
            <p className="text-xs text-text-muted">{t('delete.instruction')} <span className="font-mono font-bold text-danger">{t('delete.confirm_word')}</span>.</p>
            <input autoFocus value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder={t('delete.confirm_word')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-danger" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteOpen(false); setDeleteInput('') }} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">{t('common.cancel')}</button>
              <button disabled={deleteInput !== t('delete.confirm_word') || deleteItem.isPending} onClick={handleDelete}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 transition-colors">
                {deleteItem.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
