import { useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/hooks/useProjects'
import { calcROI, fmtGBP } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns'
import { enGB, pt } from 'date-fns/locale'
import { TrendingUp, Clock, DollarSign, Target } from 'lucide-react'
import { useAllTimeEntries } from '@/hooks/useTimeTracking'
import { useProjects as useProjectsForTime } from '@/hooks/useProjects'

export function Analytics() {
  const { t, i18n } = useTranslation()
  useEffect(() => { document.title = 'Analytics — RevTech PRO' }, [])
  const { data: projects = [] } = useProjects()
  const { data: timeEntries = [] } = useAllTimeEntries()
  const { data: allProjects = [] } = useProjectsForTime()
  const locale = i18n.language === 'pt' ? pt : enGB

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
        month: format(month, 'MMM', { locale }),
        receita: Number(revenue.toFixed(2)),
        lucro: Number((revenue - cost).toFixed(2)),
        investido: Number(invested.toFixed(2)),
        count: soldInMonth.length,
      }
    })
  }, [projects, locale])

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
      .filter(p => p.status === 'Pronto para Venda' && p.sale_price != null && p.sale_price > 0)
      .reduce((s, p) => {
        const { profit } = calcROI(p)
        return s + profit
      }, 0)
  }, [projects])

  const avgRepairDays = useMemo(() => {
    const times = projects
      .filter(p => p.status === 'Vendido' && p.sold_at)
      .map(p => differenceInDays(new Date(p.sold_at!), new Date(p.received_at)))
      .filter(d => d >= 0)
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null
  }, [projects])

  const tooltipStyle = {
    contentStyle: { background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#E8EAED' },
    cursor: { fill: 'rgba(79,142,247,0.05)' },
  }

  const timeByProject = useMemo(() => {
    const map = new Map<string, number>()
    timeEntries.filter(e => e.duration_minutes).forEach(e => {
      map.set(e.project_id, (map.get(e.project_id) ?? 0) + (e.duration_minutes ?? 0))
    })
    return Array.from(map.entries()).map(([projectId, totalMin]) => {
      const p = allProjects.find(x => x.id === projectId)
      return {
        projectId,
        equipment: p?.equipment ?? t('analytics.deletedProject'),
        ticket: p?.ticket_number,
        status: p?.status ?? '—',
        totalMin,
        totalHours: (totalMin / 60).toFixed(1),
      }
    }).sort((a, b) => b.totalMin - a.totalMin).slice(0, 10)
  }, [timeEntries, allProjects])

  const timeByStatus = useMemo(() => {
    const map = new Map<string, number>()
    timeEntries.filter(e => e.duration_minutes).forEach(e => {
      const p = allProjects.find(x => x.id === e.project_id)
      const status = p?.status ?? 'Desconhecido'
      map.set(status, (map.get(status) ?? 0) + (e.duration_minutes ?? 0))
    })
    return Array.from(map.entries()).map(([status, min]) => ({ status, horas: +(min / 60).toFixed(1) }))
  }, [timeEntries, allProjects])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('analytics.title')}</h1>
        <p className="text-text-muted text-sm mt-0.5">{t('analytics.last6Months')}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('analytics.avgTicket'), value: fmtGBP(avgTicket), icon: DollarSign },
          { label: t('analytics.profitProjection'), value: fmtGBP(projectedProfit), icon: Target, sub: t('analytics.readyToSell') },
          { label: t('analytics.totalSold'), value: String(projects.filter(p => p.status === 'Vendido').length), icon: TrendingUp },
          { label: t('analytics.avgDays'), value: avgRepairDays !== null ? avgRepairDays + 'd' : '\u2014', icon: Clock, sub: avgRepairDays !== null ? t('analytics.daysToSell') : t('analytics.comingSoon') },
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
        <CardHeader><CardTitle className="text-base">{t('analytics.monthlyBalance')}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9AA0AC' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9AA0AC' }} tickFormatter={(v) => `£${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtGBP(v)} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9AA0AC' }} />
              <Line type="monotone" dataKey="receita" stroke="#4F8EF7" strokeWidth={2} dot={{ fill: '#4F8EF7', r: 3 }} name={t('analytics.revenue')} />
              <Line type="monotone" dataKey="lucro" stroke="#4CAF82" strokeWidth={2} dot={{ fill: '#4CAF82', r: 3 }} name={t('analytics.profit')} />
              <Line type="monotone" dataKey="investido" stroke="#F0A500" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#F0A500', r: 3 }} name={t('analytics.invested')} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top equipment */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('analytics.topEquipment')}</CardTitle></CardHeader>
        <CardContent>
          {topEquipment.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{t('analytics.noSalesData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topEquipment} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9AA0AC' }} tickFormatter={(v) => `£${v}`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9AA0AC' }} width={120} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmtGBP(v)} />
                <Bar dataKey="totalProfit" radius={[0, 4, 4, 0]} maxBarSize={20} name={t('analytics.profit')}>
                  {topEquipment.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#4F8EF7' : '#4CAF82'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Tempo por Projecto ─────────────────────────────────── */}
      {timeByProject.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> {t('analytics.timeByProject')}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('analytics.hoursPerProject')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeByProject.map(row => (
                    <div key={row.projectId} className="flex items-center justify-between rounded-lg bg-surface border border-border px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-text-primary truncate">
                          {row.ticket && <span className="text-accent/70 mr-1">#{row.ticket}</span>}
                          {row.equipment}
                        </p>
                        <p className="text-xs text-text-muted">{row.status}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-bold text-accent">{row.totalHours}h</p>
                        <p className="text-xs text-text-muted">{row.totalMin}min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {timeByStatus.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">{t('analytics.hoursByStatus')}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timeByStatus} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9AA0AC' }} unit="h" />
                      <YAxis dataKey="status" type="category" tick={{ fontSize: 9, fill: '#9AA0AC' }} width={100} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}h`, t('analytics.hours')]} />
                      <Bar dataKey="horas" fill="#4F8EF7" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
