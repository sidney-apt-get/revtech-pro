import type { Project } from './supabase'
import { fmtGBP } from './utils'

export function printLabel(project: Project) {
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
