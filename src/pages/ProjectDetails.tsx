import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'wouter'
import { useTranslation } from 'react-i18next'
import { useProjects, useUpdateProject, useDeleteProject } from '@/hooks/useProjects'
import { useOrders } from '@/hooks/useOrders'
import { autoUpdateDefectDatabase } from '@/hooks/useDefects'
import { useItemFieldValues } from '@/hooks/useItemFieldValues'
import { sendTelegramNotification } from '@/lib/telegram'
import { PhotoGallery } from '@/components/PhotoGallery'
import { ProjectModal } from '@/components/ProjectModal'
import { TranslateButton } from '@/components/TranslateButton'
import { DynamicFieldsDisplay } from '@/components/DynamicFields'
import { calcROI, fmtGBP, fmtDate, STATUS_COLORS, ALL_STATUSES, cn } from '@/lib/utils'
import type { Project, ProjectPhase, ProjectStatus } from '@/lib/supabase'
import {
  ArrowLeft, Pencil, CheckCircle2, Circle, Clock, Package,
  Wrench, ClipboardCheck, TrendingUp, TrendingDown, Camera,
  Trash2, ChevronDown, ExternalLink, Search,
} from 'lucide-react'
import { differenceInDays } from 'date-fns'

type TimelinePhase = {
  key: ProjectPhase
  obsKey: keyof Project | null
  label: string
  emoji: string
  icon: typeof Circle
  doneStatuses: string[]
  activeStatuses: string[]
}

const TIMELINE: TimelinePhase[] = [
  {
    key: 'recepcao', obsKey: 'obs_recepcao', label: 'Recepção', emoji: '📥', icon: Package,
    doneStatuses: ['Recebido', 'Em Diagnóstico', 'Aguardando Peças', 'Em Manutenção', 'Pronto para Venda', 'Vendido', 'Cancelado'],
    activeStatuses: ['Recebido'],
  },
  {
    key: 'diagnostico', obsKey: 'obs_diagnostico', label: 'Diagnóstico', emoji: '🔍', icon: ClipboardCheck,
    doneStatuses: ['Aguardando Peças', 'Em Manutenção', 'Pronto para Venda', 'Vendido'],
    activeStatuses: ['Em Diagnóstico'],
  },
  {
    key: 'reparacao', obsKey: 'obs_reparacao', label: 'Reparação', emoji: '🔧', icon: Wrench,
    doneStatuses: ['Pronto para Venda', 'Vendido'],
    activeStatuses: ['Aguardando Peças', 'Em Manutenção'],
  },
  {
    key: 'concluido', obsKey: 'obs_conclusao', label: 'Concluído', emoji: '✅', icon: CheckCircle2,
    doneStatuses: ['Vendido'],
    activeStatuses: ['Pronto para Venda'],
  },
  {
    key: 'entrega', obsKey: null, label: 'Entrega', emoji: '📦', icon: Package,
    doneStatuses: ['Vendido'],
    activeStatuses: [],
  },
]

const ORDER_STATUS_COLORS: Record<string, string> = {
  'Encomendado': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Em Trânsito': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Entregue': 'bg-success/15 text-success border-success/30',
  'Cancelado': 'bg-danger/15 text-danger border-danger/30',
}

