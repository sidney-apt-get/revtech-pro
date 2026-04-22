import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type InventoryItem } from '@/lib/supabase'

async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('item_name')
  if (error) throw error
  return data
}

async function createItem(item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('inventory').insert({ ...item, user_id: user!.id }).select().single()
  if (error) throw error
  return data
}

async function updateItem({ id, ...item }: Partial<InventoryItem> & { id: string }) {
  const { data, error } = await supabase.from('inventory').update(item).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteItem(id: string) {
  const { error } = await supabase.from('inventory').delete().eq('id', id)
  if (error) throw error
}

export function useInventory() {
  return useQuery({ queryKey: ['inventory'], queryFn: fetchInventory })
}

export function useCreateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useLowStockCount() {
  const { data } = useInventory()
  return data?.filter(i => i.quantity < i.min_stock).length ?? 0
}
