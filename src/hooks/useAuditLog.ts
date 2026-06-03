import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type AuditActionType =
  | 'delete'
  | 'create'
  | 'edit'
  | 'status_change'
  | 'financial_edit'

export type AuditEntityType =
  | 'project'
  | 'inventory'
  | 'rma'
  | 'order'
  | 'expense'
  | 'contact'

export interface AuditEntry {
  id: string
  user_id: string | null
  user_email: string | null
  action_type: AuditActionType
  entity_type: AuditEntityType
  entity_id: string | null
  entity_name: string | null
  field_name: string | null
  old_value: string | null
  new_value: string | null
  notes: string | null
  created_at: string
}

export interface LogAuditPayload {
  action_type: AuditActionType
  entity_type: AuditEntityType
  entity_id?: string
  entity_name?: string
  field_name?: string
  old_value?: string
  new_value?: string
  notes?: string
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function logAudit(payload: LogAuditPayload): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('audit_log').insert({
    user_id: user.id,
    user_email: user.email ?? null,
    action_type: payload.action_type,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id ?? null,
    entity_name: payload.entity_name ?? null,
    field_name: payload.field_name ?? null,
    old_value: payload.old_value != null ? String(payload.old_value) : null,
    new_value: payload.new_value != null ? String(payload.new_value) : null,
    notes: payload.notes ?? null,
  })

  if (error) {
    // Non-blocking — audit failure should not break the main action
    console.warn('[AuditLog] Failed to log:', error.message)
  }
}

// ── Read (admin only) ──────────────────────────────────────────────────────────

export interface AuditLogFilters {
  entity_type?: AuditEntityType
  action_type?: AuditActionType
  user_email?: string
  from_date?: string
  to_date?: string
  limit?: number
}

async function fetchAuditLog(filters: AuditLogFilters): Promise<AuditEntry[]> {
  let q = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200)

  if (filters.entity_type) q = q.eq('entity_type', filters.entity_type)
  if (filters.action_type) q = q.eq('action_type', filters.action_type)
  if (filters.user_email)  q = q.ilike('user_email', `%${filters.user_email}%`)
  if (filters.from_date)   q = q.gte('created_at', filters.from_date)
  if (filters.to_date)     q = q.lte('created_at', filters.to_date + 'T23:59:59Z')

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as AuditEntry[]
}

export function useAuditLog(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['audit_log', filters],
    queryFn: () => fetchAuditLog(filters),
    staleTime: 30_000,
  })
}

export function useLogAudit() {
  return useMutation({ mutationFn: logAudit })
}
