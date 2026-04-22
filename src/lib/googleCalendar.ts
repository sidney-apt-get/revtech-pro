import { supabase } from './supabase'
import { type Project } from './supabase'
import { type InventoryItem } from './supabase'

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return (data.session?.provider_token) ?? null
}

async function calendarRequest(path: string, method: string, body?: object) {
  const token = await getAccessToken()
  if (!token) throw new Error('Google access token não disponível. Faz login com Google.')
  const calendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID ?? 'primary'
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}${path}`
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? 'Erro Google Calendar')
  }
  return res.json()
}

export async function createPartsArrivalEvent(project: Project, expectedDate: string): Promise<void> {
  const title = `Peças chegam — ${project.equipment}${project.ticket_number ? ` (${project.ticket_number})` : ''}`
  await calendarRequest('/events', 'POST', {
    summary: title,
    description: `Projecto: ${project.equipment}\nDefeito: ${project.defect_description}\nTicket: ${project.ticket_number ?? '—'}`,
    start: { date: expectedDate },
    end: { date: expectedDate },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
  })
}

export async function createMaintenanceReminderEvent(item: InventoryItem): Promise<void> {
  if (!item.calibration_date) return
  const calibDate = new Date(item.calibration_date)
  const reminderDate = new Date(calibDate)
  reminderDate.setDate(reminderDate.getDate() - 30)
  const dateStr = reminderDate.toISOString().split('T')[0]
  await calendarRequest('/events', 'POST', {
    summary: `Calibração necessária — ${item.item_name}`,
    description: `Ferramenta: ${item.item_name}\nData de calibração: ${calibDate.toLocaleDateString('pt-PT')}`,
    start: { date: dateStr },
    end: { date: dateStr },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 * 24 }] },
  })
}
