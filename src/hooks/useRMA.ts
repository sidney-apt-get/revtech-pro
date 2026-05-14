import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type RmaItem, type RmaStatus, type RmaActivityEntry } from '@/lib/supabase'

const QK = ['rma'] as const

// Fetch
async function fetchRmaItems(): Promise<RmaItem[]> {
  const { data, error } = await supabase
    .from('rma_items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as RmaItem[]
}

// Create
type CreateRmaPayload = Omit<RmaItem, 'id' | 'user_id' | 'rma_number' | 'created_at' | 'updated_at' | 'activity_log'>

async function generateRmaNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('rma_items')
    .select('rma_number')
    .like('rma_number', `RMA-${year}-%`)
    .order('rma_number', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return `RMA-${year}-001`
  const last = parseInt(data[0].rma_number?.split('-')[2] ?? '0', 10)
  return `RMA-${year}-${String(last + 1).padStart(3, '0')}`
}

async function createRmaItem(payload: CreateRmaPayload): Promise<RmaItem> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const rma_number = await generateRmaNumber()

  const initialLog: RmaActivityEntry[] = [{
    ts: new Date().toISOString(),
    action: 'created',
    note: 'Item RMA criado',
  }]

  const { data, error } = await supabase
    .from('rma_items')
    .insert({ ...payload, user_id: user.id, rma_number, activity_log: initialLog })
    .select()
    .single()
  if (error) throw error
  return data as RmaItem
}

// Update
type UpdateRmaPayload = Partial<RmaItem> & { id: string; _note?: string }

async function updateRmaItem({ id, _note, ...payload }: UpdateRmaPayload): Promise<RmaItem> {
  if (payload.status || _note) {
    const { data: current } = await supabase
      .from('rma_items')
      .select('activity_log, status')
      .eq('id', id)
      .single()

    const prevLog: RmaActivityEntry[] = (current?.activity_log as RmaActivityEntry[]) ?? []
    const entry: RmaActivityEntry = {
      ts: new Date().toISOString(),
      action: payload.status ? `status:${payload.status}` : 'updated',
      note: _note,
    }
    payload.activity_log = [...prevLog, entry]
  }

  const { data, error } = await supabase
    .from('rma_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as RmaItem
}

// Delete
async function deleteRmaItem(id: string): Promise<void> {
  const { error } = await supabase.from('rma_items').delete().eq('id', id)
  if (error) throw error
}

// Hooks
export function useRmaItems() {
  return useQuery({ queryKey: QK, queryFn: fetchRmaItems })
}

export function useCreateRmaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRmaItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateRmaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateRmaItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteRmaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRmaItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

// Constants
export const RMA_STATUSES: RmaStatus[] = [
  'received',
  'triage',
  'pending_decision',
  'in_repair',
  'resolved',
  'cannibalized',
  'written_off',
]

export const RMA_STATUS_LABELS: Record<RmaStatus, string> = {
  received:         'Recebido',
  triage:           'Em Triage',
  pending_decision: 'Aguarda Decisao',
  in_repair:        'Em Reparacao',
  resolved:         'Resolvido',
  cannibalized:     'Canibalizado',
  written_off:      'Abatido',
}

export const RMA_STATUS_EMOJI: Record<RmaStatus, string> = {
  received:         'inbox',
  triage:           'search',
  pending_decision: 'clock',
  in_repair:        'wrench',
  resolved:         'check',
  cannibalized:     'scissors',
  written_off:      'trash',
}

export const RMA_STATUS_COLORS: Record<RmaStatus, string> = {
  received:         'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  triage:           'bg-amber-500/15 text-amber-400 border-amber-500/30',
  pending_decision: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  in_repair:        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  resolved:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cannibalized:     'bg-purple-500/15 text-purple-400 border-purple-500/30',
  written_off:      'bg-red-500/15 text-red-400 border-red-500/30',
}

export const DEFECT_CATEGORIES = [
  'Ecra',
  'Bateria',
  'Placa-mae',
  'Teclado',
  'Rato / Trackpad',
  'Camera',
  'Carcaca',
  'Porta de carregamento',
  'Altifalante / Microfone',
  'Software / Sistema',
  'Armazenamento',
  'RAM',
  'GPU',
  'Outro',
]

export const RMA_DESTINATIONS = [
  { value: 'repair',    label: 'Reparar e revender' },
  { value: 'resell',    label: 'Vender como esta' },
  { value: 'parts',     label: 'Canibalizar para pecas' },
  { value: 'write_off', label: 'Abater (write-off)' },
] as const
