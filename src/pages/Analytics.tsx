import { useMemo } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { calcROI, fmtGBP } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { pt } from 'date-fns/locale'
import { TrendingUp, Clock, DollarSign, Target } from 'lucide-react'

export function Analytics() {
  const { data: projects = [] } = useProjects()

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
    return months.map(month => {
      const start = startOfMonth(month)
      const end = endOfMonth(month)
      const soldInMonth = projects.filter(p =>
        p.status === 'Vendido' && p.sold_at &&
        isWithinInterval(new Date(p.sold_at), { start, end })
      )
      const receivedInMonth = projects.filter(p =>
        isWithinInterval(new Date(p.received_at), { start, end })
      )
      const revenue = soldInMonth.reduce((s, p) => s + (p.sale_price || 0), 0)
      const cost = soldInMonth.reduce((s, p) =>
        s + (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0) + (p.shipping_out || 0), 0)
      const invested = receivedInMonth.reduce((s, p) =>
        s + (p.purchase_price || 0) + (p.parts_cost || 0) + (p.shipping_in || 0), 0)
      return {
        month: format(month, 'MMM', { locale: pt }),
        receita: Number(revenue.toFixed(2)),
        lucro: Number((revenue - cost).toFixed(2)),
        investido: Number(invested.toFixed(2)),
        count: soldInMonth.length,
      }
    })
  }, [projects])

  const topEquipment = useMemo(() => {
    const map = new Map<string, { count: number; totalProfit: number }>()
    projects.filter(p => p.status === 'Vendido' && p.sale_price != null).forEach(p => {
      const { profit } = calcROI(p)
      const key = p.equipment
      const cur = map.get(key) ?? { count: 0, totalProfit: 0 }
      map.set(key, { count: cur.count + 1, totalProfit: cur.totalProfit + profit })
    })
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, avgProfit: v.totalProfit / v.count }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 8)
  }, [projects])

  const avgTicket = useMemo(() => {
    const sold = projects.filter(p => p.sale_price != null && p.sale_price > 0)
    if (!sold.length) return 0
    return sold.reduce((s, p) => s + (p.sale_price || 0), 0) / sold.length
  }, [projects])

  const projectedProfit = useMemo(() => {
    return projects
      .filter(p => p.status === 'Pronto para Venda')
      .reduce((s, p) => {
        const { profit } = calcROI(p)
        return s + profit
      }, 0)
  }, [projects])

  const tooltipStyle = {
    contentStyle: { background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#E8EAED' },
    cursor: { fill: 'rgba(79,142,247,0.05)' },
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <p className="text-text-muted text-sm mt-0.5">Últimos 6 meses</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ticket médio', value: fmtGBP(avgTicket), icon: DollarSign },
          { label: 'Projecção lucro', value: fmtGBP(projectedProfit), icon: Target, sub: 'Prontos para venda' },
          { label: 'Total vendidos', value: String(projects.filter(p => p.status === 'Vendido').length), icon: TrendingUp },
          { label: 'Tempo médio (dias)', value: '—', icon: Clock, sub: 'Em breve' },
        ].map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</p>
                  <p className="text-xl font-bold text-text-primary">{value}</p>
                  {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
                </div>
                <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Balanço mensal (6 meses)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9AA0AC' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9AA0AC' }} tickFormatter={(v) => `£${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtGBP(v)} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9AA0AC' }} />
              <Line type="monotone" dataKey="receita" stroke="#4F8EF7" strokeWidth={2} dot={{ fill: '#4F8EF7', r: 3 }} name="Receita" />
              <Line type="monotone" dataKey="lucro" stroke="#4CAF82" strokeWidth={2} dot={{ fill: '#4CAF82', r: 3 }} name="Lucro" />
              <Line type="monotone" dataKey="investido" stroke="#F0A500" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#F0A500', r: 3 }} name="Investido" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top equipment */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top equipamentos por lucro total</CardTitle></CardHeader>
        <CardContent>
          {topEquipment.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Sem dados de vendas ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topEquipment} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9AA0AC' }} tickFormatter={(v) => `£${v}`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9AA0AC' }} width={120} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmtGBP(v)} />
                <Bar dataKey="totalProfit" radius={[0, 4, 4, 0]} maxBarSize={20} name="Lucro total">
                  {topEquipment.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#4F8EF7' : '#4CAF82'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
