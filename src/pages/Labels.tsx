import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/hooks/useProjects'
import { PriceLabel } from '@/components/PriceLabel'
import { Printer, Tag, CheckSquare, Square } from 'lucide-react'
import { fmtGBP } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function Labels() {
  const { t } = useTranslation()
  const { data: projects = [], isLoading } = useProjects()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const printRef = useRef<HTMLDivElement>(null)

  const readyProjects = projects.filter(p => p.status === 'Pronto para Venda')

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(readyProjects.map(p => p.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  function handlePrint() {
    const toPrint = readyProjects.filter(p => selected.has(p.id))
    if (toPrint.length === 0) return

    const win = window.open('', '_blank', 'width=900,height=600')
    if (!win) return

    const labels = toPrint.map(p => `
      <div style="width:100mm;height:60mm;background:#fff;border:1px solid #ddd;border-radius:4px;padding:6mm;display:flex;flex-direction:column;justify-content:space-between;font-family:Arial,sans-serif;color:#000;box-sizing:border-box;page-break-after:always;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:7pt;font-weight:bold;color:#1a56db;letter-spacing:1px">RevTech PRO</div>
            ${p.ticket_number ? `<div style="font-size:6pt;color:#666;margin-top:1px">#${p.ticket_number}</div>` : ''}
          </div>
        </div>
        <div>
          <div style="font-size:9pt;font-weight:bold;line-height:1.2">${p.equipment}</div>
          ${(p.brand || p.model) ? `<div style="font-size:7pt;color:#444;margin-top:1px">${[p.brand, p.model].filter(Boolean).join(' · ')}</div>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:16pt;font-weight:bold;color:#1a56db;line-height:1">${fmtGBP(p.sale_price ?? 0)}</div>
            ${p.sale_platform ? `<div style="font-size:6pt;color:#666;margin-top:2px">${p.sale_platform}</div>` : ''}
          </div>
          <div style="text-align:right;font-size:6pt;color:#888">
            <div>${new Date().toLocaleDateString('pt-PT')}</div>
            <div>Testado ✓</div>
          </div>
        </div>
      </div>
    `).join('')

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas RevTech</title>
          <style>
            @page { size: 100mm 60mm; margin: 0; }
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${labels}
        </body>
      </html>
    `)
    win.document.close()
  }

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('labels.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('labels.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              <Printer className="h-4 w-4" />
              {t('labels.printSelected', { count: selected.size })}
            </button>
          )}
          {readyProjects.length > 0 && (
            selected.size === readyProjects.length ? (
              <button onClick={clearAll} className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t('labels.deselectAll')}
              </button>
            ) : (
              <button onClick={selectAll} className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t('labels.selectAll')}
              </button>
            )
          )}
        </div>
      </div>

      {readyProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <Tag className="h-12 w-12 text-text-muted mb-4 opacity-40" />
          <p className="text-text-muted">{t('labels.noItems')}</p>
          <p className="text-text-muted text-sm mt-1 opacity-70">{t('labels.noItemsDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {readyProjects.map(p => (
            <div
              key={p.id}
              onClick={() => toggleSelect(p.id)}
              className={cn(
                'relative rounded-xl border-2 bg-card cursor-pointer transition-all p-4',
                selected.has(p.id)
                  ? 'border-accent shadow-lg shadow-accent/10'
                  : 'border-border hover:border-accent/40'
              )}
            >
              {/* Selection indicator */}
              <div className="absolute top-3 right-3">
                {selected.has(p.id)
                  ? <CheckSquare className="h-5 w-5 text-accent" />
                  : <Square className="h-5 w-5 text-text-muted" />
                }
              </div>

              {/* Label preview */}
              <div
                style={{
                  transform: 'scale(0.6)',
                  transformOrigin: 'top left',
                  width: '100mm',
                  height: '60mm',
                  pointerEvents: 'none',
                }}
              >
                <PriceLabel project={p} inline />
              </div>

              {/* Info */}
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-text-primary truncate">{p.equipment}</p>
                <p className="text-sm font-bold text-accent">{fmtGBP(p.sale_price ?? 0)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden print area */}
      <div ref={printRef} className="hidden" />
    </div>
  )
}
