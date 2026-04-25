import { useDashboard } from '@/hooks/useDashboard'
import { useOrders } from '@/hooks/useOrders'
import { useInventory } from '@/hooks/useInventory'
import { useExpenses, useFinancialGoals } from '@/hooks/useFinances'
import { useProjects } from '@/hooks/useProjects'
import { fmtGBP, fmtDate, calcROI } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StockAlert } from '@/components/Layout'
import { Link } from 'wouter'
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Clock, Target,
  ShoppingCart, AlertTriangle, Tag, Wrench, Package, ArrowRight, PoundSterling,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { addDays, parseISO, format, differenceInDays } from 'date-fns'
import { enGB, pt } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { printLabel } from '@/lib/printLabel'

function KpiCard({ title, value, sub, icon: Icon, color = 'accent', trend }: {
  title: string
  value: string
  sub?: string
  icon: typeof DollarSign
  color?: 'accent' | 'success' | 'danger' | 'warning' | 'purple'
  trend?: 'up' | 'down' | 'neutral'
}) {
  const bg: Record<string, string> = {
    accent: 'bg-accent/15', success: 'bg-success/15', danger: 'bg-danger/15',
    warning: 'bg-warning/15', purple: 'bg-purple-500/15',
  }
  const fg: Record<string, string> = {
    accent: 'text-accent', success: 'text-success', danger: 'text-danger',
    warning: 'text-warning', purple: 'text-purple-400',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{title}</p>
            <p className="text-xl font-bold text-text-primary">{value}</p>
            {sub && <p className="text-xs text-text-muted">{sub}</p>}
          </div>
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', bg[color])}>
            <Icon className={cn('h-4 w-4', fg[color])} />
          </div>
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium',
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted')}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const STATUS_SHORT: Record<string, string> = {
  'Recebido': 'Rec',
  'Em Diagnóstico': 'Diag',
  'Aguardando Peças': 'Peças',
  'Em Manutenção': 'Manut',
  'Pronto para Venda': 'PpV',
  'Vendido': 'Vend',
  'Cancelado': 'Canc',
}
const STATUS_COLOR: Record<string, string> = {
  'Recebido': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Em Diagnóstico': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  'Aguardando Peças': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Em Manutenção': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Pronto para Venda': 'bg-success/15 text-success border-success/20',
  'Vendido': 'bg-success/10 text-success border-success/10',
  'Cancelado': 'bg-danger/10 text-danger border-danger/10',
}

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'pt' ? pt : enGB
  const {
    totalInvested, totalRevenue, netProfit, avgMargin,
    activeCount, avgRepairDays, successRate, stockValue,
    byStatus, readyToSell, overdue, recentActivity, lowStock,
    monthlyProfit, weeklyFlow,
  } = useDashboard()
  const { data: orders = [] } = useOrders()
  const { data: inventory = [] } = useInventory()
  const { data: projects = [] } = useProjects()
  const { data: expenses = [] } = useExpenses()
  const { data: goals = [] } = useFinancialGoals()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const currentGoal = goals.find(g => g.month === currentMonth && g.year === currentYear)
  const monthlyExpenses = expenses
    .filter(e => { const d = parseISO(e.date); return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear })
    .reduce((s, e) => s + e.amount, 0)
  const readyStock = projects.filter(p => p.status === 'Pronto para Venda')
  const stockPotential = readyStock.reduce((s, p) => {
    const { cost } = calcROI(p)
    return s + (p.sale_price ?? cost * 1.4)
  }, 0)

  const inTransitOrders = orders.filter(o => ['Encomendado', 'Em Trânsito'].includes(o.status))
  const toolsToCalibrate = inventory.filter(i => {
    if (!i.calibration_date || i.category !== 'Ferramentas') return false
    return parseISO(i.calibration_date) <= addDays(new Date(), 30)
  })

  const chartData = monthlyProfit.map(m => ({
    month: format(m.monthDate, 'MMM', { locale }),
    [t('analytics.revenue')]: m.revenue,
    [t('analytics.profit')]: m.profit,
  }))
  const weekData = weeklyFlow.map(w => ({
    week: format(w.weekStart, 'dd/MM'),
    Criados: w.created,
    Vendidos: w.sold,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <StockAlert count={lowStock.length} />

      {/* FILA 1 — Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title={t('dashboard.investedMonth')} value={fmtGBP(totalInvested)} icon={DollarSign} color="accent" />
        <KpiCard title={t('dashboard.soldMonth')} value={fmtGBP(totalRevenue)} icon={TrendingUp} color="success" />
        <KpiCard
          title={t('dashboard.netProfit')}
          value={fmtGBP(netProfit)}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          color={netProfit >= 0 ? 'success' : 'danger'}
        />
        <KpiCard title={t('reports.margin')} value={`${avgMargin.toFixed(1)}%`} icon={Target} color="purple" />
      </div>

      {/* FILA 2 — Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title={t('dashboard.activeProjects')} value={String(activeCount)} icon={Activity} color="accent" />
        <KpiCard title={t('dashboard.avgRepairTime')} value={`${avgRepairDays}d`} icon={Clock} color="warning" />
        <KpiCard title={t('dashboard.successRate')} value={`${successRate}%`} icon={Target} color="success" />
        <KpiCard title={t('dashboard.stockValue')} value={fmtGBP(stockValue)} icon={Package} color="purple" />
      </div>

      {/* FILA 3 — Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Pipeline mini-kanban */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4 text-accent" />Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {byStatus.filter(s => !['Vendido', 'Cancelado'].includes(s.status)).map(s => (
                <div key={s.status} className={cn('flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs', STATUS_COLOR[s.status] ?? 'bg-surface border-border text-text-muted')}>
                  <span className="font-medium">{STATUS_SHORT[s.status] ?? s.status}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{s.count}</span>
                    {s.value > 0 && <span className="opacity-70">{fmtGBP(s.value)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />{t('dashboard.alerts')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length > 0 && (
              <Link href="/inventory">
                <div className="flex items-center justify-between rounded-lg bg-warning/5 border border-warning/20 px-3 py-2 cursor-pointer hover:bg-warning/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs text-warning font-medium">{t('inventory.stockAlert', { count: lowStock.length })}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-warning" />
                </div>
              </Link>
            )}
            {inTransitOrders.length > 0 && (
              <Link href="/orders">
                <div className="flex items-center justify-between rounded-lg bg-orange-500/5 border border-orange-500/20 px-3 py-2 cursor-pointer hover:bg-orange-500/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs text-orange-400 font-medium">{t('notifications.inTransit_other', { count: inTransitOrders.length })}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-orange-400" />
                </div>
              </Link>
            )}
            {toolsToCalibrate.length > 0 && (
              <Link href="/inventory">
                <div className="flex items-center justify-between rounded-lg bg-yellow-500/5 border border-yellow-500/20 px-3 py-2 cursor-pointer hover:bg-yellow-500/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">{toolsToCalibrate.length} ferramentas p/ calibrar</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-yellow-400" />
                </div>
              </Link>
            )}
            {lowStock.length === 0 && inTransitOrders.length === 0 && toolsToCalibrate.length === 0 && (
              <p className="text-xs text-text-muted text-center py-3">Sem alertas activos</p>
            )}
          </CardContent>
        </Card>

        {/* Actividade recente */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Actividade Recente</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map(a => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {a.ticket && <span className="text-accent/70 mr-1">#{a.ticket}</span>}
                      {a.equipment}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded border', STATUS_COLOR[a.status] ?? 'bg-surface border-border text-text-muted')}>
                        {t(`statusMap.${a.status}`, { defaultValue: a.status })}
                      </span>
                      <span className="text-xs text-text-muted">{fmtDate(a.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-xs text-text-muted text-center py-3">Sem actividade</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widget Saúde Financeira */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-accent" />
              Saúde Financeira
            </CardTitle>
            <Link href="/finances">
              <span className="text-xs text-accent hover:underline cursor-pointer flex items-center gap-1">
                Ver detalhes <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-text-muted">Receita este mês</p>
              <p className="text-lg font-bold text-success">{fmtGBP(totalRevenue)}</p>
              {currentGoal?.revenue_target && currentGoal.revenue_target > 0 && (
                <>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Meta: {fmtGBP(currentGoal.revenue_target)}</span>
                    <span className={totalRevenue >= currentGoal.revenue_target ? 'text-success' : 'text-text-muted'}>
                      {Math.min(100, Math.round((totalRevenue / currentGoal.revenue_target) * 100))}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
                    <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(100, (totalRevenue / currentGoal.revenue_target) * 100)}%` }} />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-text-muted">Despesas este mês</p>
              <p className={cn('text-lg font-bold', currentGoal?.expenses_budget && monthlyExpenses > currentGoal.expenses_budget ? 'text-danger' : 'text-text-primary')}>
                {fmtGBP(monthlyExpenses)}
              </p>
              {currentGoal?.expenses_budget && currentGoal.expenses_budget > 0 && (
                <p className="text-xs text-text-muted">Orçamento: {fmtGBP(currentGoal.expenses_budget)}</p>
              )}
              {monthlyExpenses === 0 && (
                <p className="text-xs text-text-muted">Nenhuma despesa registada</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-text-muted">Potencial do stock</p>
              <p className="text-lg font-bold text-accent">{fmtGBP(stockPotential)}</p>
              <p className="text-xs text-text-muted">{readyStock.length} equipamento{readyStock.length !== 1 ? 's' : ''} pronto{readyStock.length !== 1 ? 's' : ''} para venda</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FILA 4 — Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Lucro por Mês (últimos 6 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9AA0AC' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9AA0AC' }} />
                <Tooltip contentStyle={{ background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E8EAED' }} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={t('analytics.revenue')} fill="#4F8EF7" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey={t('analytics.profit')} fill="#4CAF82" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Criados vs Vendidos (últimas 8 semanas)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9AA0AC' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9AA0AC' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E8EAED' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Criados" stroke="#4F8EF7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Vendidos" stroke="#4CAF82" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* FILA 5 — Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Prontos para Vender */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4 text-success" />
                {t('dashboard.readyToSell')}
              </CardTitle>
              <Link href="/labels">
                <span className="text-xs text-accent hover:underline cursor-pointer flex items-center gap-1">
                  Etiquetas <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {readyToSell.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">{t('dashboard.noReadyProjects')}</p>
            ) : (
              <div className="space-y-2">
                {readyToSell.slice(0, 6).map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {p.ticket_number && <span className="text-accent/70 mr-1">#{p.ticket_number}</span>}
                        {p.equipment}
                      </p>
                      <p className="text-xs text-text-muted">{fmtGBP(p.cost)} custo · ROI {p.roi.toFixed(0)}%</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <p className={cn('text-sm font-bold', p.profit >= 0 ? 'text-success' : 'text-danger')}>
                        {fmtGBP(p.profit)}
                      </p>
                      <button
                        onClick={() => printLabel(p)}
                        title="Imprimir etiqueta"
                        className="p-1 rounded hover:bg-accent/10 text-text-muted hover:text-success transition-colors"
                      >
                        <Tag className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {readyToSell.length > 6 && (
                  <p className="text-xs text-text-muted text-center">+ {readyToSell.length - 6} mais</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Em atraso */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Em Atraso (&gt;14 dias)
              </CardTitle>
              {overdue.length > 0 && (
                <span className="text-xs bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-semibold">
                  {overdue.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">Sem projectos em atraso</p>
            ) : (
              <div className="space-y-2">
                {overdue.slice(0, 6).map(p => {
                  const days = differenceInDays(new Date(), new Date(p.updated_at ?? p.received_at))
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-warning/5 border border-warning/15 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-text-primary truncate">
                          {p.ticket_number && <span className="text-accent/70 mr-1">#{p.ticket_number}</span>}
                          {p.equipment}
                        </p>
                        <p className="text-xs text-text-muted">{t(`statusMap.${p.status}`, { defaultValue: p.status })}</p>
                      </div>
                      <span className={cn('text-xs font-bold shrink-0 ml-2', days > 30 ? 'text-danger' : 'text-warning')}>
                        {days}d
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
