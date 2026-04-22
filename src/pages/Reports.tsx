import { useState, useMemo } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { useOrders } from '@/hooks/useOrders'
import { generateMonthlyReport, generateAnnualReport, exportToCSV } from '@/lib/reports'
import { calcROI, fmtGBP } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { FileDown, FileText, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function Reports() {
  const { data: projects = [] } = useProjects()
  const { data: orders = [] } = useOrders()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [reportType, setReportType] = useState<'monthly' | 'annual'>('monthly')

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const metrics = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1))
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth, 1))

    const periodProjects = reportType === 'monthly'
      ? projects.filter(p => p.status === 'Vendido' && p.sold_at && isWithinInterval(new Date(p.sold_at), { start: monthStart, end: monthEnd }))
      : projects.filter(p => p.status === 'Vendido' && p.sold_at && new Date(p.sold_at).getFullYear() === selectedYear)

    const periodOrders = reportType === 'monthly'
      ? orders.filter(o => isWithinInterval(new Date(o.ordered_at), { start: monthStart, end: monthEnd }) && o.status !== 'Cancelado')
      : orders.filter(o => new Date(o.ordered_at).getFullYear() === selectedYear && o.status !== 'Cancelado')

    const totalRevenue = periodProjects.reduce((s, p) => s + (p.sale_price ?? 0), 0)
    const totalCost = periodProjects.reduce((s, p) => s + calcROI(p).cost, 0)
    const totalPartsCost = periodOrders.reduce((s, o) => s + (o.total_cost ?? 0), 0)
    const profit = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

    return { totalRevenue, totalCost, totalPartsCost, profit, margin, periodProjects, periodOrders }
  }, [projects, orders, selectedMonth, selectedYear, reportType])

  const monthlyChart = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const mp = projects.filter(p => p.status === 'Vendido' && p.sold_at && new Date(p.sold_at).getFullYear() === selectedYear && new Date(p.sold_at).getMonth() === m)
      const rev = mp.reduce((s, p) => s + (p.sale_price ?? 0), 0)
      const cost = mp.reduce((s, p) => s + calcROI(p).cost, 0)
      return { month: MONTHS[m].slice(0, 3), revenue: rev, profit: rev - cost }
    })
  }, [projects, selectedYear])

  function handleDownloadPDF() {
    if (reportType === 'monthly') {
      generateMonthlyReport(projects, orders, selectedMonth, selectedYear)
    } else {
      generateAnnualReport(projects, orders, selectedYear)
    }
  }

  function handleExportCSV() {
    const rows = metrics.periodProjects.map(p => {
      const { profit } = calcROI(p)
      return {
        ticket: p.ticket_number ?? '',
        equipamento: p.equipment,
        marca: p.brand ?? '',
        modelo: p.model ?? '',
        compra: p.purchase_price ?? 0,
        pecas: p.parts_cost ?? 0,
        envio_in: p.shipping_in ?? 0,
        envio_out: p.shipping_out ?? 0,
        venda: p.sale_price ?? 0,
        lucro: profit.toFixed(2),
        estado: p.status,
        vendido_em: p.sold_at ?? '',
      }
    })
    exportToCSV(rows, `RevTech_${MONTHS[selectedMonth]}_${selectedYear}.csv`)
  }

  const positive = metrics.profit >= 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Relatórios Financeiros</h1>
          <p className="text-text-muted text-sm mt-0.5">Análise de desempenho e exportação</p>
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
            Download PDF
          </button>
        </div>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['monthly', 'annual'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={cn('px-3 py-1.5 text-xs font-semibold transition-colors',
                    reportType === t ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface')}
                >
                  {t === 'monthly' ? 'Mensal' : 'Anual'}
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
          { title: 'Receita', value: fmtGBP(metrics.totalRevenue), icon: TrendingUp, color: 'text-success', bg: 'bg-success/15' },
          { title: 'Custos', value: fmtGBP(metrics.totalCost), icon: TrendingDown, color: 'text-danger', bg: 'bg-danger/15' },
          { title: 'Lucro', value: fmtGBP(metrics.profit), icon: DollarSign, color: positive ? 'text-success' : 'text-danger', bg: positive ? 'bg-success/15' : 'bg-danger/15' },
          { title: 'Margem', value: `${metrics.margin.toFixed(1)}%`, icon: Activity, color: 'text-accent', bg: 'bg-accent/15' },
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
          <CardHeader><CardTitle className="text-base">Evolução mensal {selectedYear}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9AA0AC' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9AA0AC' }} />
                <Tooltip contentStyle={{ background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E8EAED' }} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                <Bar dataKey="revenue" name="Receita" fill="#4F8EF7" radius={[3, 3, 0, 0]} maxBarSize={30} />
                <Bar dataKey="profit" name="Lucro" fill="#4CAF82" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Projectos vendidos no período ({metrics.periodProjects.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {metrics.periodProjects.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">Nenhum projecto vendido</p>
              ) : metrics.periodProjects.map(p => {
                const { profit } = calcROI(p)
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {p.ticket_number && <span className="text-xs font-mono text-accent/70">{p.ticket_number}</span>}
                        <span className="text-xs font-medium text-text-primary truncate">{p.equipment}</span>
                      </div>
                      <p className="text-xs text-text-muted">{p.sold_at ? format(new Date(p.sold_at), 'dd/MM/yyyy') : '—'}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={cn('text-sm font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>{fmtGBP(profit)}</p>
                      <p className="text-xs text-text-muted">{fmtGBP(p.sale_price ?? 0)} venda</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Encomendas do período */}
      {metrics.periodOrders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Encomendas de peças ({metrics.periodOrders.length}) · {fmtGBP(metrics.totalPartsCost)}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.periodOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border">
                  <div>
                    <p className="text-xs font-medium text-text-primary">{o.part_name}</p>
                    <p className="text-xs text-text-muted">{o.supplier} · Qtd {o.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">{fmtGBP(o.total_cost ?? 0)}</p>
                    <p className="text-xs text-text-muted">{o.status}</p>
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
