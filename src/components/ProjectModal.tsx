import { useEffect, useState } from 'react'
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
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import type { Project } from '@/lib/supabase'
import { ALL_STATUSES } from '@/lib/utils'
import { lookupBarcode } from '@/lib/productLookup'
import { ScanLine, Loader2 } from 'lucide-react'

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
})

type FormData = z.infer<typeof schema>

interface ProjectModalProps {
  open: boolean
  onClose: () => void
  project?: Project | null
}

const PLATFORMS = ['eBay UK', 'Back Market', 'CeX', 'Gumtree', 'Facebook Marketplace', 'Outro']

export function ProjectModal({ open, onClose, project }: ProjectModalProps) {
  const create = useCreateProject()
  const update = useUpdateProject()
  const [showScanner, setShowScanner] = useState(false)
  const [scanTarget, setScanTarget] = useState<'serial' | 'equipment'>('serial')
  const [warrantyProject, setWarrantyProject] = useState<{ id: string; equipment: string } | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [productImage, setProductImage] = useState<string | null>(null)

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
      })
    } else {
      reset({ status: 'Recebido', purchase_price: 0, parts_cost: 0, shipping_in: 0, shipping_out: 0 })
      setProductImage(null)
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

  const watched = watch(['purchase_price', 'parts_cost', 'shipping_in', 'shipping_out', 'sale_price'])

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
          <DialogTitle>{project ? 'Editar Projecto' : 'Novo Projecto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-4 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <F label="Equipamento *" error={errors.equipment?.message}>
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
              <F label="Preço de compra (£)"><Input type="number" step="0.01" {...register('purchase_price')} /></F>
              <F label="Custo de peças (£)"><Input type="number" step="0.01" {...register('parts_cost')} /></F>
              <F label="Frete entrada (£)"><Input type="number" step="0.01" {...register('shipping_in')} /></F>
              <F label="Frete saída (£)"><Input type="number" step="0.01" {...register('shipping_out')} /></F>
              <F label="Preço de venda (£)"><Input type="number" step="0.01" {...register('sale_price')} placeholder="Opcional" /></F>
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

          <F label="Notas">
            <Textarea {...register('notes')} placeholder="Observações adicionais..." rows={2} />
          </F>

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
