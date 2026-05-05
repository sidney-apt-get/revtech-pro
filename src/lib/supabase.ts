import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Project = {
  id: string
  user_id: string
  ticket_number: string | null
  equipment: string
  brand: string | null
  model: string | null
  serial_number: string | null
  defect_description: string
  diagnosis: string | null
  supplier_name: string | null
  buyer_name: string | null
  purchase_price: number
  parts_cost: number
  shipping_in: number
  shipping_out: number
  sale_price: number | null
  sale_platform: string | null
  status: ProjectStatus
  notes: string | null
  purchase_reference: string | null
  obs_recepcao: string | null
  obs_diagnostico: string | null
  obs_reparacao: string | null
  obs_conclusao: string | null
  imei: string | null
  imei2: string | null
  battery_capacity_original: number | null
  battery_capacity_current: number | null
  battery_health_percent: number | null
  battery_cycles: number | null
  device_color: string | null
  storage_gb: number | null
  ram_gb: number | null
  condition_grade: 'A' | 'B' | 'C' | 'D' | 'Para peças' | null
  received_at: string
  sold_at: string | null
  created_at: string
  updated_at: string
  lot_id?: string | null
}

export type Expense = {
  id: string
  user_id: string
  category: 'Ferramentas' | 'Consumíveis' | 'Envios' | 'Subscrições' | 'Electricidade' | 'Internet' | 'Outros'
  description: string
  amount: number
  date: string
  receipt_url: string | null
  is_recurring: boolean
  recurring_day: number | null
  created_at: string
}

export type FinancialGoal = {
  id: string
  user_id: string
  month: number
  year: number
  revenue_target: number
  profit_target: number
  expenses_budget: number
  created_at: string
}

export type ProjectPhase = 'recepcao' | 'diagnostico' | 'reparacao' | 'concluido' | 'entrega'

export type ProjectPhoto = {
  id: string
  project_id: string
  user_id: string
  phase: ProjectPhase
  photo_url: string
  caption: string | null
  created_at: string
}

export type ProjectStatus =
  | 'Recebido'
  | 'Em Diagnóstico'
  | 'Aguardando Peças'
  | 'Em Manutenção'
  | 'Pronto para Venda'
  | 'Vendido'
  | 'Cancelado'

export type InventoryItem = {
  id: string
  user_id: string
  item_name: string
  category: 'Peças' | 'Consumíveis' | 'Ferramentas' | 'Patrimônio'
  quantity: number
  min_stock: number
  unit_cost: number
  location: string | null
  supplier: string | null
  notes: string | null
  calibration_date: string | null
  next_maintenance: string | null
  created_at: string
  updated_at: string
  // Added by migration 014
  item_context?: 'new' | 'cannibalized' | 'lot'
  lot_id?: string | null
  source_project_id?: string | null
  cannibalization_reason?: string | null
  condition_tested?: boolean
  category_slug?: string | null
  ai_confidence?: number | null
  photos?: string[]
  // Added by migration 020
  entry_date?: string | null
  added_by?: string | null
  barcode?: string | null
  supplier_ref?: string | null
  source_order_id?: string | null
}

export type Contact = {
  id: string
  user_id: string
  name: string
  type: 'Fornecedor' | 'Cliente' | 'Parceiro' | 'Outro'
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string
  notes: string | null
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  project_id: string | null
  type: 'income' | 'expense'
  amount: number
  description: string | null
  category: string | null
  date: string
  created_at: string
}

export type ChecklistItem = {
  id: string
  label: string
  checked: boolean
}

export type Checklist = {
  id: string
  project_id: string
  type: 'reception' | 'delivery'
  items: ChecklistItem[]
  photos: string[]
  completed_at: string | null
  created_at: string
}

export type DefectEntry = {
  id: string
  user_id: string
  equipment_type: string
  brand: string | null
  model: string | null
  common_defect: string
  likely_cause: string | null
  required_parts: string[]
  avg_repair_time_hours: number | null
  avg_parts_cost: number | null
  difficulty: 'Fácil' | 'Médio' | 'Difícil' | null
  success_rate: number | null
  notes: string | null
  auto_created: boolean | null
  source_project_id: string | null
  created_at: string
}

export type PartsOrder = {
  id: string
  user_id: string
  project_id: string | null
  supplier: string
  part_name: string
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  order_number: string | null
  order_url: string | null
  status: 'Encomendado' | 'Em Trânsito' | 'Entregue' | 'Cancelado'
  ordered_at: string
  expected_at: string | null
  delivered_at: string | null
  tracking_number: string | null
  notes: string | null
  created_at: string
}

export type AppSettings = {
  id: string
  user_id: string
  company_name: string
  company_subtitle: string
  company_location: string
  logo_url: string | null
  primary_color: string
  accent_color: string
  currency: string
  currency_symbol: string
  vat_rate: number
  ticket_prefix: string
  telegram_enabled?: boolean
  created_at: string
  updated_at: string
}

export type TimeEntry = {
  id: string
  user_id: string
  project_id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

export type Category = {
  id: string
  slug: string
  parent_slug: string | null
  name_pt: string
  name_en: string
  icon: string | null
  context: 'project' | 'inventory' | 'both' | null
  sort_order: number
}

export type CategoryField = {
  id: string
  category_slug: string
  field_key: string
  label_pt: string
  label_en: string
  field_type: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'range' | 'multiselect' | 'textarea'
  options_pt: string[] | null
  options_en: string[] | null
  unit: string | null
  is_required: boolean
  sort_order: number
}

export type ItemFieldValue = {
  id: string
  item_id: string
  item_type: 'project' | 'inventory'
  field_key: string
  value: string | null
  created_at: string
  updated_at: string
}

export type ItemHistory = {
  id: string
  item_id: string
  item_type: 'project' | 'inventory' | 'expense' | 'lot'
  event_type: string
  event_data: Record<string, unknown>
  notes: string | null
  user_id: string | null
  created_at: string
}

export type Lot = {
  id: string
  user_id: string
  lot_number: string | null
  supplier: string | null
  purchase_price: number
  purchase_date: string
  description: string | null
  estimated_items: number | null
  status: 'untriaged' | 'in_progress' | 'completed'
  notes: string | null
  created_at: string
}

export type CameraSession = {
  id: string
  user_id: string
  session_token: string
  context: 'project' | 'inventory'
  item_id: string | null
  status: 'waiting' | 'photo_taken' | 'processed' | 'expired'
  photo_url: string | null
  ai_result: Record<string, unknown> | null
  expires_at: string
  created_at: string
  // Added by migration 016
  paired: boolean
  device_name: string | null
  last_active: string | null
  session_type: 'single' | 'paired'
  barcode: string | null
}

export type Warranty = {
  id: string
  user_id: string
  project_id: string
  warranty_months: number
  starts_at: string
  expires_at: string
  terms: string | null
  status: 'active' | 'expired' | 'claimed'
  claim_description: string | null
  claimed_at: string | null
  created_at: string
}

export type ScannerSession = {
  id: string
  token: string
  user_id: string | null
  status: 'waiting' | 'paired' | 'scanning' | 'result'
  result_type: 'barcode' | 'photo' | 'cancelled' | null
  result_value: string | null
  ai_result: Record<string, unknown> | null
  paired_at: string | null
  expires_at: string
  created_at: string
}
