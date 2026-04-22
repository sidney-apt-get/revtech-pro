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
  received_at: string
  sold_at: string | null
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}
