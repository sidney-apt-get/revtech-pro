import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Project } from '@/lib/supabase'
import { calcROI, fmtGBP, fmtDate, STATUS_COLORS, STATUS_DOT } from '@/lib/utils'
import { Wrench, Calendar, TrendingUp, TrendingDown, ClipboardCheck, Ticket, Tag, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TicketPrint } from './TicketPrint'
import { ChecklistModal } from './ChecklistModal'
import { CexPriceWidget } from './CexPriceWidget'

interface ProjectCardProps {
  project: Project
  onClick?: () => void
  compact?: boolean
}

function printLabel(project: Project) {
  const win = window.open('', '_blank', 'width=900,height=600')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Etiqueta</title>
        <style>
          @page { size: 100mm 60mm; margin: 0; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .label { width:100mm;height:60mm;padding:6mm;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box; }
        </style>
      </head>
      <body onload="window.print();window.close()">
        <div class="label">
          <div style="display:flex;justify-content:space-between">
            <div>
              <div style="font-size:7pt;font-weight:bold;color:#1a56db">RevTech PRO</div>
              ${project.ticket_number ? `<div style="font-size:6pt;color:#666">#${project.ticket_number}</div>` : ''}
            </div>
          </div>
          <div>
            <div style="font-size:9pt;font-weight:bold">${project.equipment}</div>
            ${(project.brand || project.model) ? `<div style="font-size:7pt;color:#444">${[project.brand, project.model].filter(Boolean).join(' · ')}</div>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end">
            <div>
              <div style="font-size:16pt;font-weight:bold;color:#1a56db">${fmtGBP(project.sale_price ?? 0)}</div>
              ${project.sale_platform ? `<div style="font-size:6pt;color:#666">${project.sale_platform}</div>` : ''}
            </div>
            <div style="font-size:6pt;color:#888;text-align:right">
              <div>${new Date().toLocaleDateString('pt-PT')}</div>
              <div>Testado ✓</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `)
  win.document.close()
}

export function ProjectCard({ project, onClick, compact }: ProjectCardProps) {
  const { t } = useTranslation()
  const { cost, profit, roi } = calcROI(project)
  const positive = profit >= 0
  const [showTicket, setShowTicket] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showCex, setShowCex] = useState(false)

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
            {t(`statusMap.${project.status}`, { defaultValue: project.status })}
          </span>
        </div>

        {/* Defect */}
        <p className="text-xs text-text-muted line-clamp-2">{project.defect_description}</p>

        {!compact && (
          <>
            {/* Financials */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <p className="text-text-muted">{t('projects.fields.totalCost')}</p>
                <p className="font-semibold text-text-primary">{fmtGBP(cost)}</p>
              </div>
              {project.sale_price != null && (
                <div className="space-y-1">
                  <p className="text-text-muted">{t('projects.fields.salePrice')}</p>
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
                  {t('projects.fields.profit')}: {fmtGBP(profit)}
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
              title={t('checklist.title')}
              onClick={() => setShowChecklist(true)}
              className="p-1 rounded hover:bg-surface hover:text-accent transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
            </button>
            <button
              title={t('common.print')}
              onClick={() => setShowTicket(true)}
              className="p-1 rounded hover:bg-surface hover:text-accent transition-colors"
            >
              <Ticket className="h-3.5 w-3.5" />
            </button>
            {project.status === 'Pronto para Venda' && (
              <>
                <button
                  title={t('labels.print')}
                  onClick={() => printLabel(project)}
                  className="p-1 rounded hover:bg-surface hover:text-success transition-colors"
                >
                  <Tag className="h-3.5 w-3.5" />
                </button>
                <button
                  title={t('cex.search')}
                  onClick={() => setShowCex(true)}
                  className="p-1 rounded hover:bg-surface hover:text-accent transition-colors"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showTicket && (
        <TicketPrint project={project} onClose={() => setShowTicket(false)} />
      )}
      {showChecklist && (
        <ChecklistModal project={project} onClose={() => setShowChecklist(false)} />
      )}
      {showCex && (
        <CexPriceWidget
          query={`${project.brand ?? ''} ${project.model ?? ''} ${project.equipment}`.trim()}
          onClose={() => setShowCex(false)}
        />
      )}
    </>
  )
}
