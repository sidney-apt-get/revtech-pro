import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { useTranslation } from 'react-i18next'
import { useProjects, useUpdateProject } from '@/hooks/useProjects'
import { PhotoGallery } from '@/components/PhotoGallery'
import { ProjectModal } from '@/components/ProjectModal'
import { calcROI, fmtGBP, fmtDate, STATUS_COLORS, STATUS_DOT } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, ProjectPhase } from '@/lib/supabase'
import {
  ArrowLeft, Pencil, CheckCircle2, Circle, Clock, Package,
  Wrench, ClipboardCheck, TrendingUp, TrendingDown, Camera,
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
    key: 'recepcao',
    obsKey: 'obs_recepcao',
    label: 'Recepção',
    emoji: '📥',
    icon: Package,
    doneStatuses: ['Recebido', 'Em Diagnóstico', 'Aguardando Peças', 'Em Manutenção', 'Pronto para Venda', 'Vendido', 'Cancelado'],
    activeStatuses: ['Recebido'],
  },
  {
    key: 'diagnostico',
    obsKey: 'obs_diagnostico',
    label: 'Diagnóstico',
    emoji: '🔍',
    icon: ClipboardCheck,
    doneStatuses: ['Aguardando Peças', 'Em Manutenção', 'Pronto para Venda', 'Vendido'],
    activeStatuses: ['Em Diagnóstico'],
  },
  {
    key: 'reparacao',
    obsKey: 'obs_reparacao',
    label: 'Reparação',
    emoji: '🔧',
    icon: Wrench,
    doneStatuses: ['Pronto para Venda', 'Vendido'],
    activeStatuses: ['Aguardando Peças', 'Em Manutenção'],
  },
  {
    key: 'concluido',
    obsKey: 'obs_conclusao',
    label: 'Concluído',
    emoji: '✅',
    icon: CheckCircle2,
    doneStatuses: ['Vendido'],
    activeStatuses: ['Pronto para Venda'],
  },
  {
    key: 'entrega',
    obsKey: null,
    label: 'Entrega',
    emoji: '📦',
    icon: Package,
    doneStatuses: ['Vendido'],
    activeStatuses: [],
  },
]

