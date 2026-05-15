import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ProjectItemType = 'used' | 'cannibalized' | 'harvested'

export type ProjectItem = {
  id: string
  user_id: string
  project_id: string
  inventory_item_id: string | null
  item_name: string
  item_category: string | null
  item_type: ProjectItemType
  quantity: number
  unit_cost: number
  notes: string | null
  created_at: string
}

export type CreateProjectItem = {
  project_id: string
  inventory_item_id?: string | null
  item_name: string
  item_category?: string | null
  item_type: ProjectItemType
  quantity: number
  unit_cost: number
  notes?: string | null
}

async function fetchProjectItems(projectId: string): Promise<ProjectItem[]> {
  const { data, error } = await supabase
    .from('project_items')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

async function createProjectItem(item: CreateProjectItem): Promise<ProjectItem> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('project_items')
    .insert({ ...item, user_id: user!.id })
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteProjectItem(id: string): Promise<void> {
  const { error } = await supabase.from('project_items').delete().eq('id', id)
  if (error) throw error
}

export function useProjectItems(projectId: string) {
  return useQuery({
    queryKey: ['project_items', projectId],
    queryFn: () => fetchProjectItems(projectId),
    enabled: !!projectId,
  })
}

export function useAddProjectItem(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProjectItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project_items', projectId] }),
  })
}

export function useRemoveProjectItem(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProjectItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project_items', projectId] }),
  })
}
