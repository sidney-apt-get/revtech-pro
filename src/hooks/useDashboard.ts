import { useMemo } from 'react'
import { useProjects } from './useProjects'
import { useInventory } from './useInventory'
import { calcROI } from '@/lib/utils'
import { startOfMonth, endOfMonth, isWithinInterval, differenceInDays, subMonths, startOfWeek, endOfWeek } from 'date-fns'

export function useDashboard() {
  const { data: projects = [] } = useProjects()
  const { data: inventory = [] } = useInventory()

  return useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // ── Financial KPIs ──────────────────────────────────────────────
    const soldThisMonth = projects.filter(p =>
      p.status === 'Vendido' && p.sold_at &&
      isWithinInterval(new Date(p.sold_at), { start: monthStart, end: monthEnd })
    )
    const receivedThisMonth = projects.filter(p =>
      isWithinInterval(new Date(p.received_at), { start: monthStart, end: monthEnd })
    )

    const totalInvested = receivedThisMonth.reduce((s, p) =>
      s + (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0), 0)
    const totalRevenue = soldThisMonth.reduce((s, p) => s + (p.sale_price || 0), 0)
    const totalCostSold = soldThisMonth.reduce((s, p) =>
      s + (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0) + (p.shipping_out || 0), 0)
    const netProfit = totalRevenue - totalCostSold

    const margins = soldThisMonth
      .filter(p => p.sale_price && p.sale_price > 0)
      .map(p => {
        const cost = (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0) + (p.shipping_out || 0)
        return ((p.sale_price! - cost) / p.sale_price!) * 100
      })
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0

    // ── Operational KPIs ─────────────────────────────────────────────
    const activeProjects = projects.filter(p => !['Vendido', 'Cancelado'].includes(p.status))
    const readyToSell = projects.filter(p => p.status === 'Pronto para Venda')

    const repairTimes = projects
      .filter(p => p.status === 'Vendido' && p.sold_at)
      .map(p => differenceInDays(new Date(p.sold_at!), new Date(p.received_at)))
      .filter(d => d >= 0)
    const avgRepairDays = repairTimes.length > 0
      ? Math.round(repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length)
      : 0

    const totalFinished = projects.filter(p => ['Vendido', 'Cancelado'].includes(p.status)).length
    const totalSold = projects.filter(p => p.status === 'Vendido').length
    const successRate = totalFinished > 0 ? Math.round((totalSold / totalFinished) * 100) : 0

    const stockValue = readyToSell.reduce((s, p) => s + (p.purchase_price || 0) + (p.parts_cost || 0), 0)

    // ── Pipeline (count + value by status) ───────────────────────────
    const STATUSES = ['Recebido', 'Em Diagnóstico', 'Aguardando Peças', 'Em Manutenção', 'Pronto para Venda', 'Vendido', 'Cancelado']
    const byStatus = STATUSES.map(status => ({
      status,
      count: projects.filter(p => p.status === status).length,
      value: projects.filter(p => p.status === status).reduce((s, p) => s + (p.purchase_price || 0) + (p.parts_cost || 0), 0),
    }))

    // ── Overdue (same status > 14 days) ──────────────────────────────
    const overdue = projects
      .filter(p => !['Vendido', 'Cancelado'].includes(p.status))
      .filter(p => differenceInDays(now, new Date(p.updated_at ?? p.received_at)) > 14)
      .sort((a, b) => new Date(a.updated_at ?? a.received_at).getTime() - new Date(b.updated_at ?? b.received_at).getTime())

    // ── Recent activity (last 5 changes) ─────────────────────────────
    const recentActivity = [...projects]
      .sort((a, b) => new Date(b.updated_at ?? b.received_at).getTime() - new Date(a.updated_at ?? a.received_at).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        equipment: p.equipment,
        status: p.status,
        date: p.updated_at ?? p.received_at,
        ticket: p.ticket_number,
      }))

    // ── Monthly profit chart (last 6 months) ─────────────────────────
    const monthlyProfit = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      const s = startOfMonth(m)
      const e = endOfMonth(m)
      const sold = projects.filter(p => p.status === 'Vendido' && p.sold_at && isWithinInterval(new Date(p.sold_at), { start: s, end: e }))
      const rev = sold.reduce((a, p) => a + (p.sale_price || 0), 0)
      const cost = sold.reduce((a, p) => a + (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0) + (p.shipping_out || 0), 0)
      return { monthDate: m, revenue: rev, profit: rev - cost, count: sold.length }
    })

    // ── Weekly projects created vs sold (last 8 weeks) ────────────────
    const weeklyFlow = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (7 - i) * 7)
      const s = startOfWeek(d, { weekStartsOn: 1 })
      const e = endOfWeek(d, { weekStartsOn: 1 })
      const created = projects.filter(p => isWithinInterval(new Date(p.received_at), { start: s, end: e })).length
      const sold = projects.filter(p => p.status === 'Vendido' && p.sold_at && isWithinInterval(new Date(p.sold_at), { start: s, end: e })).length
      return { weekStart: s, created, sold }
    })

    const lowStock = inventory.filter(i => i.quantity < i.min_stock)
    const recentProjects = [...projects]
      .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
      .slice(0, 5)

    return {
      // financial
      totalInvested,
      totalRevenue,
      netProfit,
      avgMargin,
      // operational
      activeCount: activeProjects.length,
      avgRepairDays,
      successRate,
      stockValue,
      // pipeline
      byStatus,
      // lists
      readyToSell: readyToSell.map(p => ({ ...p, ...calcROI(p) })),
      overdue,
      recentActivity,
      lowStock,
      recentProjects,
      // charts
      monthlyProfit,
      weeklyFlow,
    }
  }, [projects, inventory])
}
