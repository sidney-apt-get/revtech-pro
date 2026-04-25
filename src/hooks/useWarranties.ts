import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Warranty } from '@/lib/supabase'
import { addMonths, format } from 'date-fns'

export function useWarranties() {
  return useQuery({
    queryKey: ['warranties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .order('expires_at', { ascending: true })
      if (error) throw error
      return data as Warranty[]
    },
  })
}

export function useWarrantyByProject(projectId: string) {
  return useQuery({
    queryKey: ['warranty', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('project_id', projectId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data as Warranty | null
    },
  })
}

export function useCreateWarranty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      projectId, userId, months, terms,
    }: { projectId: string; userId: string; months: number; terms?: string }) => {
      const startsAt = new Date()
      const expiresAt = addMonths(startsAt, months)
      const { data, error } = await supabase.from('warranties').insert({
        project_id: projectId,
        user_id: userId,
        warranty_months: months,
        starts_at: format(startsAt, 'yyyy-MM-dd'),
        expires_at: format(expiresAt, 'yyyy-MM-dd'),
        terms: terms || null,
        status: 'active',
      }).select().single()
      if (error) throw error
      return data as Warranty
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranties'] }),
  })
}

export function useClaimWarranty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { data, error } = await supabase.from('warranties').update({
        status: 'claimed',
        claim_description: description,
        claimed_at: new Date().toISOString(),
      }).eq('id', id).select().single()
      if (error) throw error
      return data as Warranty
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranties'] }),
  })
}

export function useExpireWarranties() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { error } = await supabase.from('warranties')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('expires_at', today)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranties'] }),
  })
}
