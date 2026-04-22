import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { type Project, type PartsOrder } from './supabase'
import { calcROI } from './utils'

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function addHeader(doc: jsPDF, title: string) {
  doc.setFillColor(19, 21, 31)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('RevTech', 14, 12)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 160, 180)
  doc.text('Repair & Resale · Livingston, Scotland', 14, 18)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 25)
}

function addFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(120, 130, 145)
    doc.text(`RevTech · Livingston, Scotland · Página ${i}/${pageCount}`, 14, 290)
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 210 - 14, 290, { align: 'right' })
  }
}

export function generateMonthlyReport(projects: Project[], orders: PartsOrder[], month: number, year: number): void {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  const soldProjects = projects.filter(p => {
    if (p.status !== 'Vendido' || !p.sold_at) return false
    const d = new Date(p.sold_at)
    return d >= monthStart && d <= monthEnd
  })

  const monthOrders = orders.filter(o => {
    const d = new Date(o.ordered_at)
    return d >= monthStart && d <= monthEnd && o.status !== 'Cancelado'
  })

  const totalRevenue = soldProjects.reduce((s, p) => s + (p.sale_price ?? 0), 0)
  const totalCost = soldProjects.reduce((s, p) => s + calcROI(p).cost, 0)
  const totalParts = monthOrders.reduce((s, o) => s + (o.total_cost ?? 0), 0)
  const profit = totalRevenue - totalCost
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
  const vat = profit > 0 ? profit * 0.2 : 0

  const doc = new jsPDF()
  const title = `Relatório Mensal — ${MONTH_NAMES[month]} ${year}`
  addHeader(doc, title)

  let y = 38

  // Summary boxes
  doc.setFillColor(30, 33, 48)
  doc.roundedRect(14, y, 43, 20, 2, 2, 'F')
  doc.roundedRect(62, y, 43, 20, 2, 2, 'F')
  doc.roundedRect(110, y, 43, 20, 2, 2, 'F')
  doc.roundedRect(158, y, 38, 20, 2, 2, 'F')

  const boxes = [
    { label: 'Receita', value: `£${totalRevenue.toFixed(2)}`, x: 14 },
    { label: 'Custos', value: `£${totalCost.toFixed(2)}`, x: 62 },
    { label: 'Lucro', value: `£${profit.toFixed(2)}`, x: 110 },
    { label: 'Margem', value: `${margin.toFixed(1)}%`, x: 158 },
  ]
  boxes.forEach(b => {
    doc.setFontSize(7)
    doc.setTextColor(150, 160, 180)
    doc.setFont('helvetica', 'normal')
    doc.text(b.label, b.x + 3, y + 6)
    doc.setFontSize(11)
    doc.setTextColor(profit >= 0 ? 76 : 224, profit >= 0 ? 175 : 92, profit >= 0 ? 80 : 92)
    doc.setFont('helvetica', 'bold')
    doc.text(b.value, b.x + 3, y + 15)
  })

  y += 30

  // Sold projects table
  doc.setFontSize(10)
  doc.setTextColor(232, 234, 237)
  doc.setFont('helvetica', 'bold')
  doc.text(`Projectos Vendidos (${soldProjects.length})`, 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Ticket', 'Equipamento', 'Compra', 'Peças', 'Envio', 'Venda', 'Lucro']],
    body: soldProjects.map(p => {
      const { profit } = calcROI(p)
      return [
        p.ticket_number ?? '—',
        `${p.equipment}${p.brand ? ` ${p.brand}` : ''}`,
        `£${(p.purchase_price || 0).toFixed(2)}`,
        `£${(p.parts_cost || 0).toFixed(2)}`,
        `£${((p.shipping_in || 0) + (p.shipping_out || 0)).toFixed(2)}`,
        `£${(p.sale_price ?? 0).toFixed(2)}`,
        `£${profit.toFixed(2)}`,
      ]
    }),
    foot: [['', 'TOTAL', `£${soldProjects.reduce((s,p)=>s+(p.purchase_price||0),0).toFixed(2)}`, '', '', `£${totalRevenue.toFixed(2)}`, `£${profit.toFixed(2)}`]],
    styles: { fontSize: 8, cellPadding: 2, textColor: [200, 210, 225], fillColor: [25, 27, 40] },
    headStyles: { fillColor: [40, 45, 70], textColor: [150, 160, 200], fontStyle: 'bold' },
    footStyles: { fillColor: [30, 35, 55], textColor: [76, 175, 80], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [30, 33, 48] },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  if (doc.internal.pageSize.height - y < 60) { doc.addPage(); y = 20 }

  // Orders table
  doc.setFontSize(10)
  doc.setTextColor(232, 234, 237)
  doc.setFont('helvetica', 'bold')
  doc.text(`Encomendas de Peças — ${MONTH_NAMES[month]} (£${totalParts.toFixed(2)})`, 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Fornecedor', 'Peça', 'Qtd', 'Total', 'Estado']],
    body: monthOrders.map(o => [o.supplier, o.part_name, o.quantity, `£${(o.total_cost ?? 0).toFixed(2)}`, o.status]),
    styles: { fontSize: 8, cellPadding: 2, textColor: [200, 210, 225], fillColor: [25, 27, 40] },
    headStyles: { fillColor: [40, 45, 70], textColor: [150, 160, 200], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [30, 33, 48] },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // VAT estimate
  if (doc.internal.pageSize.height - y < 30) { doc.addPage(); y = 20 }
  doc.setFontSize(9)
  doc.setTextColor(150, 160, 180)
  doc.setFont('helvetica', 'normal')
  doc.text(`IVA estimado (20% sobre lucro): £${vat.toFixed(2)}`, 14, y)

  addFooter(doc)
  doc.save(`RevTech_${MONTH_NAMES[month]}_${year}.pdf`)
}

export function generateAnnualReport(projects: Project[], _orders: PartsOrder[], year: number): void {
  const yearProjects = projects.filter(p => p.status === 'Vendido' && p.sold_at && new Date(p.sold_at).getFullYear() === year)

  const totalRevenue = yearProjects.reduce((s, p) => s + (p.sale_price ?? 0), 0)
  const totalCost = yearProjects.reduce((s, p) => s + calcROI(p).cost, 0)
  const profit = totalRevenue - totalCost

  const byMonth = Array.from({ length: 12 }, (_, m) => {
    const mp = yearProjects.filter(p => p.sold_at && new Date(p.sold_at).getMonth() === m)
    const rev = mp.reduce((s, p) => s + (p.sale_price ?? 0), 0)
    const cost = mp.reduce((s, p) => s + calcROI(p).cost, 0)
    return { month: MONTH_NAMES[m], projects: mp.length, revenue: rev, profit: rev - cost }
  })

  const doc = new jsPDF()
  addHeader(doc, `Relatório Anual ${year}`)

  let y = 38
  doc.setFontSize(10)
  doc.setTextColor(232, 234, 237)
  doc.setFont('helvetica', 'bold')
  doc.text(`Resumo ${year} — ${yearProjects.length} projectos vendidos`, 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    head: [['Mês', 'Projectos', 'Receita', 'Lucro']],
    body: byMonth.map(m => [m.month, m.projects, `£${m.revenue.toFixed(2)}`, `£${m.profit.toFixed(2)}`]),
    foot: [['TOTAL', yearProjects.length, `£${totalRevenue.toFixed(2)}`, `£${profit.toFixed(2)}`]],
    styles: { fontSize: 8, cellPadding: 2, textColor: [200, 210, 225], fillColor: [25, 27, 40] },
    headStyles: { fillColor: [40, 45, 70], textColor: [150, 160, 200], fontStyle: 'bold' },
    footStyles: { fillColor: [30, 35, 55], textColor: [76, 175, 80], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [30, 33, 48] },
  })

  addFooter(doc)
  doc.save(`RevTech_Anual_${year}.pdf`)
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => {
    const v = row[h]
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
