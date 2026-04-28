import { useEffect, useState, useCallback } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROICalculator } from './ROICalculator'
import { BarcodeScanner } from './BarcodeScanner'
import { WarrantyModal } from './WarrantyModal'
import { PhotoUpload } from './PhotoUpload'
import { NumberInput } from './NumberInput'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import { useUploadPhoto } from '@/hooks/useProjectPhotos'
import type { Project } from '@/lib/supabase'
import type { FilledFields } from '@/hooks/usePairedScanner'
import { ALL_STATUSES } from '@/lib/utils'
import { lookupBarcode } from '@/lib/productLookup'
import { ScanLine, Loader2, ChevronDown, ChevronUp, ExternalLink, Sparkles, Smartphone } from 'lucide-react'

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
  pendingAiFields?: FilledFields | null
  onPendingConsumed?: () => void
}

const PLATFORMS = ['eBay UK', 'Back Market', 'CeX', 'Gumtree', 'Facebook Marketplace', 'Outro']

function dataUrlToFile(dataUrl: string, name: string): File {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bstr = atob(data)
  const u8 = new Uint8Array(bstr.length)
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i)
  return new File([u8], name, { type: mime })
}

export function ProjectModal({ open, onClose, project, pendingAiFields, onPendingConsumed }: ProjectModalProps) {
  const create = useCreateProject()
  const update = useUpdateProject()
  const uploadPhoto = useUploadPhoto()
  const [showScanner, setShowScanner] = useState(false)
  const [scanTarget, setScanTarget] = useState<'serial' | 'equipment'>('serial')
  const [warrantyProject, setWarrantyProject] = useState<{ id: string; equipment: string } | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [productImage, setProductImage] = useState<string | null>(null)
  const [deviceOpen, setDeviceOpen] = useState(false)
  const [aiFields, setAiFields] = useState<Set<string>>(new Set())
  const [localPhotos, setLocalPhotos] = useState<string[]>([])

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

  // Apply pending AI fields when modal opens for new project
  useEffect(() => {
    if (open && pendingAiFields && !project) {
      handleAIFill(pendingAiFields)
      onPendingConsumed?.()
    }
  }, [open, pendingAiFields]) // eslint-disable-line react-hooks/exhaustive-deps

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
    } else {
      reset({ status: 'Recebido', purchase_price: 0, parts_cost: 0, shipping_in: 0, shipping_out: 0 })
      setProductImage(null)
      setDeviceOpen(false)
    }
  }, [project, reset, open])

  const handleAIFill = useCallback((fields: FilledFields) => {
    const filled = new Set<string>()
    if (fields.equipment) { setValue('equipment', fields.equipment); filled.add('equipment') }
    if (fields.brand) { setValue('brand', fields.brand); filled.add('brand') }
    if (fields.model) { setValue('model', String(fields.model)); filled.add('model') }
    if (fields.serial_number) { setValue('serial_number', String(fields.serial_number)); filled.add('serial_number') }
    if (fields.imei) { setValue('imei', String(fields.imei)); filled.add('imei') }
    if (fields.color) { setValue('device_color', String(fields.color)); filled.add('device_color'); setDeviceOpen(true) }
    if (fields.storage_gb) { setValue('storage_gb', Number(fields.storage_gb)); filled.add('storage_gb'); setDeviceOpen(true) }
    if (fields.ram_gb) { setValue('ram_gb', Number(fields.ram_gb)); filled.add('ram_gb'); setDeviceOpen(true) }
    if (fields.battery_mah_original) { setValue('battery_capacity_original', Number(fields.battery_mah_original)); filled.add('battery_capacity_original'); setDeviceOpen(true) }
    if (fields.condition_grade) { setValue('condition_grade', fields.condition_grade as FormData['condition_grade']); filled.add('condition_grade'); setDeviceOpen(true) }
    if (fields.obs_recepcao) { setValue('notes', String(fields.obs_recepcao)); filled.add('notes') }
    setAiFields(filled)
  }, [setValue])

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

  const watched = watch(['purchase_price', 'parts_cost', 'shipping_in', 'shipping_out', 'sale_price'])
  const [watchedCapOrig, watchedCapCur] = watch(['battery_capacity_original', 'battery_capacity_current'])

  // Auto-calculate battery health when both capacities are filled
  const calcHealth = watchedCapOrig && watchedCapCur && watchedCapOrig > 0
    ? Math.min(100, Math.round((watchedCapCur / watchedCapOrig) * 100))
    : null

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
      imei: data.imei || null,
      imei2: data.imei2 || null,
      battery_capacity_original: data.battery_capacity_original ?? null,
      battery_capacity_current: data.battery_capacity_current ?? null,
      battery_health_percent: calcHealth ?? data.battery_health_percent ?? null,
      battery_cycles: data.battery_cycles ?? null,
      device_color: data.device_color || null,
      storage_gb: data.storage_gb ?? null,
      ram_gb: data.ram_gb ?? null,
      condition_grade: data.condition_grade ?? null,
    }
    const wasVendido = project?.status !== 'Vendido' && data.status === 'Vendido'
    let savedId = project?.id ?? ''
    if (project) {
      await update.mutateAsync({ id: project.id, ...payload })
      savedId = project.id
    } else {
      const created = await create.mutateAsync(payload as Parameters<typeof create.mutateAsync>[0])
      savedId = (created as { id: string }).id
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
    if (wasVendido && savedId) {
      setWarrantyProject({ id: savedId, equipment: data.equipment })
    } else {
      onClose()
    }
  }

  const F = ({ label, error, children, aiKey }: { label: string; error?: string; children: React.ReactNode; aiKey?: string }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {aiKey && aiFields.has(aiKey) && (
          <span title="Preenchido por IA — editável">
            <Sparkles className="h-3 w-3 text-accent" />
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Projecto' : 'Novo Projecto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-4 space-y-5">
          {/* Scanner status (panel is in parent) */}
          {aiFields.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2">
              <Smartphone className="h-4 w-4 text-accent" />
              <span className="text-xs text-accent font-medium">{aiFields.size} campos preenchidos pelo scanner ✨</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <F label="Equipamento *" error={errors.equipment?.message} aiKey="equipment">
                <div className="flex gap-1.5 items-start">
                  <div className="flex-1">
                    <Input {...register('equipment')} placeholder="ex: MacBook Pro 2019" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setScanTarget('equipment'); setShowScanner(true) }}
                    title="Escanear código de barras para preencher automaticamente"
                    className="shrink-0 px-2 h-9 rounded-lg border border-border bg-surface text-text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center"
                  >
                    {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  </button>
                  {productImage && (
                    <img src={productImage} alt="Produto" className="h-9 w-9 rounded-lg object-cover border border-border shrink-0" />
                  )}
                </div>
                {lookupLoading && (
                  <p className="text-xs text-accent mt-1">A consultar base de dados de produtos...</p>
                )}
              </F>
            </div>
            <F label="Marca"><Input {...register('brand')} placeholder="Apple" /></F>
            <F label="Modelo"><Input {...register('model')} placeholder="A2159" /></F>
            <div className="space-y-1.5">
              <Label>Número de série</Label>
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
              <Label>Estado</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormData['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <F label="Defeito descrito *" error={errors.defect_description?.message}>
                <Textarea {...register('defect_description')} placeholder="Descreve o defeito relatado pelo fornecedor..." rows={2} />
              </F>
            </div>
            <div className="col-span-2">
              <F label="Diagnóstico">
                <Textarea {...register('diagnosis')} placeholder="Diagnóstico após análise..." rows={2} />
              </F>
            </div>
            <F label="Fornecedor / Vendedor"><Input {...register('supplier_name')} placeholder="Nome ou plataforma" /></F>
            <F label="Comprador"><Input {...register('buyer_name')} placeholder="Nome do comprador" /></F>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Financeiro</h4>
            <div className="grid grid-cols-2 gap-4">
              <F label="Preço de compra (£)"><NumberInput value={watch('purchase_price')} onChange={v => setValue('purchase_price', v)} isDecimal /></F>
              <F label="Custo de peças (£)"><NumberInput value={watch('parts_cost')} onChange={v => setValue('parts_cost', v)} isDecimal /></F>
              <F label="Frete entrada (£)"><NumberInput value={watch('shipping_in')} onChange={v => setValue('shipping_in', v)} isDecimal /></F>
              <F label="Frete saída (£)"><NumberInput value={watch('shipping_out')} onChange={v => setValue('shipping_out', v)} isDecimal /></F>
              <F label="Preço de venda (£)"><NumberInput value={watch('sale_price') ?? null} onChange={v => setValue('sale_price', v)} isDecimal placeholder="Opcional" /></F>
              <div className="space-y-1.5">
                <Label>Plataforma de venda</Label>
                <Select value={watch('sale_platform') ?? ''} onValueChange={(v) => setValue('sale_platform', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ROICalculator
              purchasePrice={watched[0] || 0}
              partsCost={watched[1] || 0}
              shippingIn={watched[2] || 0}
              shippingOut={watched[3] || 0}
              salePrice={watched[4] ?? null}
            />
          </div>

          {/* Device details — collapsible */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setDeviceOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface text-sm font-semibold text-text-muted hover:text-text-primary transition-colors"
            >
              <span>Detalhes do Dispositivo</span>
              {deviceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {deviceOpen && (
              <div className="p-4 space-y-4">
                {/* IMEI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>IMEI 1</Label>
                    <div className="flex gap-1.5">
                      <Input {...register('imei')} placeholder="15 dígitos" maxLength={15} className="flex-1 font-mono text-xs" />
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
                      <p className="text-[10px] text-warning">IMEI deve ter 15 dígitos</p>
                    )}
                    {watch('imei') && watch('imei')!.length === 15 && !luhnValid(watch('imei')!) && (
                      <p className="text-[10px] text-danger">IMEI inválido (falha Luhn)</p>
                    )}
                    {watch('imei') && luhnValid(watch('imei')!) && (
                      <p className="text-[10px] text-success">✓ IMEI válido</p>
                    )}
                  </div>
                  <F label="IMEI 2 (Dual SIM)">
                    <Input {...register('imei2')} placeholder="Opcional" maxLength={15} className="font-mono text-xs" />
                  </F>
                </div>

                {/* Battery */}
                <div className="grid grid-cols-2 gap-3">
                  <F label="Capacidade original (mAh)">
                    <NumberInput value={watch('battery_capacity_original') ?? null} onChange={v => setValue('battery_capacity_original', v)} placeholder="ex: 3227" />
                  </F>
                  <F label="Capacidade actual (mAh)">
                    <NumberInput value={watch('battery_capacity_current') ?? null} onChange={v => setValue('battery_capacity_current', v)} placeholder="ex: 2900" />
                  </F>
                </div>

                {/* Battery health bar + input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Saúde da bateria (%)</Label>
                    {calcHealth != null && (
                      <span className="text-xs text-text-muted">Calculado: <span className={calcHealth >= 80 ? 'text-success' : calcHealth >= 60 ? 'text-warning' : 'text-danger'}>{calcHealth}%</span></span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...register('battery_health_percent')}
                    value={calcHealth != null ? calcHealth : (watch('battery_health_percent') ?? '')}
                    onChange={e => setValue('battery_health_percent', parseInt(e.target.value) || undefined)}
                    placeholder="0–100"
                  />
                  {(() => {
                    const h = calcHealth ?? watch('battery_health_percent')
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
                  <F label="Ciclos de carga">
                    <NumberInput value={watch('battery_cycles') ?? null} onChange={v => setValue('battery_cycles', v)} placeholder="ex: 312" />
                  </F>
                  <F label="Cor do dispositivo">
                    <Input {...register('device_color')} placeholder="ex: Space Grey" />
                  </F>
                  <div className="space-y-1.5">
                    <Label>Condição</Label>
                    <Select value={watch('condition_grade') ?? ''} onValueChange={v => setValue('condition_grade', v as FormData['condition_grade'])}>
                      <SelectTrigger><SelectValue placeholder="Grau..." /></SelectTrigger>
                      <SelectContent>
                        {CONDITION_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Armazenamento (GB)</Label>
                    <Select value={watch('storage_gb')?.toString() ?? ''} onValueChange={v => setValue('storage_gb', parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {STORAGE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s >= 1024 ? '1TB' : `${s}GB`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>RAM (GB)</Label>
                    <Select value={watch('ram_gb')?.toString() ?? ''} onValueChange={v => setValue('ram_gb', parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {RAM_OPTIONS.map(r => <SelectItem key={r} value={String(r)}>{r}GB</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <F label="Notas">
            <Textarea {...register('notes')} placeholder="Observações adicionais..." rows={2} />
          </F>

          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Fotos</h4>
            <PhotoUpload photos={localPhotos} onChange={setLocalPhotos} maxPhotos={6} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'A guardar...' : project ? 'Actualizar' : 'Criar projecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {showScanner && (
      <BarcodeScanner
        title={scanTarget === 'equipment' ? 'Escanear produto (EAN/QR)' : 'Ler número de série'}
        onDetected={scanTarget === 'equipment' ? handleEquipmentScan : code => { setValue('serial_number', code); setShowScanner(false) }}
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
