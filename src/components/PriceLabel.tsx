import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import type { Project } from '@/lib/supabase'
import { fmtGBP } from '@/lib/utils'

interface PriceLabelProps {
  project: Project
  /** If true, renders inline (for batch print). If false, renders in a print dialog wrapper. */
  inline?: boolean
}

export function PriceLabel({ project, inline = false }: PriceLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrValue = project.ticket_number
    ? `RevTech:${project.ticket_number}`
    : `RevTech:${project.id.slice(0, 8)}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrValue, {
        width: 80,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }
  }, [qrValue])

  const content = (
    <div
      className="price-label"
      style={{
        width: '100mm',
        height: '60mm',
        background: '#ffffff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '6mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
      }}
    >
      {/* Header: brand + logo text */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '7pt', fontWeight: 'bold', color: '#1a56db', letterSpacing: '1px' }}>
            RevTech PRO
          </div>
          {project.ticket_number && (
            <div style={{ fontSize: '6pt', color: '#666', marginTop: '1px' }}>
              #{project.ticket_number}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ width: '18mm', height: '18mm' }} />
      </div>

      {/* Equipment name */}
      <div>
        <div style={{ fontSize: '9pt', fontWeight: 'bold', lineHeight: 1.2 }}>
          {project.equipment}
        </div>
        {(project.brand || project.model) && (
          <div style={{ fontSize: '7pt', color: '#444', marginTop: '1px' }}>
            {[project.brand, project.model].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {/* Price row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#1a56db', lineHeight: 1 }}>
            {fmtGBP(project.sale_price ?? 0)}
          </div>
          {project.sale_platform && (
            <div style={{ fontSize: '6pt', color: '#666', marginTop: '2px' }}>
              {project.sale_platform}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: '6pt', color: '#888' }}>
          <div>{format(new Date(), 'dd/MM/yyyy')}</div>
          <div>Testado ✓</div>
        </div>
      </div>
    </div>
  )

  if (inline) return content

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .price-label, .price-label * { visibility: visible !important; }
          .price-label { position: fixed; left: 0; top: 0; }
        }
      `}</style>
      {content}
    </>
  )
}