function PhaseStep({ phase, project, onSaveObs }: { phase: TimelinePhase; project: Project; onSaveObs: (key: string, value: string) => void }) {
  const { t, i18n } = useTranslation()
  const isDone = phase.doneStatuses.includes(project.status)
  const isActive = phase.activeStatuses.includes(project.status)
  const isCancelled = project.status === 'Cancelado'
  const obsValue = phase.obsKey ? (project[phase.obsKey] as string | null) ?? '' : ''
  const [obs, setObs] = useState(obsValue)
  const [saving, setSaving] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)
  const targetLang = i18n.language.startsWith('en') ? 'en' : 'pt' as 'pt' | 'en'

  const dotColor = isDone ? 'bg-success border-success' : isActive ? 'bg-accent border-accent animate-pulse' : isCancelled && !isDone ? 'bg-border border-border' : 'bg-surface border-border'

  async function saveObs() {
    if (!phase.obsKey || obs === obsValue) return
    setSaving(true)
    try { await onSaveObs(phase.obsKey, obs) } finally { setSaving(false) }
  }

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('h-4 w-4 rounded-full border-2 shrink-0 mt-1', dotColor)} />
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{phase.emoji}</span>
          <h3 className={cn('font-semibold text-sm', isDone ? 'text-success' : isActive ? 'text-accent' : 'text-text-muted')}>
            {t(`project_detail.${phase.key}`)}
          </h3>
          {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {isActive && <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded-full font-medium">{t('project_detail.inProgressBadge')}</span>}
        </div>
        {phase.obsKey && (
          <div className="mb-3">
            <textarea value={obs} onChange={e => setObs(e.target.value)} onBlur={saveObs} placeholder={t('project_detail.obsPlaceholderPhase', { phase: t(`project_detail.${phase.key}`) })} rows={2}
              className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
            <TranslateButton
              value={obs}
              targetLang={targetLang}
              onTranslated={v => { setObs(v); onSaveObs(phase.obsKey!, v) }}
            />
            {saving && <p className="text-[10px] text-text-muted mt-0.5">{t('project_detail.savingObs')}</p>}
          </div>
        )}
        <button onClick={() => setPhotosOpen(o => !o)} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors">
          <Camera className="h-3.5 w-3.5" />
          {photosOpen ? t('project_detail.hidePhotos') : t('project_detail.showPhotos')}
        </button>
        {photosOpen && (
          <div className="mt-3 p-3 rounded-xl bg-surface border border-border">
            <PhotoGallery projectId={project.id} defaultPhase={phase.key} />
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  )
}

export function ProjectDetails() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { data: projects = [], isLoading } = useProjects()
  const { data: allOrders = [] } = useOrders()
  const update = useUpdateProject()
  const deleteProject = useDeleteProject()
  const fieldValues = useItemFieldValues(id ?? null, 'project')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)

  const project = projects.find(p => p.id === id)
  const linkedOrders = allOrders.filter(o => o.project_id === id)
  const similarProjects = project
    ? projects
        .filter(p => p.id !== id && p.equipment.toLowerCase().includes(project.equipment.toLowerCase().split(' ')[0]))
        .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
        .slice(0, 5)
    : []
  const dynamicCategorySlug = fieldValues['_category_slug'] ?? null
  const targetLang = i18n.language.startsWith('en') ? 'en' : 'pt' as 'pt' | 'en'

  useEffect(() => {
    if (project) document.title = `${project.equipment} — RevTech PRO`
  }, [project?.equipment])

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">{t('project_detail.notFoundMsg')}</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-accent hover:underline text-sm">{t('project_detail.backToProjects')}</button>
      </div>
    )
  }

  const { cost, profit, roi } = calcROI(project)
  const margin = project.sale_price && project.sale_price > 0 ? (profit / project.sale_price) * 100 : 0
  const positive = profit >= 0
  const days = project.sold_at
    ? differenceInDays(new Date(project.sold_at), new Date(project.received_at))
    : differenceInDays(new Date(), new Date(project.received_at))

  async function handleSaveObs(key: string, value: string) {
    await update.mutateAsync({ id: project!.id, [key]: value || null })
  }

  async function handleTranslateField(key: keyof Project, value: string) {
    await update.mutateAsync({ id: project!.id, [key]: value }).catch(() => {})
  }

  async function handleStatusChange(status: ProjectStatus) {
    setStatusChanging(true)
    try {
      await update.mutateAsync({ id: project!.id, status })
      if (status === 'Vendido' || status === 'Cancelado') {
        autoUpdateDefectDatabase({ ...project!, status }).catch(() => {})
      }
      if (status === 'Vendido') {
        const { profit } = calcROI(project!)
        const margin = project!.sale_price ? (profit / project!.sale_price * 100) : 0
        sendTelegramNotification(
          `💰 <b>Venda registada!</b>\nTicket: ${project!.ticket_number ?? '—'}\nEquipamento: ${project!.equipment}\nVendido por: £${project!.sale_price ?? 0} via ${project!.sale_platform ?? '—'}\nLucro: £${profit.toFixed(2)} (${margin.toFixed(1)}%)`
        ).catch(() => {})
      } else {
        sendTelegramNotification(
          `📋 <b>Projecto actualizado</b>\nTicket: ${project!.ticket_number ?? '—'}\n${project!.status} → ${status}`
        ).catch(() => {})
      }
    } finally { setStatusChanging(false) }
  }

  async function handleDelete() {
    await deleteProject.mutateAsync(project!.id)
    navigate('/projects')
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/projects')} className="p-2 rounded-lg border border-border bg-surface hover:bg-accent/5 text-text-muted hover:text-accent transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            {project.ticket_number && <p className="text-xs font-mono text-accent/70 mb-0.5">{project.ticket_number}</p>}
            <h1 className="text-xl font-bold text-text-primary truncate">{project.equipment}</h1>
            {(project.brand || project.model) && <p className="text-sm text-text-muted">{[project.brand, project.model].filter(Boolean).join(' · ')}</p>}
            {project.serial_number && <p className="text-xs text-text-muted font-mono mt-0.5">S/N: {project.serial_number}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Quick status change */}
          <div className="relative">
            <select
              value={project.status}
              onChange={e => handleStatusChange(e.target.value as ProjectStatus)}
              disabled={statusChanging}
              className={cn(
                'appearance-none rounded-full border pl-3 pr-7 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer',
                STATUS_COLORS[project.status]
              )}
            >
              {ALL_STATUSES.map(s => <option key={s} value={s}>{t(`statusMap.${s}`, { defaultValue: s })}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
          </div>
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-accent/5 hover:border-accent/40 text-sm text-text-muted hover:text-accent transition-colors">
            <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
          </button>
          <button onClick={() => setDeleteOpen(true)} className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-danger hover:border-danger/30 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Financial cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-text-muted mb-1">{t('project_detail.totalCost')}</p>
          <p className="text-base font-bold text-text-primary">{fmtGBP(cost)}</p>
          <p className="text-[10px] text-text-muted mt-0.5">{t('project_detail.costBreakdown')}</p>
        </div>
        {project.sale_price != null && (
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-text-muted mb-1">{t('project_detail.salePrice')}</p>
            <p className="text-base font-bold text-text-primary">{fmtGBP(project.sale_price)}</p>
            {project.sale_platform && <p className="text-[10px] text-text-muted mt-0.5">{project.sale_platform}</p>}
          </div>
        )}
        {project.sale_price != null && (
          <div className={cn('rounded-xl border p-3 text-center', positive ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5')}>
            <p className="text-xs text-text-muted mb-1">{positive ? t('project_detail.profit') : t('project_detail.loss')}</p>
            <div className={cn('flex items-center justify-center gap-1 text-base font-bold', positive ? 'text-success' : 'text-danger')}>
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {fmtGBP(profit)}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">{t('project_detail.margin')} {margin.toFixed(1)}%</p>
          </div>
        )}
        {project.sale_price != null && (
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-text-muted mb-1">{t('project_detail.roi')}</p>
            <p className={cn('text-base font-bold', positive ? 'text-success' : 'text-danger')}>{roi.toFixed(1)}%</p>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-text-muted mb-1">{t('project_detail.timeInShop')}</p>
          <div className="flex items-center justify-center gap-1 text-base font-bold text-text-primary">
            <Clock className="h-4 w-4 text-text-muted" />{days}d
          </div>
        </div>
      </div>

      {/* Identification + Financial breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('project_detail.identification')}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label={t('projects.fields.equipment')} value={project.equipment} />
            <InfoRow label={t('projects.fields.brand')} value={project.brand} />
            <InfoRow label={t('projects.fields.model')} value={project.model} />
            <InfoRow label={t('projects.fields.serial')} value={project.serial_number} />
            {project.imei && <InfoRow label="IMEI" value={<span className="font-mono text-xs">{project.imei}</span>} />}
            {project.imei2 && <InfoRow label="IMEI 2" value={<span className="font-mono text-xs">{project.imei2}</span>} />}
            {project.device_color && <InfoRow label={t('projects.fields.color')} value={project.device_color} />}
            {project.storage_gb && <InfoRow label={t('projects.fields.storage')} value={project.storage_gb >= 1024 ? '1TB' : `${project.storage_gb}GB`} />}
            {project.ram_gb && <InfoRow label={t('projects.fields.ram')} value={`${project.ram_gb}GB`} />}
            {project.condition_grade && <InfoRow label={t('projects.fields.condition')} value={project.condition_grade} />}
            <InfoRow label={t('projects.fields.supplier')} value={project.supplier_name} />
            <InfoRow label={t('projects.fields.buyer')} value={project.buyer_name} />
            <InfoRow label={t('projects.fields.received')} value={fmtDate(project.received_at)} />
            {project.sold_at && <InfoRow label={t('projects.fields.sold')} value={fmtDate(project.sold_at)} />}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('project_detail.financial')}</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: t('projects.fields.purchasePrice'), value: project.purchase_price },
              { label: t('projects.fields.partsCost'), value: project.parts_cost },
              { label: t('projects.fields.shippingIn'), value: project.shipping_in },
              { label: t('projects.fields.shippingOut'), value: project.shipping_out },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-text-muted">{label}</span>
                <span className="text-text-primary font-medium">{fmtGBP(value)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span className="text-text-muted">{t('project_detail.totalCost')}</span>
              <span className="text-text-primary">{fmtGBP(cost)}</span>
            </div>
            {project.sale_price != null && (
              <>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('project_detail.salePrice')}</span>
                  <span className="text-text-primary font-medium">{fmtGBP(project.sale_price)}</span>
                </div>
                <div className={cn('flex justify-between rounded-lg px-3 py-2 font-bold', positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                  <span>{positive ? t('project_detail.profit') : t('project_detail.loss')}</span>
                  <span>{fmtGBP(Math.abs(profit))}</span>
                </div>
              </>
            )}
          </div>
          {(project.battery_health_percent || project.battery_capacity_original) && (
            <>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-2">{t('project_detail.battery')}</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {project.battery_capacity_original && <InfoRow label={t('project_detail.batteryOriginalCap')} value={`${project.battery_capacity_original} mAh`} />}
                {project.battery_capacity_current && <InfoRow label={t('project_detail.batteryCurrentCap')} value={`${project.battery_capacity_current} mAh`} />}
                {project.battery_health_percent && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{t('project_detail.batteryHealthLabel')}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-surface border border-border overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', project.battery_health_percent >= 80 ? 'bg-success' : project.battery_health_percent >= 60 ? 'bg-warning' : 'bg-danger')}
                          style={{ width: `${project.battery_health_percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{project.battery_health_percent}%</span>
                    </div>
                  </div>
                )}
                {project.battery_cycles && <InfoRow label={t('project_detail.batteryCycles')} value={String(project.battery_cycles)} />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dynamic category fields */}
      <DynamicFieldsDisplay
        categorySlug={dynamicCategorySlug}
        values={fieldValues}
        language={targetLang}
      />

      {/* Defect + Diagnosis + Notes */}
      {(project.defect_description || project.diagnosis || project.notes) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {project.defect_description && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{t('project_detail.defectReported')}</p>
              <p className="text-sm text-text-primary">{project.defect_description}</p>
              <TranslateButton
                value={project.defect_description}
                targetLang={targetLang}
                onTranslated={v => handleTranslateField('defect_description', v)}
              />
            </div>
          )}
          {project.diagnosis && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{t('project_detail.diagnosis')}</p>
              <p className="text-sm text-text-primary">{project.diagnosis}</p>
              <TranslateButton
                value={project.diagnosis}
                targetLang={targetLang}
                onTranslated={v => handleTranslateField('diagnosis', v)}
              />
            </div>
          )}
          {project.notes && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{t('project_detail.notes')}</p>
              <p className="text-sm text-text-primary">{project.notes}</p>
              <TranslateButton
                value={project.notes}
                targetLang={targetLang}
                onTranslated={v => handleTranslateField('notes', v)}
              />
            </div>
          )}
        </div>
      )}

      {/* Linked orders */}
      {linkedOrders.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('project_detail.linkedOrdersTitle', { count: linkedOrders.length })}</h2>
          <div className="space-y-2">
            {linkedOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{o.part_name}</p>
                  <p className="text-xs text-text-muted">{o.supplier} · Qtd: {o.quantity}{o.total_cost != null ? ` · ${fmtGBP(o.total_cost)}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-[10px] font-medium rounded-full border px-2 py-0.5', ORDER_STATUS_COLORS[o.status])}>{o.status}</span>
                  {o.order_url && (
                    <a href={o.order_url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{t('project_detail.repairHistory')}</h2>
        {TIMELINE.map((phase, i) => (
          <div key={phase.key} className={i === TIMELINE.length - 1 ? '[&_.flex-col>div:last-child]:hidden' : ''}>
            <PhaseStep phase={phase} project={project} onSaveObs={handleSaveObs} />
          </div>
        ))}
      </div>

      {/* Equipment history */}
      {similarProjects.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" /> {t('project_detail.equipmentHistory')}
          </h2>
          <div className="space-y-2">
            {similarProjects.map(p => {
              const { profit: sp } = calcROI(p)
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg bg-surface border border-border px-3 py-2 hover:border-accent/40 hover:bg-accent/5 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{p.equipment}</p>
                    <p className="text-xs text-text-muted">{p.ticket_number ? `${p.ticket_number} · ` : ''}{fmtDate(p.received_at)}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={cn('text-[10px] font-medium rounded-full border px-2 py-0.5', STATUS_COLORS[p.status])}>{t(`statusMap.${p.status}`, { defaultValue: p.status })}</span>
                    {p.sale_price != null && (
                      <span className={cn('text-xs font-semibold', sp >= 0 ? 'text-success' : 'text-danger')}>{sp >= 0 ? '+' : ''}{fmtGBP(sp)}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {editOpen && (
        <ProjectModal open={editOpen} onClose={() => setEditOpen(false)} project={project} />
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" onClick={() => { setDeleteOpen(false); setDeleteInput('') }}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">{t('project_detail.deleteTitle')}</h2>
            <p className="text-sm text-text-muted">{t('delete.will_delete')}: <span className="font-medium text-text-primary">{project.equipment}</span>. {t('delete.irreversible')}</p>
            <p className="text-xs text-text-muted">{t('delete.instruction')} <span className="font-mono font-bold text-danger">{t('delete.confirm_word')}</span>.</p>
            <input autoFocus value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder={t('delete.confirm_word')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-danger" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteOpen(false); setDeleteInput('') }} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">{t('common.cancel')}</button>
              <button disabled={deleteInput !== t('delete.confirm_word') || deleteProject.isPending} onClick={handleDelete}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 transition-colors">
                {deleteProject.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
