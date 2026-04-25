import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TimeEntry } from '@/lib/supabase'

export function useTimeEntries(projectId?: string) {
  return useQuery({
    queryKey: ['time_entries', projectId],
    queryFn: async () => {
      let q = supabase.from('time_entries').select('*').order('started_at', { ascending: false })
      if (projectId) q = q.eq('project_id', projectId)
      const { data, error } = await q
      if (error) throw error
      return data as TimeEntry[]
    },
    enabled: true,
  })
}

export function useAllTimeEntries() {
  return useQuery({
    queryKey: ['time_entries_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as TimeEntry[]
    },
  })
}

export function useStartTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      // Stop any active timer first
      const { data: active } = await supabase
        .from('time_entries')
        .select('id, started_at')
        .is('ended_at', null)
        .eq('user_id', userId)
        .single()

      if (active) {
        const duration = Math.round((Date.now() - new Date(active.started_at).getTime()) / 60000)
        await supabase.from('time_entries').update({
          ended_at: new Date().toISOString(),
          duration_minutes: duration,
        }).eq('id', active.id)
      }

      const { data, error } = await supabase.from('time_entries').insert({
        project_id: projectId,
        user_id: userId,
        started_at: new Date().toISOString(),
      }).select().single()

      if (error) throw error
      return data as TimeEntry
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_entries'] }),
  })
}

export function useStopTimer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ entryId, startedAt }: { entryId: string; startedAt: string }) => {
      const duration = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
      const { data, error } = await supabase.from('time_entries').update({
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
      }).eq('id', entryId).select().single()
      if (error) throw error
      return data as TimeEntry
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_entries'] }),
  })
}
