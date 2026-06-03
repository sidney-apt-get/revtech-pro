/**
 * pdf.ts — Motor de geração de PDF por impressão (window.print)
 * Funciona em todos os browsers sem dependências externas.
 * Usa a logo e cores da empresa definidas nas Configurações.
 */

import type { Project } from './supabase'
import { fmtGBP } from './utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PDFSettings {
  company_name: string
  company_subtitle: string
  company_location: string
  logo_url: string | null
  primary_color: string
  currency_symbol: string
}

export interface PDFInventoryItem {
  id: string
  item_name: string
  category: string
  quantity: number
  min_stock: number
  unit_cost: number
  location: string | null
  supplier: string | null
  notes: string | null
  barcode: string | null
  entry_date: string | null
  created_at: string
  photos?: string[]
  item_context?: string | null
}

export interface PDFRMAItem {
  id: string
  rma_number: string
  equipment: string
  brand: string | null
  model: string | null
  serial_number: string | null
  supplier: string | null
  purchase_price: number | null
  defect_description: string
  defect_category: string | null
  status: string
  destination: string | null
  destination_notes: string | null
  repair_cost: number | null
  recovery_value: number | null
  write_off_value: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PDFReportMetrics {
  period: string
  totalRevenue: number
  totalCost: number
  totalOpExpenses: number
  profit: number
  margin: number
  projectCount: number
  totalPartsCost: number
}

// ── Shared HTML Helpers ───────────────────────────────────────────────────────

function pageStyle(accentColor: string) {
  return `
    *, *::before, *::after { box-sizing: border-box; }
    @page { size: A4; margin: 12mm 14mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      margin: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.4;
    }
    h1 { margin: 0; font-size: 15pt; font-weight: 700; }
    h2 { margin: 0 0 6px; font-size: 10pt; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.05em; }
    p  { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 5px 8px; text-align: left; }
    th { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }

    .accent  { color: ${accentColor}; }
    .accent-bg { background: ${accentColor}; color: #fff; }
    .accent-border { border-color: ${accentColor}; }

    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 2.5px solid ${accentColor};
      margin-bottom: 16px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .company-logo {
      width: 48px; height: 48px; border-radius: 8px; object-fit: contain;
      border: 1px solid #eee;
    }
    .company-name { font-size: 14pt; font-weight: 800; color: ${accentColor}; }
    .company-sub  { font-size: 8pt; color: #888; margin-top: 2px; }
    .doc-title    { font-size: 9pt; color: #888; text-align: right; }
    .doc-number   { font-size: 11pt; font-weight: 700; color: #222; text-align: right; }

    /* Section card */
    .section {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 8pt; font-weight: 700; color: ${accentColor};
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #f0f0f0;
    }

    /* Grid */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; }
    .field-label { font-size: 7.5pt; color: #888; margin-bottom: 1px; }
    .field-value { font-size: 10pt; font-weight: 500; color: #1a1a2e; }

    /* Financial table */
    .fin-table td:last-child { text-align: right; font-weight: 600; }
    .fin-table tr.total { background: #f9fafb; font-weight: 700; }
    .fin-table tr.profit td { background: #dcfce7; color: #166534; }
    .fin-table tr.loss td { background: #fee2e2; color: #991b1b; }
    .fin-table td { border-top: 1px solid #f0f0f0; padding: 5px 8px; }

    /* Status badge */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: 600;
      border: 1px solid;
    }

    /* Photo */
    .photo { width: 100px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }

    /* Footer */
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #aaa;
    }
  `
}

function header(s: PDFSettings, docTitle: string, docNumber: string) {
  const logo = s.logo_url
    ? `<img src="${s.logo_url}" alt="Logo" class="company-logo" />`
    : `<div style="width:48px;height:48px;border-radius:8px;background:${s.primary_color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:18pt;font-weight:800;">${s.company_name.charAt(0)}</div>`

  return `
    <div class="header">
      <div class="header-left">
        ${logo}
        <div>
          <div class="company-name">${s.company_name}</div>
          <div class="company-sub">${s.company_subtitle} · ${s.company_location}</div>
        </div>
      </div>
      <div>
        <div class="doc-title">${docTitle}</div>
        <div class="doc-number">${docNumber}</div>
        <div class="doc-title" style="margin-top:4px">${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>
  `
}

function footer(s: PDFSettings) {
  return `
    <div class="footer">
      <span>${s.company_name} · ${s.company_location}</span>
      <span>Documento gerado em ${new Date().toLocaleString('pt-PT')} · RevTech PRO</span>
    </div>
  `
}

function field(label: string, value: string | null | undefined, mono = false) {
  if (!value) return ''
  return `
    <div>
      <div class="field-label">${label}</div>
      <div class="field-value${mono ? ' ' : ''}" style="${mono ? 'font-family:monospace;font-size:9pt' : ''}">${value}</div>
    </div>
  `
}

function openWindow(html: string, title: string) {
  const win = window.open('', '_blank', 'width=900,height=1200')
  if (!win) { alert('Permite popups para gerar o PDF.'); return }
  win.document.write(`<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 600)
}

// ── 1. PROJECT / ORDER SHEET ──────────────────────────────────────────────────

export interface PrintProjectOptions {
  project: Project
  settings: PDFSettings
  receptionPhotoUrl?: string | null
  ordersHtml?: string
  materialsHtml?: string
}

export function printProjectPDF({ project: p, settings: s, receptionPhotoUrl, ordersHtml, materialsHtml }: PrintProjectOptions) {
  const cost = p.purchase_price + p.parts_cost + p.shipping_in + p.shipping_out
  const profit = (p.sale_price ?? 0) - cost
  const roi = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '—'
  const positive = profit >= 0

  const statusColors: Record<string, string> = {
    'Vendido': 'background:#dcfce7;color:#166534;border-color:#86efac',
    'Cancelado': 'background:#fee2e2;color:#991b1b;border-color:#fca5a5',
    'Pronto para Venda': 'background:#fef3c7;color:#92400e;border-color:#fcd34d',
    'Em Manutenção': 'background:#dbeafe;color:#1e40af;border-color:#93c5fd',
    'Em Diagnóstico': 'background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe',
  }
  const statusStyle = statusColors[p.status] ?? 'background:#f1f5f9;color:#475569;border-color:#cbd5e1'

  const html = `
  <style>${pageStyle(s.primary_color)}</style>
  ${header(s, 'ORDEM DE SERVIÇO', p.ticket_number ? `#${p.ticket_number}` : `OS-${p.id.slice(0, 8).toUpperCase()}`)}

  <div style="display:flex;gap:16px;margin-bottom:12px;">
    ${receptionPhotoUrl ? `<img src="${receptionPhotoUrl}" class="photo" style="width:100px;height:80px;flex-shrink:0;" alt="Foto" />` : ''}
    <div class="section" style="flex:1;margin-bottom:0">
      <div class="section-title">Equipamento</div>
      <div class="grid-2">
        ${field('Equipamento', p.equipment)}
        ${field('Estado', `<span class="badge" style="${statusStyle}">${p.status}</span>`)}
        ${field('Marca', p.brand)}
        ${field('Modelo', p.model)}
        ${field('Nº de Série', p.serial_number, true)}
        ${field('IMEI', p.imei, true)}
        ${field('Cor', p.device_color)}
        ${field('Grau', p.condition_grade)}
        ${p.storage_gb ? field('Armazenamento', `${p.storage_gb >= 1024 ? '1TB' : `${p.storage_gb}GB`}`) : ''}
        ${p.ram_gb ? field('RAM', `${p.ram_gb}GB`) : ''}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div class="section" style="margin-bottom:0">
      <div class="section-title">Defeito & Diagnóstico</div>
      ${field('Defeito reportado', p.defect_description)}
      ${p.diagnosis ? field('Diagnóstico', p.diagnosis) : ''}
    </div>
    <div class="section" style="margin-bottom:0">
      <div class="section-title">Financeiro</div>
      <table class="fin-table">
        <tr><td>Preço de compra</td><td>${fmtGBP(p.purchase_price)}</td></tr>
        <tr><td>Custo de peças</td><td>${fmtGBP(p.parts_cost)}</td></tr>
        <tr><td>Frete entrada</td><td>${fmtGBP(p.shipping_in)}</td></tr>
        <tr><td>Frete saída</td><td>${fmtGBP(p.shipping_out)}</td></tr>
        <tr class="total"><td>Custo total</td><td>${fmtGBP(cost)}</td></tr>
        ${p.sale_price != null ? `
          <tr><td>Preço de venda</td><td>${fmtGBP(p.sale_price)}</td></tr>
          <tr class="${positive ? 'profit' : 'loss'}"><td>${positive ? 'Lucro' : 'Prejuízo'}</td><td>${positive ? '+' : ''}${fmtGBP(profit)} (ROI ${roi}%)</td></tr>
        ` : ''}
      </table>
      ${p.sale_platform ? `<p style="margin-top:6px;font-size:8pt;color:#888">Plataforma: ${p.sale_platform}</p>` : ''}
    </div>
  </div>

  ${(p.obs_recepcao || p.obs_diagnostico || p.obs_reparacao || p.obs_conclusao) ? `
    <div class="section">
      <div class="section-title">Observações por fase</div>
      <div class="grid-2">
        ${p.obs_recepcao ? field('Recepção', p.obs_recepcao) : ''}
        ${p.obs_diagnostico ? field('Diagnóstico', p.obs_diagnostico) : ''}
        ${p.obs_reparacao ? field('Reparação', p.obs_reparacao) : ''}
        ${p.obs_conclusao ? field('Conclusão', p.obs_conclusao) : ''}
      </div>
    </div>
  ` : ''}

  ${p.notes ? `
    <div class="section">
      <div class="section-title">Notas</div>
      <p style="font-size:9pt;color:#444">${p.notes}</p>
    </div>
  ` : ''}

  <div class="grid-2" style="gap:12px;">
    <div class="section" style="margin-bottom:0">
      <div class="section-title">Logística</div>
      <div class="grid-2">
        ${field('Fornecedor / Origem', p.supplier_name)}
        ${field('Comprador', p.buyer_name)}
        ${field('Ref. compra', p.purchase_reference, true)}
        ${field('Data recepção', p.received_at ? new Date(p.received_at).toLocaleDateString('pt-PT') : null)}
        ${p.sold_at ? field('Data venda', new Date(p.sold_at).toLocaleDateString('pt-PT')) : ''}
      </div>
    </div>
    ${(p.battery_capacity_original || p.battery_health_percent) ? `
      <div class="section" style="margin-bottom:0">
        <div class="section-title">Bateria</div>
        <div class="grid-2">
          ${field('Capacidade original', p.battery_capacity_original ? `${p.battery_capacity_original} mAh` : null)}
          ${field('Capacidade actual', p.battery_capacity_current ? `${p.battery_capacity_current} mAh` : null)}
          ${field('Saúde', p.battery_health_percent ? `${p.battery_health_percent}%` : null)}
          ${field('Ciclos', p.battery_cycles ? String(p.battery_cycles) : null)}
        </div>
      </div>
    ` : ''}
  </div>

  ${ordersHtml ? `
    <div class="section" style="margin-top:12px">
      <div class="section-title">Encomendas de peças</div>
      ${ordersHtml}
    </div>
  ` : ''}

  ${materialsHtml ? `
    <div class="section" style="margin-top:12px">
      <div class="section-title">Materiais utilizados</div>
      ${materialsHtml}
    </div>
  ` : ''}

  ${footer(s)}
  `

  openWindow(html, `OS ${p.ticket_number ?? p.id.slice(0, 8)} — ${p.equipment}`)
}

// ── 2. INVENTORY ITEM SHEET ───────────────────────────────────────────────────

export function printInventoryPDF(item: PDFInventoryItem, s: PDFSettings) {
  const totalValue = item.unit_cost * item.quantity
  const lowStock = item.quantity < item.min_stock

  const html = `
  <style>${pageStyle(s.primary_color)}</style>
  ${header(s, 'FICHA DE ITEM — INVENTÁRIO', item.barcode ? `EAN: ${item.barcode}` : `ID: ${item.id.slice(0, 8).toUpperCase()}`)}

  <div style="display:flex;gap:16px;margin-bottom:12px;">
    ${item.photos?.[0] ? `<img src="${item.photos[0]}" class="photo" style="width:100px;height:80px;flex-shrink:0;" alt="Foto" />` : ''}
    <div class="section" style="flex:1;margin-bottom:0;">
      <div class="section-title">Identificação</div>
      <div class="grid-2">
        ${field('Nome do item', `<strong style="font-size:11pt">${item.item_name}</strong>`)}
        ${field('Categoria', item.category)}
        ${field('Origem', item.item_context === 'cannibalized' ? '♻️ Reaproveitada' : item.item_context === 'lot' ? '📦 De lote' : '🆕 Nova')}
        ${field('Localização', item.location)}
        ${field('Fornecedor', item.supplier)}
        ${field('Código EAN', item.barcode, true)}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div class="section" style="margin-bottom:0;">
      <div class="section-title">Stock</div>
      <div style="display:flex;gap:16px;align-items:center;">
        <div style="text-align:center;">
          <div style="font-size:28pt;font-weight:800;color:${lowStock ? '#dc2626' : s.primary_color}">${item.quantity}</div>
          <div style="font-size:7.5pt;color:#888">Unidades em stock</div>
        </div>
        <div style="flex:1;">
          <div class="grid-2">
            ${field('Stock mínimo', String(item.min_stock))}
            ${field('Custo unitário', fmtGBP(item.unit_cost))}
            ${field('Valor total', fmtGBP(totalValue))}
            ${lowStock ? '<div style="grid-column:span 2"><span class="badge" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5">⚠ Stock abaixo do mínimo</span></div>' : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="section" style="margin-bottom:0;">
      <div class="section-title">Datas</div>
      <div class="grid-2">
        ${field('Data entrada', item.entry_date ? new Date(item.entry_date).toLocaleDateString('pt-PT') : new Date(item.created_at).toLocaleDateString('pt-PT'))}
        ${field('Última actualização', new Date(item.created_at).toLocaleDateString('pt-PT'))}
      </div>
    </div>
  </div>

  ${item.notes ? `
    <div class="section">
      <div class="section-title">Notas & Observações</div>
      <p style="font-size:9pt;color:#444;white-space:pre-wrap;">${item.notes}</p>
    </div>
  ` : ''}

  ${footer(s)}
  `

  openWindow(html, `Inventário — ${item.item_name}`)
}

// ── 3. RMA SHEET ─────────────────────────────────────────────────────────────

export function printRMAPDF(rma: PDFRMAItem, s: PDFSettings) {
  const statusColors: Record<string, string> = {
    'received':         'background:#dbeafe;color:#1e40af;border-color:#93c5fd',
    'triage':           'background:#fef3c7;color:#92400e;border-color:#fcd34d',
    'pending_decision': 'background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe',
    'in_repair':        'background:#ffedd5;color:#9a3412;border-color:#fdba74',
    'resolved':         'background:#dcfce7;color:#166534;border-color:#86efac',
    'cannibalized':     'background:#e0f2fe;color:#0c4a6e;border-color:#7dd3fc',
    'written_off':      'background:#fee2e2;color:#991b1b;border-color:#fca5a5',
  }
  const statusStyle = statusColors[rma.status] ?? 'background:#f1f5f9;color:#475569;border-color:#cbd5e1'

  const statusLabels: Record<string, string> = {
    received: 'Recebido', triage: 'Em Triage', pending_decision: 'Aguarda Decisão',
    in_repair: 'Em Reparação', resolved: 'Resolvido', cannibalized: 'Canibalizado', written_off: 'Abatido'
  }

  const html = `
  <style>${pageStyle(s.primary_color)}</style>
  ${header(s, 'RMA — CONTROLO DE DEFEITO', rma.rma_number)}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div class="section" style="margin-bottom:0;">
      <div class="section-title">Produto</div>
      <div class="grid-2">
        ${field('Equipamento', `<strong style="font-size:11pt">${rma.equipment}</strong>`)}
        ${field('Estado', `<span class="badge" style="${statusStyle}">${statusLabels[rma.status] ?? rma.status}</span>`)}
        ${field('Marca', rma.brand)}
        ${field('Modelo', rma.model)}
        ${field('Nº de Série', rma.serial_number, true)}
      </div>
    </div>
    <div class="section" style="margin-bottom:0;">
      <div class="section-title">Origem & Financeiro</div>
      <div class="grid-2">
        ${field('Fornecedor', rma.supplier)}
        ${field('Preço pago', rma.purchase_price ? fmtGBP(rma.purchase_price) : null)}
        ${field('Custo reparação', rma.repair_cost ? fmtGBP(rma.repair_cost) : null)}
        ${field('Valor recuperado', rma.recovery_value ? fmtGBP(rma.recovery_value) : null)}
        ${field('Write-off', rma.write_off_value ? fmtGBP(rma.write_off_value) : null)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Defeito & Decisão</div>
    <div class="grid-2">
      ${field('Categoria do defeito', rma.defect_category)}
      ${field('Destino', rma.destination)}
    </div>
    ${field('Descrição do defeito', rma.defect_description)}
    ${rma.destination_notes ? `<div style="margin-top:8px">${field('Notas sobre destino', rma.destination_notes)}</div>` : ''}
  </div>

  ${rma.notes ? `
    <div class="section">
      <div class="section-title">Notas internas</div>
      <p style="font-size:9pt;color:#444">${rma.notes}</p>
    </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Registo</div>
    <div class="grid-3">
      ${field('Nº RMA', rma.rma_number, true)}
      ${field('Criado em', new Date(rma.created_at).toLocaleDateString('pt-PT'))}
      ${field('Última actualização', new Date(rma.updated_at).toLocaleDateString('pt-PT'))}
    </div>
  </div>

  ${footer(s)}
  `

  openWindow(html, `RMA ${rma.rma_number} — ${rma.equipment}`)
}

// ── 4. FINANCIAL REPORT ───────────────────────────────────────────────────────

export function printReportPDF(m: PDFReportMetrics, s: PDFSettings) {
  const positive = m.profit >= 0

  const html = `
  <style>${pageStyle(s.primary_color)}</style>
  ${header(s, 'RELATÓRIO FINANCEIRO', m.period)}

  <!-- KPI Cards -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
    ${kpiCard('Receita Total', fmtGBP(m.totalRevenue), '#166534', '#dcfce7')}
    ${kpiCard('Custo Directo', fmtGBP(m.totalCost), '#1e40af', '#dbeafe')}
    ${kpiCard('Despesas Op.', fmtGBP(m.totalOpExpenses), '#92400e', '#fef3c7')}
    ${kpiCard(positive ? 'Lucro Líquido' : 'Prejuízo Líquido', fmtGBP(Math.abs(m.profit)), positive ? '#166534' : '#991b1b', positive ? '#dcfce7' : '#fee2e2')}
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div class="section" style="margin-bottom:0;">
      <div class="section-title">Resumo financeiro</div>
      <table class="fin-table">
        <tr><td>Receita total</td><td>${fmtGBP(m.totalRevenue)}</td></tr>
        <tr><td>Custo directo (compras + peças + envios)</td><td>${fmtGBP(m.totalCost)}</td></tr>
        <tr><td>Custo de peças</td><td>${fmtGBP(m.totalPartsCost)}</td></tr>
        <tr><td>Despesas operacionais</td><td>${fmtGBP(m.totalOpExpenses)}</td></tr>
        <tr class="total"><td>Custo total</td><td>${fmtGBP(m.totalCost + m.totalOpExpenses)}</td></tr>
        <tr class="${positive ? 'profit' : 'loss'}"><td>${positive ? 'Lucro líquido' : 'Prejuízo líquido'}</td><td>${positive ? '+' : ''}${fmtGBP(m.profit)}</td></tr>
      </table>
    </div>
    <div class="section" style="margin-bottom:0;">
      <div class="section-title">Indicadores</div>
      <div class="grid-2">
        ${field('Margem líquida', `${m.margin.toFixed(1)}%`)}
        ${field('Projectos vendidos', String(m.projectCount))}
        ${field('Receita por venda', m.projectCount > 0 ? fmtGBP(m.totalRevenue / m.projectCount) : '—')}
        ${field('Lucro por venda', m.projectCount > 0 ? fmtGBP(m.profit / m.projectCount) : '—')}
      </div>
    </div>
  </div>

  <div class="section" style="background:#f9fafb;">
    <p style="font-size:8pt;color:#888;text-align:center;">
      Este relatório foi gerado automaticamente pelo RevTech PRO em ${new Date().toLocaleString('pt-PT')}.
      Os valores apresentados são baseados nos dados inseridos no sistema e têm carácter informativo.
      Consulte um contabilista para efeitos fiscais.
    </p>
  </div>

  ${footer(s)}
  `

  openWindow(html, `Relatório ${m.period}`)
}

function kpiCard(label: string, value: string, textColor: string, bgColor: string) {
  return `
    <div style="background:${bgColor};border-radius:8px;padding:10px 12px;text-align:center;">
      <div style="font-size:7.5pt;color:${textColor};margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${label}</div>
      <div style="font-size:14pt;font-weight:800;color:${textColor}">${value}</div>
    </div>
  `
}
