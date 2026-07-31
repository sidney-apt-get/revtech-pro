import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Expense, type FinancialGoal } from '@/lib/supabase'

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as Expense[]
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('expenses').insert({ ...payload, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Expense> & { id: string }) => {
      const { error } = await supabase.from('expenses').update(payload).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useFinancialGoals() {
  return useQuery({
    queryKey: ['financial-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_goals').select('*')
      if (error) throw error
      return (data ?? []) as FinancialGoal[]
    },
  })
}

export function useUpsertGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { month: number; year: number; revenue_target: number; profit_target: number; expenses_budget: number }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('financial_goals')
        .upsert({ ...payload, user_id: user!.id }, { onConflict: 'user_id,month,year' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial-goals'] }),
  })
}