function PhaseStep({
  phase, project, onSaveObs,
}: {
  phase: TimelinePhase
  project: Project
  onSaveObs: (key: string, value: string) => void
}) {
  const isDone = phase.doneStatuses.includes(project.status)
  const isActive = phase.activeStatuses.includes(project.status)
  const isCancelled = project.status === 'Cancelado'
  const obsValue = phase.obsKey ? (project[phase.obsKey] as string | null) ?? '' : ''
  const [obs, setObs] = useState(obsValue)
  const [saving, setSaving] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)

  const dotColor = isDone
    ? 'bg-success border-success'
    : isActive
    ? 'bg-accent border-accent animate-pulse'
    : isCancelled && !isDone
    ? 'bg-border border-border'
    : 'bg-surface border-border'

  async function saveObs() {
    if (!phase.obsKey || obs === obsValue) return
    setSaving(true)
    try { await onSaveObs(phase.obsKey, obs) }
    finally { setSaving(false) }
  }

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className={cn('h-4 w-4 rounded-full border-2 shrink-0 mt-1', dotColor)} />
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{phase.emoji}</span>
          <h3 className={cn(
            'font-semibold text-sm',
            isDone ? 'text-success' : isActive ? 'text-accent' : 'text-text-muted'
          )}>
            {phase.label}
          </h3>
          {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {isActive && (
            <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded-full font-medium">
              Em progresso
            </span>
          )}
        </div>

        {/* Observations */}
        {phase.obsKey && (
          <div className="mb-3">
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              onBlur={saveObs}
              placeholder={`Observações de ${phase.label.toLowerCase()}...`}
              rows={2}
              className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none transition-all"
            />
            {saving && <p className="text-[10px] text-text-muted mt-0.5">A guardar...</p>}
          </div>
        )}

        {/* Photos toggle */}
        <button
          onClick={() => setPhotosOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
          {photosOpen ? 'Ocultar fotos' : 'Fotos desta fase'}
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

export function ProjectDetails() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { data: projects = [], isLoading } = useProjects()
  const update = useUpdateProject()
  const [editOpen, setEditOpen] = useState(false)

  const project = projects.find(p => p.id === id)

  if (isLoading) {
    return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Projecto não encontrado.</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-accent hover:underline text-sm">
          Voltar aos projectos
        </button>
      </div>
    )
  }

  const { cost, profit, roi } = calcROI(project)
  const positive = profit >= 0
  const days = project.sold_at
    ? differenceInDays(new Date(project.sold_at), new Date(project.received_at))
    : differenceInDays(new Date(), new Date(project.received_at))

  async function handleSaveObs(key: string, value: string) {
    await update.mutateAsync({ id: project!.id, [key]: value || null })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 rounded-lg border border-border bg-surface hover:bg-accent/5 text-text-muted hover:text-accent transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            {project.ticket_number && (
              <p className="text-xs font-mono text-accent/70 mb-0.5">{project.ticket_number}</p>
            )}
            <h1 className="text-xl font-bold text-text-primary truncate">{project.equipment}</h1>
            {(project.brand || project.model) && (
              <p className="text-sm text-text-muted">{[project.brand, project.model].filter(Boolean).join(' · ')}</p>
            )}
            {project.serial_number && (
              <p className="text-xs text-text-muted font-mono mt-0.5">S/N: {project.serial_number}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', STATUS_COLORS[project.status])}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[project.status])} />
            {t(`statusMap.${project.status}`, { defaultValue: project.status })}
          </span>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-accent/5 hover:border-accent/40 text-sm text-text-muted hover:text-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-text-muted mb-1">Custo total</p>
          <p className="text-base font-bold text-text-primary">{fmtGBP(cost)}</p>
        </div>
        {project.sale_price != null && (
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-text-muted mb-1">Venda</p>
            <p className="text-base font-bold text-text-primary">{fmtGBP(project.sale_price)}</p>
          </div>
        )}
        {project.sale_price != null && (
          <div className={cn('rounded-xl border p-3 text-center', positive ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5')}>
            <p className="text-xs text-text-muted mb-1">Lucro</p>
            <div className={cn('flex items-center justify-center gap-1 text-base font-bold', positive ? 'text-success' : 'text-danger')}>
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {fmtGBP(profit)}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-text-muted mb-1">Tempo na oficina</p>
          <div className="flex items-center justify-center gap-1 text-base font-bold text-text-primary">
            <Clock className="h-4 w-4 text-text-muted" />
            {days}d
          </div>
        </div>
        {project.sale_price != null && (
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-text-muted mb-1">ROI</p>
            <p className={cn('text-base font-bold', positive ? 'text-success' : 'text-danger')}>{roi.toFixed(0)}%</p>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div>
            <span className="text-text-muted">Recebido: </span>
            <span className="text-text-primary">{fmtDate(project.received_at)}</span>
          </div>
          {project.sold_at && (
            <div>
              <span className="text-text-muted">Vendido: </span>
              <span className="text-text-primary">{fmtDate(project.sold_at)}</span>
            </div>
          )}
          {project.supplier_name && (
            <div>
              <span className="text-text-muted">Fornecedor: </span>
              <span className="text-text-primary">{project.supplier_name}</span>
            </div>
          )}
          {project.buyer_name && (
            <div>
              <span className="text-text-muted">Comprador: </span>
              <span className="text-text-primary">{project.buyer_name}</span>
            </div>
          )}
          {project.sale_platform && (
            <div>
              <span className="text-text-muted">Plataforma: </span>
              <span className="text-text-primary">{project.sale_platform}</span>
            </div>
          )}
        </div>
        {project.defect_description && (
          <div className="border-t border-border pt-2">
            <p className="text-text-muted text-xs mb-0.5">Defeito</p>
            <p className="text-xs text-text-primary">{project.defect_description}</p>
          </div>
        )}
        {project.diagnosis && (
          <div className="border-t border-border pt-2">
            <p className="text-text-muted text-xs mb-0.5">Diagnóstico</p>
            <p className="text-xs text-text-primary">{project.diagnosis}</p>
          </div>
        )}
        {project.notes && (
          <div className="border-t border-border pt-2">
            <p className="text-text-muted text-xs mb-0.5">Notas</p>
            <p className="text-xs text-text-primary">{project.notes}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Histórico de reparação
        </h2>
        <div>
          {TIMELINE.map((phase, i) => (
            <div key={phase.key} className={i === TIMELINE.length - 1 ? '[&_.flex-col>div:last-child]:hidden' : ''}>
              <PhaseStep phase={phase} project={project} onSaveObs={handleSaveObs} />
            </div>
          ))}
        </div>
      </div>

      {editOpen && (
        <ProjectModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
        />
      )}
    </div>
  )
}
