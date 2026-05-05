import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ROICalculator } from './ROICalculator'
import { FinancialInput } from './FinancialInput'
import { BarcodeScanner } from './BarcodeScanner'
import { WarrantyModal } from './WarrantyModal'
import { PhotoUpload } from './PhotoUpload'
import { DynamicFields } from './DynamicFields'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import { useUploadPhoto } from '@/hooks/useProjectPhotos'
import { useCategories } from '@/hooks/useCategories'
import { saveItemFieldValues } from '@/hooks/useItemFieldValues'
import { supabase } from '@/lib/supabase'
import { sendTelegramNotification } from '@/lib/telegram'
import type { Project } from '@/lib/supabase'
import { ALL_STATUSES } from '@/lib/utils'
import { lookupBarcode } from '@/lib/productLookup'
import { ScanLine, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const STORAGE_OPTIONS = [16, 32, 64, 128, 256, 512, 1024]
const RAM_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 16]
const CONDITION_GRADES = ['A', 'B', 'C', 'D', 'Para peças'] as const
const IMEI_REGEX = /^\d{15}$/

function luhnValid(n: string): boolean {
  if (!IMEI_REGEX.test(n)) return false
  let sum = 0, alt = false
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i])
    if (alt) { d *= 2; if (d > 9) d -= 9 }
    sum += d; alt = !alt
  }
  return sum % 10 === 0
}

