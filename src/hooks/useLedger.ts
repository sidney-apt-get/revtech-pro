import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parseISO, isWithinInterval } from 'date-fns'

export type LedgerType = 'income' | 'cost' | 'expense'

export type LedgerEntry = {
  id: string
  project_id: string | null
  type: LedgerType
  amount: number
  description: string | null
  category: string
  date: string
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  venda_projeto: 'Venda de projecto',
  custo_projeto: 'Custo de projecto',
  venda_inventario: 'Venda de inventário',
  custo_inventario: 'Custo de inventário',
}

export function ledgerCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat
}

/**
 * Lê o ledger completo (tabela transactions).
 * Fonte única de verdade para receita e custo de mercadoria vendida (COGS).
 */
export function useLedger() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async (): Promise<LedgerEntry[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, project_id, type, amount, description, category, date, created_at')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as LedgerEntry[]
    },
    staleTime: 30_000,
  })
}

export type PeriodPnL = {
  revenue: number        // receita total (todas as vendas)
  cogs: number           // custo de mercadoria vendida (custos das vendas)
  grossProfit: number    // lucro bruto = receita - cogs
  revenueProjects: number
  revenueInventory: number
  cogsProjects: number
  cogsInventory: number
  count: number          // número de vendas (income)
}

/**
 * Calcula o P&L (receita, COGS, lucro bruto) de um intervalo a partir do ledger.
 * Não inclui despesas operacionais — essas vêm da tabela expenses e são
 * somadas ao nível da vista (para o lucro líquido).
 */
export function computePnL(entries: LedgerEntry[], start: Date, end: Date): PeriodPnL {
  const inPeriod = entries.filter(e =>
    isWithinInterval(parseISO(e.date), { start, end }))

  const sum = (cat: string, type: LedgerType) => inPeriod
    .filter(e => e.category === cat && e.type === type)
    .reduce((s, e) => s + Number(e.amount), 0)

  const revenueProjects = sum('venda_projeto', 'income')
  const revenueInventory = sum('venda_inventario', 'income')
  const cogsProjects = sum('custo_projeto', 'cost')
  const cogsInventory = sum('custo_inventario', 'cost')

  const revenue = revenueProjects + revenueInventory
  const cogs = cogsProjects + cogsInventory
  const count = inPeriod.filter(e => e.type === 'income').length

  return {
    revenue, cogs, grossProfit: revenue - cogs,
    revenueProjects, revenueInventory, cogsProjects, cogsInventory, count,
  }
}
