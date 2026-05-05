import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Category, type CategoryField, type ItemFieldValue, type ItemHistory, type Lot } from '@/lib/supabase'

// ── Categories ──────────────────────────────────────────────

async function fetchCategories(context?: 'project' | 'inventory' | 'both'): Promise<Category[]> {
  let q = supabase.from('categories').select('*').order('sort_order')
  if (context) {
    q = q.or(`context.eq.${context},context.eq.both`)
  }
  const { data, error } = await q
  if (error) throw error
  return data
}

async function fetchCategoryFields(slug: string): Promise<CategoryField[]> {
  const { data, error } = await supabase
    .from('category_fields')
    .select('*')
    .eq('category_slug', slug)
    .order('sort_order')
  if (error) throw error
  return data
}

export function useCategories(context?: 'project' | 'inventory' | 'both') {
  return useQuery({
    queryKey: ['categories', context ?? 'all'],
    queryFn: () => fetchCategories(context),
    staleTime: 10 * 60 * 1000,
  })
}

export function useCategoryFields(slug: string | null | undefined) {
  return useQuery({
    queryKey: ['category_fields', slug],
    queryFn: () => fetchCategoryFields(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  })
}

// ── Field Values ─────────────────────────────────────────────

async function fetchFieldValues(itemId: string, itemType: string): Promise<ItemFieldValue[]> {
  const { data, error } = await supabase
    .from('item_field_values')
    .select('*')
    .eq('item_id', itemId)
    .eq('item_type', itemType)
  if (error) throw error
  return data
}

async function upsertFieldValue(payload: {
  item_id: string
  item_type: 'project' | 'inventory'
  field_key: string
  value: string | null
}): Promise<void> {
  const { error } = await supabase
    .from('item_field_values')
    .upsert(payload, { onConflict: 'item_id,item_type,field_key' })
  if (error) throw error
}

async function saveAllFieldValues(
  itemId: string,
  itemType: 'project' | 'inventory',
  values: Record<string, string>
): Promise<void> {
  const rows = Object.entries(values).map(([field_key, value]) => ({
    item_id: itemId,
    item_type: itemType,
    field_key,
    value: value || null,
  }))
  if (rows.length === 0) return
  const { error } = await supabase
    .from('item_field_values')
    .upsert(rows, { onConflict: 'item_id,item_type,field_key' })
  if (error) throw error
}

export function useItemFieldValues(itemId: string | undefined, itemType: 'project' | 'inventory') {
  return useQuery({
    queryKey: ['item_field_values', itemId, itemType],
    queryFn: () => fetchFieldValues(itemId!, itemType),
    enabled: !!itemId,
  })
}

export function useUpsertFieldValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: upsertFieldValue,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item_field_values', vars.item_id] })
    },
  })
}

export function useSaveAllFieldValues() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, itemType, values }: { itemId: string; itemType: 'project' | 'inventory'; values: Record<string, string> }) =>
      saveAllFieldValues(itemId, itemType, values),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item_field_values', vars.itemId] })
    },
  })
}

// ── Item History ──────────────────────────────────────────────

async function fetchHistory(itemId: string, itemType: string): Promise<ItemHistory[]> {
  const { data, error } = await supabase
    .from('item_history')
    .select('*')
    .eq('item_id', itemId)
    .eq('item_type', itemType)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function addHistoryEvent(payload: {
  item_id: string
  item_type: 'project' | 'inventory' | 'expense' | 'lot'
  event_type: string
  event_data?: Record<string, unknown>
  notes?: string
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('item_history').insert({
    ...payload,
    event_data: payload.event_data ?? {},
    user_id: user?.id ?? null,
  })
  if (error) throw error
}

export function useItemHistory(itemId: string | undefined, itemType: 'project' | 'inventory' | 'expense' | 'lot') {
  return useQuery({
    queryKey: ['item_history', itemId, itemType],
    queryFn: () => fetchHistory(itemId!, itemType),
    enabled: !!itemId,
  })
}

export function useAddHistoryEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addHistoryEvent,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item_history', vars.item_id] })
    },
  })
}

// ── Lots ──────────────────────────────────────────────────────

async function fetchLots(): Promise<Lot[]> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function createLot(payload: Omit<Lot, 'id' | 'user_id' | 'created_at'>): Promise<Lot> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('lots')
    .insert({ ...payload, user_id: user!.id })
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateLot({ id, ...payload }: Partial<Lot> & { id: string }): Promise<Lot> {
  const { data, error } = await supabase
    .from('lots')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteLot(id: string): Promise<void> {
  const { error } = await supabase.from('lots').delete().eq('id', id)
  if (error) throw error
}

export function useLots() {
  return useQuery({ queryKey: ['lots'], queryFn: fetchLots })
}

export function useCreateLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLot,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lots'] }),
  })
}

export function useUpdateLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateLot,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lots'] }),
  })
}

export function useDeleteLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteLot,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lots'] }),
  })
}

