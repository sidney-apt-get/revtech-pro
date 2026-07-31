import { useState, useMemo } from 'react'
import { useLocation } from 'wouter'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/hooks/useProjects'
import { useOrders } from '@/hooks/useOrders'
import { useExpenses } from '@/hooks/useFinances'
import { useLedger, computePnL } from '@/hooks/useLedger'
import { exportToCSV } from '@/lib/reports'
import { calcROI, fmtGBP } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { enGB, pt } from 'date-fns/locale'
import { FileDown, FileText, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { printReportPDF } from '@/lib/pdf'
import { useSettings } from '@/contexts/SettingsContext'

export function Reports() {
  const { t, i18n } = useTranslation()
  const [, navigate] = useLocation()
  const { settings } = useSettings()
  const { data: projects = [] } = useProjects()
  const { data: orders = [] } = useOrders()
  const { data: expenses = [] } = useExpenses()
  const { data: ledger = [] } = useLedger()
  const locale = i18n.language === 'pt' ? pt : enGB
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [reportType, setReportType] = useState<'monthly' | 'annual'>('monthly')

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const MONTHS = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => format(new Date(2024, m, 1), 'MMMM', { locale })),
    [locale]
  )

  const MONTHS_SHORT = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => format(new Date(2024, m, 1), 'MMM', { locale })),
    [locale]
  )

  const metrics = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1))
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth, 1))

    const periodProjects = reportType === 'monthly'
      ? projects.filter(p => p.status === 'Vendido' && p.sold_at && isWithinInterval(new Date(p.sold_at), { start: monthStart, end: monthEnd }))
      : projects.filter(p => p.status === 'Vendido' && p.sold_at && new Date(p.sold_at).getFullYear() === selectedYear)

    const periodOrders = reportType === 'monthly'
      ? orders.filter(o => isWithinInterval(new Date(o.ordered_at), { start: monthStart, end: monthEnd }) && o.status !== 'Cancelado')
      : orders.filter(o => new Date(o.ordered_at).getFullYear() === selectedYear && o.status !== 'Cancelado')

    // Despesas operacionais do período
    const periodExpenses = reportType === 'monthly'
      ? expenses.filter(e => isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }))
      : expenses.filter(e => parseISO(e.date).getFullYear() === selectedYear)
    const totalOpExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0)

    // Receita e COGS do período — vêm do LEDGER (vendas de projeto + inventário)
    const periodStart = reportType === 'monthly' ? monthStart : new Date(selectedYear, 0, 1)
    const periodEnd = reportType === 'monthly' ? monthEnd : new Date(selectedYear, 11, 31, 23, 59, 59)
    const pnl = computePnL(ledger, periodStart, periodEnd)

    const totalRevenue = pnl.revenue
    const totalCost = pnl.cogs
    const totalPartsCost = periodOrders.reduce((s, o) => s + (o.total_cost ?? 0), 0)
    const profit = totalRevenue - totalCost - totalOpExpenses
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

    return { totalRevenue, totalCost, totalPartsCost, totalOpExpenses, profit, margin, periodProjects, periodOrders, pnl }
  }, [projects, orders, expenses, ledger, selectedMonth, selectedYear, reportType])

  const monthlyChart = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const mStart = startOfMonth(new Date(selectedYear, m, 1))
      const mEnd = endOfMonth(new Date(selectedYear, m, 1))
      const mp = computePnL(ledger, mStart, mEnd)
      const opExp = expenses
        .filter(e => isWithinInterval(parseISO(e.date), { start: mStart, end: mEnd }))
        .reduce((s, e) => s + e.amount, 0)
      return { month: MONTHS_SHORT[m], revenue: mp.revenue, profit: mp.grossProfit - opExp }
    })
  }, [ledger, expenses, selectedYear, MONTHS_SHORT])

  // Margens por plataforma de venda (do período seleccionado)
  const platformMargins = useMemo(() => {
    const map = new Map<string, { revenue: number; cost: number; count: number }>()
    for (const p of metrics.periodProjects) {
      const key = p.sale_platform || 'Sem plataforma'
      const { cost, revenue } = calcROI(p)
      const cur = map.get(key) ?? { revenue: 0, cost: 0, count: 0 }
      cur.revenue += revenue; cur.cost += cost; cur.count += 1
      map.set(key, cur)
    }
    return [...map.entries()]
      .map(([platform, v]) => ({
        platform,
        revenue: v.revenue,
        profit: v.revenue - v.cost,
        margin: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
        count: v.count,
      }))
      .sort((a, b) => b.profit - a.profit)
  }, [metrics.periodProjects])

  function handleDownloadPDF() {
    // Use our professional PDF template with company logo
    const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const period = reportType === 'monthly'
      ? `${MONTHS_FULL[selectedMonth]} ${selectedYear}`
      : `Ano ${selectedYear}`
    printReportPDF({
      period,
      totalRevenue: metrics.totalRevenue,
      totalCost: metrics.totalCost,
      totalOpExpenses: metrics.totalOpExpenses,
      profit: metrics.profit,
      margin: metrics.margin,
      projectCount: metrics.periodProjects.length,
      totalPartsCost: metrics.totalPartsCost,
    }, settings)
  }

  function handleExportCSV() {
    const rows = metrics.periodProjects.map(p => {
      const { profit } = calcROI(p)
      return {
        ticket: p.ticket_number ?? '',
        equipment: p.equipment,
        brand: p.brand ?? '',
        model: p.model ?? '',
        purchase: p.purchase_price ?? 0,
        parts: p.parts_cost ?? 0,
        shipping_in: p.shipping_in ?? 0,
        shipping_out: p.shipping_out ?? 0,
        sale: p.sale_price ?? 0,
        profit: profit.toFixed(2),
        status: p.status,
        sold_at: p.sold_at ?? '',
      }
    })
    exportToCSV(rows, `RevTech_${MONTHS[selectedMonth]}_${selectedYear}.csv`)
  }

  const positive = metrics.profit >= 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('reports.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-text-primary transition-colors"
          >
            <FileDown className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            <FileText className="h-4 w-4" />
            {t('reports.download')}
          </button>
        </div>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['monthly', 'annual'] as const).map(tp => (
                <button
                  key={tp}
                  onClick={() => setReportType(tp)}
                  className={cn('px-3 py-1.5 text-xs font-semibold transition-colors',
                    reportType === tp ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface')}
                >
                  {tp === 'monthly' ? t('reports.monthly') : t('reports.annual')}
                </button>
              ))}
            </div>
            {reportType === 'monthly' && (
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="rounded-lg bg-surface border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            )}
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="rounded-lg bg-surface border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: t('reports.revenue'), value: fmtGBP(metrics.totalRevenue), icon: TrendingUp, color: 'text-success', bg: 'bg-success/15' },
          { title: t('reports.costs'), value: fmtGBP(metrics.totalCost + metrics.totalOpExpenses), icon: TrendingDown, color: 'text-danger', bg: 'bg-danger/15' },
          { title: t('reports.profit'), value: fmtGBP(metrics.profit), icon: DollarSign, color: positive ? 'text-success' : 'text-danger', bg: positive ? 'bg-success/15' : 'bg-danger/15' },
          { title: t('reports.margin'), value: `${metrics.margin.toFixed(1)}%`, icon: Activity, color: 'text-accent', bg: 'bg-accent/15' },
        ].map(m => (
          <Card key={m.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-text-muted uppercase tracking-wider">{m.title}</p>
                  <p className="text-xl font-bold text-text-primary">{m.value}</p>
                </div>
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', m.bg)}>
                  <m.icon className={cn('h-4 w-4', m.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Projects table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('reports.monthlyEvolution', { year: selectedYear })}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9AA0AC' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9AA0AC' }} />
                <Tooltip contentStyle={{ background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E8EAED' }} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                <Bar dataKey="revenue" name={t('analytics.revenue')} fill="#4F8EF7" radius={[3, 3, 0, 0]} maxBarSize={30} />
                <Bar dataKey="profit" name={t('analytics.profit')} fill="#4CAF82" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('reports.soldInPeriod', { count: metrics.periodProjects.length })}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {metrics.periodProjects.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">{t('reports.noSoldProjects')}</p>
              ) : metrics.periodProjects.map(p => {
                const { profit } = calcROI(p)
                return (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                    className="w-full flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-left">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {p.ticket_number && <span className="text-xs font-mono text-accent/70">{p.ticket_number}</span>}
                        <span className="text-xs font-medium text-text-primary truncate">{p.equipment}</span>
                      </div>
                      <p className="text-xs text-text-muted">{p.sold_at ? format(new Date(p.sold_at), 'dd/MM/yyyy') : '—'}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={cn('text-sm font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>{fmtGBP(profit)}</p>
                      <p className="text-xs text-text-muted">{fmtGBP(p.sale_price ?? 0)} {t('reports.saleLabel')}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margens por plataforma */}
      {platformMargins.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Margens por plataforma de venda</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Plataforma</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-muted uppercase tracking-wider">Vendas</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-muted uppercase tracking-wider">Receita</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-muted uppercase tracking-wider">Lucro</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-text-muted uppercase tracking-wider">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {platformMargins.map(pm => (
                    <tr key={pm.platform} className="hover:bg-surface/50">
                      <td className="px-2 py-2 text-text-primary font-medium">{pm.platform}</td>
                      <td className="px-2 py-2 text-right text-text-muted">{pm.count}</td>
                      <td className="px-2 py-2 text-right text-text-primary">{fmtGBP(pm.revenue)}</td>
                      <td className={cn('px-2 py-2 text-right font-semibold', pm.profit >= 0 ? 'text-success' : 'text-danger')}>{fmtGBP(pm.profit)}</td>
                      <td className={cn('px-2 py-2 text-right font-semibold', pm.margin >= 0 ? 'text-accent' : 'text-danger')}>{pm.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parts orders */}
      {metrics.periodOrders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('reports.partOrdersTitle', { count: metrics.periodOrders.length, amount: fmtGBP(metrics.totalPartsCost) })}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.periodOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border">
                  <div>
                    <p className="text-xs font-medium text-text-primary">{o.part_name}</p>
                    <p className="text-xs text-text-muted">{o.supplier} · {t('orders.fields.quantity')}: {o.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">{fmtGBP(o.total_cost ?? 0)}</p>
                    <p className="text-xs text-text-muted">{t(`orderStatusMap.${o.status}`, { defaultValue: o.status })}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
