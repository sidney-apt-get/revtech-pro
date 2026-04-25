import type { Project } from './supabase'

const XERO_CLIENT_ID = import.meta.env.VITE_XERO_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/auth/xero/callback`

export interface XeroTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  tenant_id: string
}

export function getXeroTokens(): XeroTokens | null {
  const raw = localStorage.getItem('xero_tokens')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setXeroTokens(tokens: XeroTokens) {
  localStorage.setItem('xero_tokens', JSON.stringify(tokens))
}

export function clearXeroTokens() {
  localStorage.removeItem('xero_tokens')
}

export function isXeroConnected(): boolean {
  const t = getXeroTokens()
  return !!t && Date.now() < t.expires_at
}

export function initiateXeroAuth() {
  if (!XERO_CLIENT_ID) {
    alert('Configure VITE_XERO_CLIENT_ID no .env.local para usar a integração Xero.')
    return
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XERO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email accounting.transactions accounting.contacts',
    state: crypto.randomUUID(),
  })
  window.location.href = `https://login.xero.com/identity/connect/authorize?${params}`
}

export async function exportSaleToXero(project: Project): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const tokens = getXeroTokens()
  if (!tokens) throw new Error('Xero não está ligado. Faz login primeiro.')

  const lineItems = [{
    Description: `${project.equipment}${project.brand ? ` — ${project.brand}` : ''}${project.model ? ` ${project.model}` : ''}`,
    Quantity: 1,
    UnitAmount: project.sale_price ?? 0,
    AccountCode: '200',
    TaxType: 'OUTPUT2',
  }]

  const invoice = {
    Type: 'ACCREC',
    Contact: { Name: project.buyer_name || 'Cliente Avulso' },
    LineItems: lineItems,
    Date: project.sold_at ? project.sold_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    DueDate: project.sold_at ? project.sold_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    Reference: project.ticket_number ?? project.id.slice(0, 8),
    Status: 'AUTHORISED',
  }

  const res = await fetch(`https://api.xero.com/api.xro/2.0/Invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'xero-tenant-id': tokens.tenant_id,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Invoices: [invoice] }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Xero API error: ${res.status} — ${err}`)
  }

  const data = await res.json()
  const created = data.Invoices?.[0]
  return { invoiceId: created.InvoiceID, invoiceNumber: created.InvoiceNumber }
}

export async function exportExpenseToXero(project: Project): Promise<{ purchaseId: string }> {
  const tokens = getXeroTokens()
  if (!tokens) throw new Error('Xero não está ligado.')

  const total = (project.purchase_price || 0) + (project.parts_cost || 0) + (project.shipping_in || 0)

  const bill = {
    Type: 'ACCPAY',
    Contact: { Name: project.supplier_name || 'Fornecedor' },
    LineItems: [{
      Description: `Compra: ${project.equipment}`,
      Quantity: 1,
      UnitAmount: total,
      AccountCode: '310',
      TaxType: 'INPUT2',
    }],
    Date: project.received_at.slice(0, 10),
    Reference: project.ticket_number ?? project.id.slice(0, 8),
    Status: 'AUTHORISED',
  }

  const res = await fetch(`https://api.xero.com/api.xro/2.0/Invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'xero-tenant-id': tokens.tenant_id,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Invoices: [bill] }),
  })

  if (!res.ok) throw new Error(`Xero API error: ${res.status}`)
  const data = await res.json()
  return { purchaseId: data.Invoices?.[0]?.InvoiceID }
}

export async function syncMonthlyReport(month: number, year: number, projects: Project[]): Promise<number> {
  const sold = projects.filter(p => {
    if (p.status !== 'Vendido' || !p.sold_at) return false
    const d = new Date(p.sold_at)
    return d.getMonth() === month && d.getFullYear() === year
  })

  let count = 0
  for (const p of sold) {
    try {
      await exportSaleToXero(p)
      count++
    } catch {
      // skip individual failures
    }
  }
  return count
}
