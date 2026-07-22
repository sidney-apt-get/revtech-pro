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

/**
 * Contabilidade dos materiais:
 * - 'used' / 'cannibalized': peça ENTRA no projecto → parts_cost += custo
 * - 'harvested': peça SAI do projecto para venda separada → custo é TRANSFERIDO
 *   do projecto para o inventário (parts_cost -= custo) e é criado automaticamente
 *   um item de inventário ligado ao projecto de origem (source_project_id).
 *   parts_cost pode ficar negativo — representa recuperação de custo, e o
 *   custo total do projecto (compra + peças + frete) reflecte-o correctamente.
 */
async function createProjectItem(item: CreateProjectItem): Promise<ProjectItem> {
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch project once — needed for cost sync and (if harvested) the origin label
  const { data: proj } = await supabase
    .from('projects')
    .select('parts_cost, ticket_number, equipment')
    .eq('id', item.project_id)
    .single()

  let inventoryItemId: string | null = item.inventory_item_id ?? null

  // ── HARVESTED: create the linked inventory item FIRST so we can store its id
  if (item.item_type === 'harvested') {
    const originLabel = [proj?.ticket_number, proj?.equipment].filter(Boolean).join(' — ')
    const { data: invItem, error: invError } = await supabase
      .from('inventory')
      .insert({
        user_id: user!.id,
        item_name: item.item_name,
        category: 'Peças',
        quantity: item.quantity,
        min_stock: 0,
        unit_cost: item.unit_cost,
        item_context: 'cannibalized',
        source_project_id: item.project_id,
        cannibalization_reason: `Retirado para venda separada de: ${originLabel || 'projecto'}`,
        notes: item.notes ?? null,
        entry_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()
    if (invError) throw invError
    inventoryItemId = invItem.id
  }

  const { data, error } = await supabase
    .from('project_items')
    .insert({ ...item, inventory_item_id: inventoryItemId, user_id: user!.id })
    .select()
    .single()
  if (error) throw error

  // ── Cost sync on the project
  if (item.unit_cost > 0) {
    const delta = item.unit_cost * item.quantity
    const current = (proj?.parts_cost ?? 0) as number
    const newCost = item.item_type === 'harvested'
      ? current - delta   // cost transferred OUT to inventory
      : current + delta   // cost consumed INTO the project
    await supabase
      .from('projects')
      .update({ parts_cost: newCost })
      .eq('id', item.project_id)
  }

  return data
}

async function deleteProjectItem(id: string): Promise<void> {
  // Fetch item before deleting to reverse cost + clean up linked inventory
  const { data: item } = await supabase
    .from('project_items')
    .select('project_id, unit_cost, quantity, item_type, inventory_item_id')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('project_items').delete().eq('id', id)
  if (error) throw error

  if (!item) return

  // If it was harvested and auto-created an inventory item, remove that too
  if (item.item_type === 'harvested' && item.inventory_item_id) {
    await supabase.from('inventory').delete().eq('id', item.inventory_item_id)
  }

  // Reverse cost on the project
  if (item.unit_cost > 0) {
    const { data: proj } = await supabase
      .from('projects')
      .select('parts_cost')
      .eq('id', item.project_id)
      .single()
    const delta = item.unit_cost * item.quantity
    const current = (proj?.parts_cost ?? 0) as number
    const newCost = item.item_type === 'harvested'
      ? current + delta   // undo the transfer out
      : current - delta   // undo the consumption
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
      qc.invalidateQueries({ queryKey: ['inventory'] })
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
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
