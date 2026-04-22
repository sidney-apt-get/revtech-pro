import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type PartsOrder } from '@/lib/supabase'

async function fetchOrders(): Promise<PartsOrder[]> {
  const { data, error } = await supabase
    .from('parts_orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function createOrder(o: Omit<PartsOrder, 'id' | 'user_id' | 'created_at'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('parts_orders').insert({ ...o, user_id: user!.id }).select().single()
  if (error) throw error
  return data
}

async function updateOrder({ id, ...o }: Partial<PartsOrder> & { id: string }) {
  const { data, error } = await supabase.from('parts_orders').update(o).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteOrder(id: string) {
  const { error } = await supabase.from('parts_orders').delete().eq('id', id)
  if (error) throw error
}

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createOrder, onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) })
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: updateOrder, onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteOrder, onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) })
}

export function useInTransitCount() {
  const { data: orders = [] } = useOrders()
  return orders.filter(o => o.status === 'Em Trânsito' || o.status === 'Encomendado').length
}