const schema = z.object({
  equipment: z.string().min(1, 'Obrigatório'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_reference: z.string().optional(),
  defect_description: z.string().min(1, 'Obrigatório'),
  diagnosis: z.string().optional(),
  supplier_name: z.string().optional(),
  buyer_name: z.string().optional(),
  purchase_price: z.coerce.number().min(0).default(0),
  parts_cost: z.coerce.number().min(0).default(0),
  shipping_in: z.coerce.number().min(0).default(0),
  shipping_out: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).optional().nullable(),
  sale_platform: z.string().optional(),
  status: z.enum(['Recebido','Em Diagnóstico','Aguardando Peças','Em Manutenção','Pronto para Venda','Vendido','Cancelado']).default('Recebido'),
  notes: z.string().optional(),
  imei: z.string().optional(),
  imei2: z.string().optional(),
  battery_capacity_original: z.coerce.number().int().positive().optional().nullable(),
  battery_capacity_current: z.coerce.number().int().positive().optional().nullable(),
  battery_health_percent: z.coerce.number().int().min(0).max(100).optional().nullable(),
  battery_cycles: z.coerce.number().int().min(0).optional().nullable(),
  device_color: z.string().optional(),
  storage_gb: z.coerce.number().int().positive().optional().nullable(),
  ram_gb: z.coerce.number().int().positive().optional().nullable(),
  condition_grade: z.enum(['A','B','C','D','Para peças']).optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface ProjectModalProps {
  open: boolean
  onClose: () => void
  project?: Project | null
}

const PLATFORMS = ['eBay UK', 'Back Market', 'CeX', 'Gumtree', 'Facebook Marketplace', 'Outro']

const NUM_CLS = 'flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text-primary placeholder:text-text-muted shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent'

function dataUrlToFile(dataUrl: string, name: string): File {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bstr = atob(data)
  const u8 = new Uint8Array(bstr.length)
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i)
  return new File([u8], name, { type: mime })
}

export function ProjectModal({ open, onClose, project }: ProjectModalProps) {
  const { t } = useTranslation()
  const create = useCreateProject()
  const update = useUpdateProject()
  const uploadPhoto = useUploadPhoto()
  const { categories } = useCategories('project')
  const [showScanner, setShowScanner] = useState(false)
  const [scanTarget, setScanTarget] = useState<'serial' | 'equipment'>('serial')
  const [warrantyProject, setWarrantyProject] = useState<{ id: string; equipment: string } | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [productImage, setProductImage] = useState<string | null>(null)
  const [deviceOpen, setDeviceOpen] = useState(false)
  const [localPhotos, setLocalPhotos] = useState<string[]>([])
  const [roiValues, setRoiValues] = useState({ purchasePrice: 0, partsCost: 0, shippingIn: 0, shippingOut: 0, salePrice: null as number | null })
  const [capOrig, setCapOrig] = useState<number | null>(null)
  const [capCur, setCapCur] = useState<number | null>(null)
  const [batteryHealthManual, setBatteryHealthManual] = useState<number | null>(null)
  const [categorySlug, setCategorySlug] = useState<string>('')
  const [dynValues, setDynValues] = useState<Record<string, string>>({})
  const [lotId, setLotId] = useState<string>('')
  const [activeLots, setActiveLots] = useState<Array<{ id: string; lot_number: string | null; supplier: string | null; purchase_price: number; estimated_items: number | null }>>([])

  useEffect(() => {
    supabase.from('lots').select('id, lot_number, supplier, purchase_price, estimated_items')
      .neq('status', 'completed').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setActiveLots(data) })
  }, [])

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      status: 'Recebido',
      purchase_price: 0,
      parts_cost: 0,
      shipping_in: 0,
      shipping_out: 0,
    },
  })

  useEffect(() => {
    if (!open) setLocalPhotos([])
  }, [open])

  useEffect(() => {
    if (project) {
      reset({
        equipment: project.equipment,
        brand: project.brand ?? '',
        model: project.model ?? '',
        serial_number: project.serial_number ?? '',
        defect_description: project.defect_description,
        diagnosis: project.diagnosis ?? '',
        supplier_name: project.supplier_name ?? '',
        buyer_name: project.buyer_name ?? '',
        purchase_reference: project.purchase_reference ?? '',
        purchase_price: project.purchase_price,
        parts_cost: project.parts_cost,
        shipping_in: project.shipping_in,
        shipping_out: project.shipping_out,
        sale_price: project.sale_price ?? undefined,
        sale_platform: project.sale_platform ?? '',
        status: project.status,
        notes: project.notes ?? '',
        imei: project.imei ?? '',
        imei2: project.imei2 ?? '',
        battery_capacity_original: project.battery_capacity_original ?? undefined,
        battery_capacity_current: project.battery_capacity_current ?? undefined,
        battery_health_percent: project.battery_health_percent ?? undefined,
        battery_cycles: project.battery_cycles ?? undefined,
        device_color: project.device_color ?? '',
        storage_gb: project.storage_gb ?? undefined,
        ram_gb: project.ram_gb ?? undefined,
        condition_grade: project.condition_grade ?? undefined,
      })
      const hasDevice = !!(project.imei || project.battery_health_percent || project.condition_grade)
      setDeviceOpen(hasDevice)
      setRoiValues({ purchasePrice: project.purchase_price, partsCost: project.parts_cost, shippingIn: project.shipping_in, shippingOut: project.shipping_out, salePrice: project.sale_price ?? null })
      setCapOrig(project.battery_capacity_original ?? null)
      setCapCur(project.battery_capacity_current ?? null)
      setBatteryHealthManual(project.battery_health_percent ?? null)

      // Load existing dynamic field values
      supabase.from('item_field_values').select('field_key, value')
        .eq('item_id', project.id).eq('item_type', 'project')
        .then(({ data }) => {
          if (!data) return
          const map: Record<string, string> = {}
          let slug = ''
          for (const row of data) {
            if (row.field_key === '_category_slug') { slug = row.value ?? ''; continue }
            if (row.field_key && row.value != null) map[row.field_key] = row.value
          }
          setCategorySlug(slug)
          setDynValues(map)
        })
    } else {
      reset({ status: 'Recebido', purchase_price: 0, parts_cost: 0, shipping_in: 0, shipping_out: 0 })
      setProductImage(null)
      setDeviceOpen(false)
      setRoiValues({ purchasePrice: 0, partsCost: 0, shippingIn: 0, shippingOut: 0, salePrice: null })
      setCapOrig(null)
      setCapCur(null)
      setBatteryHealthManual(null)
      setCategorySlug('')
      setDynValues({})
      setLotId('')
    }
  }, [project, reset, open])

  async function handleEquipmentScan(code: string) {
    setShowScanner(false)
    setValue('serial_number', code)
    setLookupLoading(true)
    try {
      const info = await lookupBarcode(code)
      if (info) {
        if (info.name) setValue('equipment', info.name)
        if (info.brand) setValue('brand', info.brand)
        if (info.model) setValue('model', info.model)
        if (info.imageUrl) setProductImage(info.imageUrl)
      }
    } finally {
      setLookupLoading(false)
    }
  }

  const calcHealth = capOrig && capCur && capOrig > 0 ? Math.min(100, Math.round((capCur / capOrig) * 100)) : null

  async function onSubmit(data: FormData) {
    const payload = {
      equipment: data.equipment,
      brand: data.brand || null,
      model: data.model || null,
      serial_number: data.serial_number || null,
      defect_description: data.defect_description,
      diagnosis: data.diagnosis || null,
      supplier_name: data.supplier_name || null,
      buyer_name: data.buyer_name || null,
      purchase_reference: data.purchase_reference || null,
      purchase_price: data.purchase_price,
      parts_cost: data.parts_cost,
      shipping_in: data.shipping_in,
      shipping_out: data.shipping_out,
      sale_price: data.sale_price ?? null,
      sale_platform: data.sale_platform || null,
      status: data.status,
      notes: data.notes || null,
      received_at: project?.received_at ?? new Date().toISOString(),
      sold_at: data.status === 'Vendido' ? (project?.sold_at ?? new Date().toISOString()) : null,
      lot_id: lotId || null,
      imei: data.imei || null,
      imei2: data.imei2 || null,
      battery_capacity_original: data.battery_capacity_original ?? null,
      battery_capacity_current: data.battery_capacity_current ?? null,
      battery_health_percent: calcHealth ?? batteryHealthManual ?? data.battery_health_percent ?? null,
      battery_cycles: data.battery_cycles ?? null,
      device_color: data.device_color || null,
      storage_gb: data.storage_gb ?? null,
      ram_gb: data.ram_gb ?? null,
      condition_grade: data.condition_grade ?? null,
    }
    const wasVendido = project?.status !== 'Vendido' && data.status === 'Vendido'
    let savedId = project?.id ?? ''
    const isNew = !project
    let ticketNumber = project?.ticket_number ?? ''

    if (project) {
      await update.mutateAsync({ id: project.id, ...payload })
      savedId = project.id
    } else {
      const created = await create.mutateAsync(payload as Parameters<typeof create.mutateAsync>[0])
      savedId = (created as { id: string; ticket_number?: string }).id
      ticketNumber = (created as { ticket_number?: string }).ticket_number ?? ''
    }

    // Save dynamic field values
    if (savedId) {
      const allDynValues: Record<string, string> = { ...dynValues }
      if (categorySlug) allDynValues['_category_slug'] = categorySlug
      if (Object.keys(allDynValues).length > 0) {
        await saveItemFieldValues(savedId, 'project', allDynValues).catch(() => {})
      }
    }

    // Upload any local photos
    if (savedId && localPhotos.length > 0) {
      for (let i = 0; i < localPhotos.length; i++) {
        if (localPhotos[i].startsWith('data:')) {
          const file = dataUrlToFile(localPhotos[i], `photo-${i + 1}.jpg`)
          await uploadPhoto.mutateAsync({ projectId: savedId, phase: 'recepcao', file }).catch(() => {})
        }
      }
    }

    // Telegram notifications
    if (isNew) {
      sendTelegramNotification(
        `🔧 <b>Novo projecto criado</b>\nTicket: ${ticketNumber}\nEquipamento: ${[data.brand, data.equipment].filter(Boolean).join(' ')}\nDefeito: ${data.defect_description}\nCompra: £${data.purchase_price}`
      ).catch(() => {})
    }

    if (wasVendido && savedId) {
      setWarrantyProject({ id: savedId, equipment: data.equipment })
    } else {
      onClose()
    }
  }

  const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? t('projects.modal.editTitle') : t('projects.modal.newTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-4 space-y-5">

          {/* Categoria do equipamento */}
          <div className="space-y-1.5">
            <Label>{t('projects.modal.categoryLabel')}</Label>
            <select
              value={categorySlug}
              onChange={e => { setCategorySlug(e.target.value); setDynValues({}) }}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{t('projects.modal.categoryPlaceholder')}</option>
              {categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.icon ? `${cat.icon} ` : ''}{cat.name_pt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <F label={t('projects.modal.equipmentLabel')} error={errors.equipment?.message}>
                <div className="flex gap-1.5 items-start">
                  <div className="flex-1">
                    <Input {...register('equipment')} placeholder="ex: MacBook Pro 2019" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setScanTarget('equipment'); setShowScanner(true) }}
                    title={t('projects.modal.scanProduct')}
                    className="shrink-0 px-2 h-9 rounded-lg border border-border bg-surface text-text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center"
                  >
                    {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  </button>
                  {productImage && (
                    <img src={productImage} alt="Produto" className="h-9 w-9 rounded-lg object-cover border border-border shrink-0" />
                  )}
                </div>
                {lookupLoading && (
                  <p className="text-xs text-accent mt-1">{t('projects.modal.lookupLoading')}</p>
                )}
              </F>
            </div>
            <F label={t('projects.fields.brand')}><Input {...register('brand')} placeholder="Apple" /></F>
            <F label={t('projects.fields.model')}><Input {...register('model')} placeholder="A2159" /></F>
            <div className="space-y-1.5">
              <Label>{t('projects.modal.serialLabel')}</Label>
              <div className="flex gap-1.5">
                <Input {...register('serial_number')} placeholder="C02X..." className="flex-1" />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  title="Scanner"
                  className="px-2 rounded-lg border border-border bg-surface text-text-muted hover:text-accent hover:border-accent/40 transition-colors"
                >
                  <ScanLine className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('projects.modal.statusLabel')}</Label>
              <select
                value={watch('status')}
                onChange={e => setValue('status', e.target.value as FormData['status'])}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <F label={t('projects.modal.defectLabel')} error={errors.defect_description?.message}>
                <Textarea {...register('defect_description')} placeholder="Descreve o defeito relatado pelo fornecedor..." rows={2} />
              </F>
            </div>
            <div className="col-span-2">
              <F label={t('projects.modal.diagnosisLabel')}>
                <Textarea {...register('diagnosis')} placeholder="Diagnóstico após análise..." rows={2} />
              </F>
            </div>
            <F label={t('projects.modal.supplierLabel')}><Input {...register('supplier_name')} placeholder="Nome ou plataforma" /></F>
            <F label={t('projects.modal.buyerLabel')}><Input {...register('buyer_name')} placeholder="Nome do comprador" /></F>
            <F label={t('projects.modal.purchaseRefLabel')}><Input {...register('purchase_reference')} placeholder="Nº recibo, factura..." /></F>
            {!project && activeLots.length > 0 && (
              <div className="col-span-2 space-y-1.5">
                <Label>{t('lots.from_lot')} <span className="text-text-muted text-xs">({t('common.optional')})</span></Label>
                <select
                  value={lotId}
                  onChange={e => {
                    const id = e.target.value
                    setLotId(id)
                    if (id) {
                      const lot = activeLots.find(l => l.id === id)
                      if (lot && (lot.estimated_items ?? 0) > 0) {
                        const costPerItem = parseFloat((lot.purchase_price / lot.estimated_items!).toFixed(2))
                        setValue('purchase_price', costPerItem)
                        setRoiValues(p => ({ ...p, purchasePrice: costPerItem }))
                      }
                      if (lot?.supplier) {
                        setValue('supplier_name', lot.supplier)
                      }
                    }
                  }}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">{t('lots.no_lot')}</option>
                  {activeLots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      #{lot.lot_number ?? '—'} — {lot.supplier ?? '?'}
                      {(lot.estimated_items ?? 0) > 0 ? ` (£${(lot.purchase_price / lot.estimated_items!).toFixed(2)}/item)` : ''}
                    </option>
                  ))}
                </select>
                {lotId && (
                  <p className="text-xs text-accent">💡 {t('lots.price_auto_filled')}</p>
                )}
              </div>
            )}
          </div>

          {/* Dynamic fields for selected category */}
          <DynamicFields
            categorySlug={categorySlug || null}
            values={dynValues}
            onChange={(key, val) => setDynValues(prev => ({ ...prev, [key]: val }))}
          />

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{t('projects.modal.financialSection')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <FinancialInput label={t('projects.fields.purchasePrice')} value={roiValues.purchasePrice} onChange={v => { const n = v ?? 0; setValue('purchase_price', n); setRoiValues(p => ({ ...p, purchasePrice: n })) }} />
              <FinancialInput label={t('projects.fields.partsCost')} value={roiValues.partsCost} onChange={v => { const n = v ?? 0; setValue('parts_cost', n); setRoiValues(p => ({ ...p, partsCost: n })) }} />
              <FinancialInput label={t('projects.fields.shippingIn')} value={roiValues.shippingIn} onChange={v => { const n = v ?? 0; setValue('shipping_in', n); setRoiValues(p => ({ ...p, shippingIn: n })) }} />
              <FinancialInput label={t('projects.fields.shippingOut')} value={roiValues.shippingOut} onChange={v => { const n = v ?? 0; setValue('shipping_out', n); setRoiValues(p => ({ ...p, shippingOut: n })) }} />
              <FinancialInput label={t('projects.fields.salePrice')} value={roiValues.salePrice} onChange={v => { setValue('sale_price', v); setRoiValues(p => ({ ...p, salePrice: v })) }} optional placeholder="Opcional" />
              <div className="space-y-1.5">
                <Label>{t('projects.modal.salePlatformLabel')}</Label>
                <select
                  value={watch('sale_platform') ?? ''}
                  onChange={e => setValue('sale_platform', e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">{t('projects.modal.salePlatformPlaceholder')}</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <ROICalculator
              purchasePrice={roiValues.purchasePrice}
              partsCost={roiValues.partsCost}
              shippingIn={roiValues.shippingIn}
              shippingOut={roiValues.shippingOut}
              salePrice={roiValues.salePrice}
            />
          </div>

          {/* Device details — collapsible */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setDeviceOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface text-sm font-semibold text-text-muted hover:text-text-primary transition-colors"
            >
              <span>{t('projects.modal.deviceSection')}</span>
              {deviceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {deviceOpen && (
              <div className="p-4 space-y-4">
                {/* IMEI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>IMEI 1</Label>
                    <div className="flex gap-1.5">
                      <Input {...register('imei')} placeholder={t('projects.modal.imeiShort')} maxLength={15} className="flex-1 font-mono text-xs" />
                      {watch('imei') && watch('imei')!.length === 15 && (
                        <a
                          href={`https://www.imei.info/?imei=${watch('imei')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Verificar IMEI"
                          className="px-2 rounded-lg border border-border bg-surface text-text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {watch('imei') && watch('imei')!.length > 0 && watch('imei')!.length < 15 && (
                      <p className="text-[10px] text-warning">{t('projects.modal.imeiInvalid')}</p>
                    )}
                    {watch('imei') && watch('imei')!.length === 15 && !luhnValid(watch('imei')!) && (
                      <p className="text-[10px] text-danger">{t('projects.modal.imeiLuhnFail')}</p>
                    )}
                    {watch('imei') && luhnValid(watch('imei')!) && (
                      <p className="text-[10px] text-success">{t('projects.modal.imeiValid')}</p>
                    )}
                  </div>
                  <F label={t('projects.modal.imei2Label')}>
                    <Input {...register('imei2')} placeholder="Opcional" maxLength={15} className="font-mono text-xs" />
                  </F>
                </div>

                {/* Battery */}
                <div className="grid grid-cols-2 gap-3">
                  <F label={t('projects.modal.batteryOriginalLabel')}>
                    <input type="number" min="0" defaultValue={project?.battery_capacity_original ?? ''} onBlur={e => { const v = parseInt(e.target.value); const n = isNaN(v) ? null : v; setValue('battery_capacity_original', n ?? undefined); setCapOrig(n) }} placeholder="ex: 3227" className={NUM_CLS} />
                  </F>
                  <F label={t('projects.modal.batteryCurrentLabel')}>
                    <input type="number" min="0" defaultValue={project?.battery_capacity_current ?? ''} onBlur={e => { const v = parseInt(e.target.value); const n = isNaN(v) ? null : v; setValue('battery_capacity_current', n ?? undefined); setCapCur(n) }} placeholder="ex: 2900" className={NUM_CLS} />
                  </F>
                </div>

                {/* Battery health bar + input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>{t('projects.modal.batteryHealthLabel')}</Label>
                    {calcHealth != null && (
                      <span className="text-xs text-accent font-medium">{t('projects.modal.batteryAutoCalc')}</span>
                    )}
                  </div>
                  {calcHealth != null ? (
                    <div className="flex h-9 w-full items-center rounded-md border border-border bg-surface/50 px-3 text-sm text-text-muted">
                      {t('projects.modal.batteryAutoCalcValue', { value: calcHealth })}
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={project?.battery_health_percent ?? ''}
                      onBlur={e => { const v = parseInt(e.target.value); const n = isNaN(v) ? null : Math.min(100, Math.max(0, v)); setValue('battery_health_percent', n ?? undefined); setBatteryHealthManual(n) }}
                      placeholder="0–100"
                      className={NUM_CLS}
                    />
                  )}
                  {(() => {
                    const h = calcHealth ?? batteryHealthManual
                    if (!h) return null
                    const color = h >= 80 ? 'bg-success' : h >= 60 ? 'bg-warning' : 'bg-danger'
                    return (
                      <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, h)}%` }} />
                      </div>
                    )
                  })()}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <F label={t('projects.modal.batteryCyclesLabel')}>
                    <input type="number" min="0" defaultValue={project?.battery_cycles ?? ''} onBlur={e => { const v = parseInt(e.target.value); setValue('battery_cycles', isNaN(v) ? undefined : v) }} placeholder="ex: 312" className={NUM_CLS} />
                  </F>
                  <F label={t('projects.modal.colorLabel')}>
                    <Input {...register('device_color')} placeholder="ex: Space Grey" />
                  </F>
                  <div className="space-y-1.5">
                    <Label>{t('projects.modal.conditionLabel')}</Label>
                    <select
                      value={watch('condition_grade') ?? ''}
                      onChange={e => setValue('condition_grade', (e.target.value || null) as FormData['condition_grade'])}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">{t('projects.modal.conditionPlaceholder')}</option>
                      {CONDITION_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('projects.modal.storageLabel')}</Label>
                    <select
                      value={watch('storage_gb')?.toString() ?? ''}
                      onChange={e => setValue('storage_gb', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">{t('projects.modal.salePlatformPlaceholder')}</option>
                      {STORAGE_OPTIONS.map(s => <option key={s} value={String(s)}>{s >= 1024 ? '1TB' : `${s}GB`}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('projects.modal.ramLabel')}</Label>
                    <select
                      value={watch('ram_gb')?.toString() ?? ''}
                      onChange={e => setValue('ram_gb', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">{t('projects.modal.salePlatformPlaceholder')}</option>
                      {RAM_OPTIONS.map(r => <option key={r} value={String(r)}>{r}GB</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <F label={t('projects.modal.notesLabel')}>
            <Textarea {...register('notes')} placeholder="Observações adicionais..." rows={2} />
          </F>

          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{t('projects.modal.photosSection')}</h4>
            <PhotoUpload photos={localPhotos} onChange={setLocalPhotos} maxPhotos={6} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : project ? t('projects.modal.update') : t('projects.modal.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {showScanner && (
      <BarcodeScanner
        title={scanTarget === 'equipment' ? t('projects.modal.scanProduct') : t('projects.modal.scanSerial')}
        onScan={scanTarget === 'equipment' ? handleEquipmentScan : code => { setValue('serial_number', code); setShowScanner(false) }}
        onClose={() => setShowScanner(false)}
      />
    )}
    {warrantyProject && (
      <WarrantyModal
        projectId={warrantyProject.id}
        equipmentName={warrantyProject.equipment}
        onClose={() => { setWarrantyProject(null); onClose() }}
      />
    )}
    </>
  )
}
