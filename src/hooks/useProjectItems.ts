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

  // Sync parts_cost on the project
  if (item.unit_cost > 0) {
    const { data: proj } = await supabase
      .from('projects')
      .select('parts_cost')
      .eq('id', item.project_id)
      .single()
    await supabase
      .from('projects')
      .update({ parts_cost: ((proj?.parts_cost ?? 0) as number) + item.unit_cost * item.quantity })
      .eq('id', item.project_id)
  }

  return data
}

async function deleteProjectItem(id: string): Promise<void> {
  // Fetch item before deleting to reverse parts_cost
  const { data: item } = await supabase
    .from('project_items')
    .select('project_id, unit_cost, quantity')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('project_items').delete().eq('id', id)
  if (error) throw error

  // Reverse parts_cost on the project
  if (item && item.unit_cost > 0) {
    const { data: proj } = await supabase
      .from('projects')
      .select('parts_cost')
      .eq('id', item.project_id)
      .single()
    const newCost = Math.max(0, ((proj?.parts_cost ?? 0) as number) - item.unit_cost * item.quantity)
    await supabase
      .from('projects')
      .update({ parts_cost: newCost })
      .eq('id', item.project_id)
  }
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project_items', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useRemoveProjectItem(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProjectItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project_items', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
