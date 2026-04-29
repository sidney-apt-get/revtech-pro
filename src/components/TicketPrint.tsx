import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReactToPrint } from 'react-to-print'
import QRCode from 'qrcode'
import { type Project } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import { Printer, X } from 'lucide-react'

interface TicketPrintProps {
  project: Project
  onClose: () => void
}

export function TicketPrint({ project, onClose }: TicketPrintProps) {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const ticketNumber = project.ticket_number ?? 'RT-????'

  useEffect(() => {
    QRCode.toDataURL(ticketNumber, { width: 120, margin: 1 }).then(setQrDataUrl)
  }, [ticketNumber])

  const handlePrint = useReactToPrint({ contentRef })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">{t('labels.preview')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-6 flex justify-center">
          <div
            ref={contentRef}
            style={{
              width: '80mm',
              height: '50mm',
              background: '#fff',
              color: '#000',
              fontFamily: 'Arial, sans-serif',
              padding: '4mm',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #ccc',
              borderRadius: '3px',
            }}
          >
            {/* Top row: logo + ticket number */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' }}>RevTech</div>
                <div style={{ fontSize: '8px', color: '#555' }}>Repair &amp; Resale</div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1px', color: '#1a1a2e' }}>
                {ticketNumber}
              </div>
            </div>

            {/* Middle: equipment info */}
            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '2mm' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {project.equipment}{project.brand ? ` · ${project.brand}` : ''}{project.model ? ` ${project.model}` : ''}
              </div>
              <div style={{ fontSize: '8px', color: '#444', marginTop: '1mm', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {project.defect_description}
              </div>
            </div>

            {/* Bottom: QR + date */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px dashed #ccc', paddingTop: '2mm' }}>
              <div style={{ fontSize: '7px', color: '#666' }}>
                <div>{t('project_detail.recepcao')}: {fmtDate(project.received_at)}</div>
                {project.supplier_name && <div>{t('projects.fields.supplier')}: {project.supplier_name}</div>}
              </div>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR" style={{ width: '28mm', height: '28mm' }} />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface transition-colors"
          >
            {t('common.close')}
          </button>
          <button
            onClick={() => handlePrint()}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            {t('common.print')}
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          [data-ticket-content], [data-ticket-content] * { visibility: visible !important; }
          [data-ticket-content] {
            position: fixed !important;
            left: 0; top: 0;
            width: 80mm; height: 50mm;
            margin: 0; padding: 4mm;
          }
        }
      `}</style>
    </div>
  )
}
