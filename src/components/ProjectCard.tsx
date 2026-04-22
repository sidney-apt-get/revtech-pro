import { useState } from 'react'
import { type Project } from '@/lib/supabase'
import { calcROI, fmtGBP, fmtDate, STATUS_COLORS, STATUS_DOT } from '@/lib/utils'
import { Wrench, Calendar, TrendingUp, TrendingDown, ClipboardCheck, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TicketPrint } from './TicketPrint'
import { ChecklistModal } from './ChecklistModal'

interface ProjectCardProps {
  project: Project
  onClick?: () => void
  compact?: boolean
}

export function ProjectCard({ project, onClick, compact }: ProjectCardProps) {
  const { cost, profit, roi } = calcROI(project)
  const positive = profit >= 0
  const [showTicket, setShowTicket] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)

  return (
    <>
      <div
        onClick={onClick}
        className={cn(
          'rounded-xl border border-border bg-card p-4 space-y-3 transition-all cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5',
          compact && 'p-3 space-y-2'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {project.ticket_number && (
                <span className="text-xs font-mono text-accent/70 shrink-0">{project.ticket_number}</span>
              )}
            </div>
            <h3 className="font-semibold text-text-primary text-sm truncate">{project.equipment}</h3>
            {(project.brand || project.model) && (
              <p className="text-xs text-text-muted truncate">{[project.brand, project.model].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <span className={cn('shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[project.status])}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[project.status])} />
            {project.status}
          </span>
        </div>

        {/* Defect */}
        <p className="text-xs text-text-muted line-clamp-2">{project.defect_description}</p>

        {!compact && (
          <>
            {/* Financials */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <p className="text-text-muted">Custo total</p>
                <p className="font-semibold text-text-primary">{fmtGBP(cost)}</p>
              </div>
              {project.sale_price != null && (
                <div className="space-y-1">
                  <p className="text-text-muted">Venda</p>
                  <p className="font-semibold text-text-primary">{fmtGBP(project.sale_price)}</p>
                </div>
              )}
            </div>

            {/* ROI */}
            {project.sale_price != null && (
              <div className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold',
                positive ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
              )}>
                <span className="flex items-center gap-1">
                  {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  Lucro: {fmtGBP(profit)}
                </span>
                <span>ROI {roi.toFixed(0)}%</span>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-text-muted pt-1 border-t border-border">
          <Calendar className="h-3.5 w-3.5" />
          <span>{fmtDate(project.received_at)}</span>
          {project.supplier_name && (
            <>
              <span>·</span>
              <Wrench className="h-3.5 w-3.5" />
              <span className="truncate">{project.supplier_name}</span>
            </>
          )}

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              title="Checklist"
              onClick={() => setShowChecklist(true)}
              className="p-1 rounded hover:bg-surface hover:text-accent transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
            </button>
            <button
              title="Imprimir Ticket"
              onClick={() => setShowTicket(true)}
              className="p-1 rounded hover:bg-surface hover:text-accent transition-colors"
            >
              <Ticket className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showTicket && (
        <TicketPrint project={project} onClose={() => setShowTicket(false)} />
      )}
      {showChecklist && (
        <ChecklistModal project={project} onClose={() => setShowChecklist(false)} />
      )}
    </>
  )
}
