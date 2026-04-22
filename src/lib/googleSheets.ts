import { supabase } from './supabase'
import { type Project, type InventoryItem, type PartsOrder } from './supabase'
import { calcROI } from './utils'

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return (data.session?.provider_token) ?? null
}

async function sheetsRequest(url: string, method: string, body?: object) {
  const token = await getAccessToken()
  if (!token) throw new Error('Google access token não disponível. Faz login com Google.')
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? 'Erro Google Sheets')
  }
  return res.json()
}

async function findOrCreateSpreadsheet(title: string): Promise<string> {
  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${title}' and mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${await getAccessToken()}` } }
  )
  const driveData = await driveRes.json()
  if (driveData.files?.length > 0) return driveData.files[0].id

  const created = await sheetsRequest('https://sheets.googleapis.com/v4/spreadsheets', 'POST', {
    properties: { title },
    sheets: [
      { properties: { title: 'Projectos' } },
      { properties: { title: 'Inventário' } },
      { properties: { title: 'Encomendas' } },
      { properties: { title: 'Resumo Mensal' } },
    ],
  })
  return created.spreadsheetId
}

async function updateSheet(spreadsheetId: string, sheetName: string, values: (string | number)[][]) {
  await sheetsRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000?valueInputOption=USER_ENTERED`,
    'PUT',
    { values }
  )
}

export async function exportProjectsToSheet(projects: Project[]): Promise<string> {
  const year = new Date().getFullYear()
  const spreadsheetId = await findOrCreateSpreadsheet(`RevTech PRO — Dados ${year}`)

  const rows: (string | number)[][] = [
    ['Ticket', 'Equipamento', 'Marca', 'Modelo', 'Estado', 'Compra £', 'Peças £', 'Envio E £', 'Envio S £', 'Venda £', 'Lucro £', 'ROI %', 'Recebido', 'Vendido'],
    ...projects.map(p => {
      const { profit, roi } = calcROI(p)
      return [
        p.ticket_number ?? '', p.equipment, p.brand ?? '', p.model ?? '', p.status,
        p.purchase_price ?? 0, p.parts_cost ?? 0, p.shipping_in ?? 0, p.shipping_out ?? 0,
        p.sale_price ?? '', profit.toFixed(2), roi.toFixed(1),
        p.received_at?.split('T')[0] ?? '', p.sold_at?.split('T')[0] ?? '',
      ]
    }),
  ]

  await updateSheet(spreadsheetId, 'Projectos', rows)
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
}

export async function exportInventoryToSheet(inventory: InventoryItem[]): Promise<string> {
  const year = new Date().getFullYear()
  const spreadsheetId = await findOrCreateSpreadsheet(`RevTech PRO — Dados ${year}`)

  const rows: (string | number)[][] = [
    ['Item', 'Categoria', 'Quantidade', 'Mínimo', 'Custo Unit £', 'Localização', 'Fornecedor', 'Calibração'],
    ...inventory.map(i => [
      i.item_name, i.category, i.quantity, i.min_stock, i.unit_cost ?? 0,
      i.location ?? '', i.supplier ?? '', i.calibration_date ?? '',
    ]),
  ]

  await updateSheet(spreadsheetId, 'Inventário', rows)
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
}

export async function exportOrdersToSheet(orders: PartsOrder[]): Promise<string> {
  const year = new Date().getFullYear()
  const spreadsheetId = await findOrCreateSpreadsheet(`RevTech PRO — Dados ${year}`)

  const rows: (string | number)[][] = [
    ['Fornecedor', 'Peça', 'Qtd', 'Custo Unit £', 'Total £', 'Estado', 'Encomendado', 'Esperado', 'Entregue', 'Tracking'],
    ...orders.map(o => [
      o.supplier, o.part_name, o.quantity, o.unit_cost ?? '', o.total_cost ?? '',
      o.status, o.ordered_at ?? '', o.expected_at ?? '', o.delivered_at ?? '', o.tracking_number ?? '',
    ]),
  ]

  await updateSheet(spreadsheetId, 'Encomendas', rows)
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
}
