import { supabase, type Project } from './supabase'

/**
 * ── LEDGER (Livro de Transações) ──────────────────────────────────────────────
 * A tabela `transactions` é a fonte única de verdade financeira.
 *
 * Categorias:
 *   venda_projeto    (income) — receita da venda de um projecto reparado
 *   custo_projeto    (cost)   — custo total do projecto (compra + peças + fretes)
 *   venda_inventario (income) — receita da venda de item de inventário
 *   custo_inventario (cost)   — custo da mercadoria vendida do inventário
 *
 * Despesas operacionais (electricidade, subscrições, etc.) ficam na tabela
 * `expenses` — são recorrentes/manuais e não representam custo de mercadoria.
 *
 * Regra de ouro: cada venda gera SEMPRE um par receita+custo, para que o lucro
 * seja correcto e o ledger esteja balanceado.
 */

export const LEDGER_CATEGORIES = {
  projectSale: 'venda_projeto',
  projectCost: 'custo_projeto',
  inventorySale: 'venda_inventario',
  inventoryCost: 'custo_inventario',
} as const

/**
 * Sincroniza as transações de venda de um projecto com o seu estado actual.
 * - Se o projecto está 'Vendido' com preço → cria/actualiza receita + custo.
 * - Caso contrário (voltou atrás, cancelado) → remove as transações do projecto.
 * Idempotente: apaga sempre as transações antigas do projecto antes de recriar.
 */
export async function syncProjectSaleTransactions(project: Project): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Remove quaisquer transações existentes deste projecto (idempotência)
  await supabase
    .from('transactions')
    .delete()
    .eq('project_id', project.id)
    .in('category', [LEDGER_CATEGORIES.projectSale, LEDGER_CATEGORIES.projectCost])

  // Só regista se está vendido com preço
  if (project.status !== 'Vendido' || project.sale_price == null || project.sale_price <= 0) {
    return
  }

  const cost = (project.purchase_price || 0) + (project.parts_cost || 0) +
               (project.shipping_in || 0) + (project.shipping_out || 0)
  const saleDate = project.sold_at
    ? new Date(project.sold_at).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]
  const label = [project.ticket_number, project.equipment].filter(Boolean).join(' — ')

  const rows = [
    {
      user_id: user.id,
      project_id: project.id,
      type: 'income',
      amount: project.sale_price,
      description: `Venda: ${label}`,
      category: LEDGER_CATEGORIES.projectSale,
      date: saleDate,
    },
  ]
  if (cost > 0) {
    rows.push({
      user_id: user.id,
      project_id: project.id,
      type: 'cost',
      amount: cost,
      description: `Custo: ${label}`,
      category: LEDGER_CATEGORIES.projectCost,
      date: saleDate,
    })
  }

  await supabase.from('transactions').insert(rows)
}

/**
 * Remove todas as transações associadas a um projecto (usado ao eliminar).
 */
export async function removeProjectTransactions(projectId: string): Promise<void> {
  await supabase
    .from('transactions')
    .delete()
    .eq('project_id', projectId)
    .in('category', [LEDGER_CATEGORIES.projectSale, LEDGER_CATEGORIES.projectCost])
}
