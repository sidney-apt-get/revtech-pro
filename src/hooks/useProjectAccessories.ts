import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Acessórios / itens incluídos que ENTRARAM com o equipamento (teclado, rato, carregador, cabos).
 * Distinto de project_items (peças usadas na reparação).
 *
 * Destinos:
 *  - included      → vai junto na venda do equipamento (só documentado, sem custo/inventário)
 *  - sell_separate → sai para o inventário como item próprio + transfere allocated_cost do projeto
 *  - keep_stock    → vai para o inventário como peça de reserva + transfere allocated_cost do projeto
 *  - discard       → descartado, sem valor (só documentado)
 */
export type AccessoryDestination = 'included' | 'sell_separate' | 'keep_stock' | 'discard'

export const ACCESSORY_DESTINATIONS: { value: AccessoryDestination; label: string; desc: string; movesToInventory: boolean }[] = [
  { value: 'included',      label: 'Vai junto na venda',  desc: 'Vendido com o equipamento principal', movesToInventory: false },
  { value: 'sell_separate', label: 'Vender separado',     desc: 'Sai para o inventário com custo alocado, para vender à parte', movesToInventory: true },
  { value: 'keep_stock',    label: 'Guardar como stock',  desc: 'Vai para o inventário como peça de reserva', movesToInventory: true },
  { value: 'discard',       label: 'Descartar',           desc: 'Sem valor — só documentado', movesToInventory: false },
]

export type ProjectAccessory = {
  id: string
  user_id: string
  project_id: string
  name: string
  condition_note: string | null
  destination: AccessoryDestination
  allocated_cost: number
  inventory_item_id: string | null
  created_at: string
}

export type CreateAccessory = {
  project_id: string
  name: string
  condition_note?: string | null
  destination: AccessoryDestination
  allocated_cost?: number
}

async function fetchAccessories(projectId: string): Promise<ProjectAccessory[]> {
  const { data, error } = await supabase
    .from('project_accessories')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

function movesToInventory(dest: AccessoryDestination): boolean {
  return dest === 'sell_separate' || dest === 'keep_stock'
}

/**
 * Realoca custo entre o projecto principal e um acessório.
 * O acessório veio na COMPRA do kit, portanto o seu custo sai do purchase_price
 * do equipamento principal (a parte do preço pago que passa a ser desse acessório).
 * Assim o total mantém-se balanceado: (purchase_price - X) + X no inventário = kit original.
 * delta negativo = custo sai do projecto (acessório criado); positivo = devolve (acessório removido).
 */
async function transferProjectCost(projectId: string, delta: number): Promise<void> {
  if (delta === 0) return
  const { data: proj } = await supabase.from('projects').select('purchase_price').eq('id', projectId).single()
  const current = (proj?.purchase_price ?? 0) as number
  await supabase.from('projects').update({ purchase_price: Math.max(0, current + delta) }).eq('id', projectId)
}

export async function createAccessory(acc: CreateAccessory): Promise<ProjectAccessory> {
  const { data: { user } } = await supabase.auth.getUser()
  const cost = acc.allocated_cost ?? 0

  const { data: proj } = await supabase
    .from('projects')
    .select('ticket_number, equipment')
    .eq('id', acc.project_id)
    .single()

  let inventoryItemId: string | null = null

  // Destinos que movem para o inventário criam um item ligado
  if (movesToInventory(acc.destination)) {
    const originLabel = [proj?.ticket_number, proj?.equipment].filter(Boolean).join(' — ')
    const reason = acc.destination === 'sell_separate'
      ? `Acessório retirado para venda separada de: ${originLabel || 'projecto'}`
      : `Acessório guardado como stock de: ${originLabel || 'projecto'}`
    const { data: invItem, error: invError } = await supabase
      .from('inventory')
      .insert({
        user_id: user!.id,
        item_name: acc.name,
        category: 'Peças',
        quantity: 1,
        min_stock: 0,
        unit_cost: cost,
        item_context: 'cannibalized',
        source_project_id: acc.project_id,
        cannibalization_reason: reason,
        notes: acc.condition_note ?? null,
        entry_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()
    if (invError) throw invError
    inventoryItemId = invItem.id
    // Custo sai do projeto principal (foi alocado ao acessório)
    await transferProjectCost(acc.project_id, -cost)
  }

  const { data, error } = await supabase
    .from('project_accessories')
    .insert({
      user_id: user!.id,
      project_id: acc.project_id,
      name: acc.name,
      condition_note: acc.condition_note ?? null,
      destination: acc.destination,
      allocated_cost: movesToInventory(acc.destination) ? cost : 0,
      inventory_item_id: inventoryItemId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteAccessory(id: string): Promise<void> {
  const { data: acc } = await supabase
    .from('project_accessories')
    .select('project_id, destination, allocated_cost, inventory_item_id')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('project_accessories').delete().eq('id', id)
  if (error) throw error

  if (!acc) return
  // Reverter: apagar item de inventário ligado e devolver custo ao projeto
  if (movesToInventory(acc.destination) && acc.inventory_item_id) {
    await supabase.from('inventory').delete().eq('id', acc.inventory_item_id)
    await transferProjectCost(acc.project_id, acc.allocated_cost)
  }
}

export function useProjectAccessories(projectId: string) {
  return useQuery({
    queryKey: ['project_accessories', projectId],
    queryFn: () => fetchAccessories(projectId),
    enabled: !!projectId,
  })
}

export function useAddAccessory(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAccessory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project_accessories', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useRemoveAccessory(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAccessory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project_accessories', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
