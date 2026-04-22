import { useMemo } from 'react'
import { useProjects } from './useProjects'
import { useInventory } from './useInventory'
import { calcROI } from '@/lib/utils'
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

export function useDashboard() {
  const { data: projects = [] } = useProjects()
  const { data: inventory = [] } = useInventory()

  return useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const soldThisMonth = projects.filter(p =>
      p.status === 'Vendido' &&
      p.sold_at &&
      isWithinInterval(new Date(p.sold_at), { start: monthStart, end: monthEnd })
    )

    const receivedThisMonth = projects.filter(p =>
      isWithinInterval(new Date(p.received_at), { start: monthStart, end: monthEnd })
    )

    const totalInvested = receivedThisMonth.reduce((sum, p) =>
      sum + (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0), 0)

    const totalRevenue = soldThisMonth.reduce((sum, p) => sum + (p.sale_price || 0), 0)

    const totalCostSold = soldThisMonth.reduce((sum, p) =>
      sum + (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0) + (p.shipping_out || 0), 0)

    const netProfit = totalRevenue - totalCostSold

    const activeProjects = projects.filter(p =>
      !['Vendido', 'Cancelado'].includes(p.status)
    )

    const readyToSell = projects.filter(p => p.status === 'Pronto para Venda')

    const lowStock = inventory.filter(i => i.quantity < i.min_stock)

    const byStatus = [
      'Recebido', 'Em Diagnóstico', 'Aguardando Peças',
      'Em Manutenção', 'Pronto para Venda', 'Vendido', 'Cancelado',
    ].map(status => ({
      status,
      count: projects.filter(p => p.status === status).length,
    }))

    const recentProjects = [...projects].slice(0, 5)

    return {
      totalInvested,
      totalRevenue,
      netProfit,
      activeCount: activeProjects.length,
      readyToSell: readyToSell.map(p => ({ ...p, ...calcROI(p) })),
      lowStock,
      byStatus,
      recentProjects,
    }
  }, [projects, inventory])
}
