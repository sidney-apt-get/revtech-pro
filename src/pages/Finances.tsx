import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/hooks/useProjects'
import { useExpenses, useCreateExpense, useDeleteExpense, useFinancialGoals, useUpsertGoal } from '@/hooks/useFinances'
import { calcROI, fmtGBP } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, PoundSterling, Target, Trash2, Plus,
  AlertTriangle, Lightbulb, ArrowUp, ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  format, startOfMonth, endOfMonth, subMonths, parseISO,
  getMonth, getYear, differenceInDays,
  startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay,
} from 'date-fns'
import { pt } from 'date-fns/locale'

type Period = 'today' | 'week' | 'month' | 'year' | 'custom'

const EXPENSE_CATEGORIES = ['Ferramentas', 'Consumíveis', 'Envios', 'Subscrições', 'Electricidade', 'Internet', 'Outros'] as const
const PIE_COLORS = ['#4F8EF7', '#4CAF82', '#F7C948', '#F7834F', '#A78BFA', '#F472B6', '#94A3B8']

function BudgetBar({ value, target, color = 'accent' }: { value: number; target: number; color?: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  const over = value > target && target > 0
  return (
    <div className="w-full h-2 rounded-full bg-surface border border-border overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', over ? 'bg-danger' : color === 'accent' ? 'bg-accent' : 'bg-success')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Finances() {
  const { t } = useTranslation()
  const { data: projects = [], isLoading: loadingProjects } = useProjects()
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses()
  const { data: goals = [] } = useFinancialGoals()
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()
  const upsertGoal = useUpsertGoal()

  const now = new Date()
  const currentMonth = getMonth(now) + 1
  const currentYear = getYear(now)

  const [period, setPeriod] = useState<Period>('month')
  const [customStart, setCustomStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(now), 'yyyy-MM-dd'))

  const periodRange = useMemo(() => {
    switch (period) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) }
      case 'week':  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'year':  return { start: startOfYear(now), end: endOfYear(now) }
      case 'custom': return { start: new Date(customStart), end: new Date(customEnd + 'T23:59:59') }
      default:      return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }, [period, customStart, customEnd])

  const periodStats = useMemo(() => {
    const { start, end } = periodRange
    const soldProjects = projects.filter(p =>
      p.status === 'Vendido' && p.sold_at &&
      parseISO(p.sold_at) >= start && parseISO(p.sold_at) <= end
    )
    const revenue = soldProjects.reduce((s, p) => s + (p.sale_price ?? 0), 0)
    const directCosts = soldProjects.reduce((s, p) => s + calcROI(p).cost, 0)
    const operationalExpenses = expenses
      .filter(e => { const d = parseISO(e.date); return d >= start && d <= end })
      .reduce((s, e) => s + e.amount, 0)
    const grossProfit = revenue - directCosts
    const netProfit = grossProfit - operationalExpenses
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0
    const taxEstimate = netProfit > 0 ? netProfit * 0.20 : 0

    // Top 5 most profitable items
    const top5 = soldProjects
      .map(p => ({ name: p.equipment, profit: calcROI(p).profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)

    return { revenue, directCosts, operationalExpenses, grossProfit, netProfit, margin, taxEstimate, soldProjects, top5 }
  }, [projects, expenses, periodRange])

  const [expenseModal, setExpenseModal] = useState(false)
  const [expForm, setExpForm] = useState({
    category: 'Outros' as typeof EXPENSE_CATEGORIES[number],
    description: '',
    amount: '',
    date: format(now, 'yyyy-MM-dd'),
    is_recurring: false,
    recurring_day: '',
  })

  const currentGoal = goals.find(g => g.month === currentMonth && g.year === currentYear)
  const [goalForm, setGoalForm] = useState({
    revenue_target: String(currentGoal?.revenue_target ?? ''),
    profit_target: String(currentGoal?.profit_target ?? ''),
    expenses_budget: String(currentGoal?.expenses_budget ?? ''),
  })

  // Monthly aggregations (last 6 months)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      const m = getMonth(d) + 1
      const y = getYear(d)
      const start = startOfMonth(d)
      const end = endOfMonth(d)

      const soldProjects = projects.filter(p =>
        p.status === 'Vendido' && p.sold_at &&
        parseISO(p.sold_at) >= start && parseISO(p.sold_at) <= end
      )
      const revenue = soldProjects.reduce((s, p) => s + (p.sale_price ?? 0), 0)
      const projectCosts = soldProjects.reduce((s, p) => s + calcROI(p).cost, 0)
      const otherExpenses = expenses
        .filter(e => {
          const ed = parseISO(e.date)
          return ed >= start && ed <= end
        })
        .reduce((s, e) => s + e.amount, 0)
      const totalExpenses = projectCosts + otherExpenses
      const profit = revenue - totalExpenses

      return {
        month: format(d, 'MMM', { locale: pt }),
        m, y,
        revenue,
        totalExpenses,
        otherExpenses,
        profit,
        label: format(d, 'MMM yy', { locale: pt }),
      }
    })
  }, [projects, expenses])

  const current = monthlyData[monthlyData.length - 1]
  const prev = monthlyData[monthlyData.length - 2]

  const revDiff = prev.revenue > 0 ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0
  const profDiff = Math.abs(prev.profit) > 0 ? ((current.profit - prev.profit) / Math.abs(prev.profit)) * 100 : 0
  const expDiff = prev.otherExpenses > 0 ? ((current.otherExpenses - prev.otherExpenses) / prev.otherExpenses) * 100 : 0

  // Expenses this month
  const currentExpenses = expenses.filter(e => {
    const d = parseISO(e.date)
    return getMonth(d) + 1 === currentMonth && getYear(d) === currentYear
  })
  const expByCategory = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: currentExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.value > 0)

  // Projections
  const readyToSell = projects.filter(p => p.status === 'Pronto para Venda')
  const potentialRevenue = readyToSell.reduce((s, p) => s + (p.sale_price ?? calcROI(p).cost * 1.5), 0)
  const potentialProfit = readyToSell.reduce((s, p) => s + calcROI(p).profit, 0)

  const soldAll = projects.filter(p => p.status === 'Vendido' && p.sold_at)
  const avgCost = soldAll.length > 0
    ? soldAll.reduce((s, p) => s + calcROI(p).cost, 0) / soldAll.length
    : 0
  const avgProfit = soldAll.length > 0
    ? soldAll.reduce((s, p) => s + calcROI(p).profit, 0) / soldAll.length
    : 0

  // Daily revenue rate (current month so far)
  const daysSoFar = differenceInDays(now, startOfMonth(now)) + 1
  const dailyRate = daysSoFar > 0 ? current.revenue / daysSoFar : 0
  const revenueTarget = currentGoal?.revenue_target ?? 0
  const daysToTarget = revenueTarget > 0 && dailyRate > 0
    ? Math.ceil((revenueTarget - current.revenue) / dailyRate)
    : null

  async function handleSaveGoal() {
    await upsertGoal.mutateAsync({
      month: currentMonth,
      year: currentYear,
      revenue_target: parseFloat(goalForm.revenue_target) || 0,
      profit_target: parseFloat(goalForm.profit_target) || 0,
      expenses_budget: parseFloat(goalForm.expenses_budget) || 0,
    })
  }

  async function handleCreateExpense() {
    await createExpense.mutateAsync({
      category: expForm.category,
      description: expForm.description,
      amount: parseFloat(expForm.amount),
      date: expForm.date,
      receipt_url: null,
      is_recurring: expForm.is_recurring,
      recurring_day: expForm.is_recurring && expForm.recurring_day ? parseInt(expForm.recurring_day) : null,
    })
    setExpenseModal(false)
    setExpForm({ category: 'Outros', description: '', amount: '', date: format(now, 'yyyy-MM-dd'), is_recurring: false, recurring_day: '' })
  }

  if (loadingProjects || loadingExpenses) {
    return <div className="text-text-muted animate-pulse p-4">A carregar...</div>
  }

  const PERIODS: Array<{ key: Period; label: string }> = [
    { key: 'today', label: t('finances.periods.today') },
    { key: 'week',  label: t('finances.periods.week') },
    { key: 'month', label: t('finances.periods.month') },
    { key: 'year',  label: t('finances.periods.year') },
    { key: 'custom',label: t('finances.periods.custom') },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <PoundSterling className="h-6 w-6 text-accent" />
          {t('finances.title')}
        </h1>
        <p className="text-text-muted text-sm mt-0.5">{format(now, 'MMMM yyyy', { locale: pt })}</p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
              period === p.key ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:text-text-primary hover:border-accent/40'
            )}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-7 text-xs w-36" />
            <span className="text-text-muted text-xs">—</span>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-7 text-xs w-36" />
          </div>
        )}
      </div>

      {/* Period KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('finances.revenue'), value: periodStats.revenue, color: 'text-success', icon: TrendingUp },
          { label: t('finances.directCosts'), value: periodStats.directCosts, color: 'text-danger', icon: TrendingDown },
          { label: t('finances.netProfit'), value: periodStats.netProfit, color: periodStats.netProfit >= 0 ? 'text-success' : 'text-danger', icon: PoundSterling },
          { label: t('finances.margin'), value: null, pct: periodStats.margin, color: 'text-accent', icon: Target },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">{k.label}</p>
              <p className={cn('text-lg font-bold mt-1', k.color)}>
                {k.pct !== undefined ? `${k.pct.toFixed(1)}%` : fmtGBP(k.value!)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top 5 */}
      {periodStats.top5.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('finances.top5Items')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {periodStats.top5.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-text-muted truncate flex-1 mr-2">{i + 1}. {item.name}</span>
                <span className={cn('font-semibold shrink-0', item.profit >= 0 ? 'text-success' : 'text-danger')}>
                  {fmtGBP(item.profit)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tax estimate */}
      {periodStats.netProfit > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning">
            <span className="font-semibold">{t('finances.taxEstimate')}:</span>{' '}
            20% {t('finances.on')} {fmtGBP(periodStats.netProfit)} ≈ <span className="font-bold">{fmtGBP(periodStats.taxEstimate)}</span>.
            {' '}{t('finances.consultAccountant')}
          </p>
        </div>
      )}

      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="projecoes">Projecções</TabsTrigger>
        </TabsList>

        {/* ABA 1 — RESUMO */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Receita mês', value: current.revenue, diff: revDiff, icon: TrendingUp, color: 'text-success' },
              { label: 'Despesas mês', value: current.otherExpenses, diff: expDiff, icon: TrendingDown, color: 'text-danger', invert: true },
              { label: 'Lucro líquido', value: current.profit, diff: profDiff, icon: PoundSterling, color: current.profit >= 0 ? 'text-success' : 'text-danger' },
              { label: 'Margem %', value: current.revenue > 0 ? (current.profit / current.revenue) * 100 : 0, diff: 0, icon: Target, color: 'text-accent', isPercent: true },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-text-muted">{k.label}</p>
                  <p className={cn('text-lg font-bold mt-1', k.color)}>
                    {k.isPercent ? `${k.value.toFixed(1)}%` : fmtGBP(k.value)}
                  </p>
                  {Math.abs(k.diff) > 0.5 && (
                    <div className={cn('flex items-center gap-0.5 text-[10px] mt-1 font-medium',
                      (k.invert ? k.diff < 0 : k.diff > 0) ? 'text-success' : 'text-danger')}>
                      {k.diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(k.diff).toFixed(1)}% vs mês anterior
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress vs goal */}
          {currentGoal && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-accent" />Progresso vs Meta ({format(now, 'MMMM', { locale: pt })})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {currentGoal.revenue_target > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">Receita</span>
                      <span className="text-text-primary">{fmtGBP(current.revenue)} / {fmtGBP(currentGoal.revenue_target)}</span>
                    </div>
                    <BudgetBar value={current.revenue} target={currentGoal.revenue_target} />
                  </div>
                )}
                {currentGoal.profit_target > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">Lucro</span>
                      <span className="text-text-primary">{fmtGBP(current.profit)} / {fmtGBP(currentGoal.profit_target)}</span>
                    </div>
                    <BudgetBar value={current.profit} target={currentGoal.profit_target} color="success" />
                  </div>
                )}
                {currentGoal.expenses_budget > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">Despesas</span>
                      <span className={cn('font-medium', current.otherExpenses > currentGoal.expenses_budget ? 'text-danger' : 'text-text-primary')}>
                        {fmtGBP(current.otherExpenses)} / {fmtGBP(currentGoal.expenses_budget)}
                      </span>
                    </div>
                    <BudgetBar value={current.otherExpenses} target={currentGoal.expenses_budget} color="danger" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estimativa de imposto */}
          {current.profit > 0 && (
            <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                <span className="font-semibold">Estimativa de imposto (referência):</span>{' '}
                20% sobre {fmtGBP(current.profit)} lucro ≈ <span className="font-bold">{fmtGBP(current.profit * 0.2)}</span>.
                Consulta um contabilista para valores reais.
              </p>
            </div>
          )}

          {/* Chart */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Receita vs Despesas — últimos 6 meses</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9AA0AC' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9AA0AC' }} />
                  <Tooltip contentStyle={{ background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E8EAED' }} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Receita" fill="#4F8EF7" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="totalExpenses" name="Despesas" fill="#F75F5F" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="profit" name="Lucro" fill="#4CAF82" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2 — DESPESAS */}
        <TabsContent value="despesas" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Total este mês: <span className="text-text-primary font-semibold">{fmtGBP(currentExpenses.reduce((s, e) => s + e.amount, 0))}</span>
            </p>
            <Button size="sm" onClick={() => setExpenseModal(true)}>
              <Plus className="h-4 w-4" /> Nova Despesa
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie chart */}
            {expByCategory.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Por Categoria</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={expByCategory} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {expByCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => fmtGBP(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recurring estimate */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Despesas Fixas Estimadas/Mês</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {expenses.filter(e => e.is_recurring).length === 0 && (
                    <p className="text-xs text-text-muted py-3 text-center">Sem despesas recorrentes registadas</p>
                  )}
                  {expenses.filter(e => e.is_recurring).map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="text-text-muted truncate flex-1 mr-2">{e.description}</span>
                      <span className="text-text-primary font-medium shrink-0">{fmtGBP(e.amount)}</span>
                    </div>
                  ))}
                  {expenses.filter(e => e.is_recurring).length > 0 && (
                    <div className="border-t border-border pt-2 flex justify-between text-xs font-semibold">
                      <span className="text-text-muted">Total fixo</span>
                      <span className="text-text-primary">{fmtGBP(expenses.filter(e => e.is_recurring).reduce((s, e) => s + e.amount, 0))}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All expenses list */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {['Data', 'Categoria', 'Descrição', 'Valor', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {expenses.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-text-muted text-sm">Sem despesas registadas</td></tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={e.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-text-muted">{e.date}</td>
                        <td className="px-4 py-2.5 text-xs text-text-muted">{e.category}</td>
                        <td className="px-4 py-2.5 text-xs text-text-primary">
                          {e.description}
                          {e.is_recurring && <span className="ml-1.5 text-[10px] text-accent border border-accent/20 px-1 rounded">recorrente</span>}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-danger">{fmtGBP(e.amount)}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => deleteExpense.mutate(e.id)} className="p-1 rounded hover:bg-surface text-text-muted hover:text-danger transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3 — METAS */}
        <TabsContent value="metas" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Meta para {format(now, 'MMMM yyyy', { locale: pt })}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Receita alvo (£)', key: 'revenue_target' },
                  { label: 'Lucro alvo (£)', key: 'profit_target' },
                  { label: 'Orçamento despesas (£)', key: 'expenses_budget' },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={goalForm[f.key as keyof typeof goalForm]}
                      onChange={e => setGoalForm(g => ({ ...g, [f.key]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={handleSaveGoal} disabled={upsertGoal.isPending}>
                {upsertGoal.isPending ? 'A guardar...' : 'Guardar meta'}
              </Button>
            </CardContent>
          </Card>

          {/* Historical goals vs actual */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Histórico Metas vs Real</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData.slice().reverse().map(m => {
                  const goal = goals.find(g => g.month === m.m && g.year === m.y)
                  if (!goal) return null
                  return (
                    <div key={`${m.m}-${m.y}`} className="space-y-1.5">
                      <p className="text-xs font-semibold text-text-muted capitalize">{m.label}</p>
                      {goal.revenue_target > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-text-muted">Receita</span>
                            <span>{fmtGBP(m.revenue)} / {fmtGBP(goal.revenue_target)}</span>
                          </div>
                          <BudgetBar value={m.revenue} target={goal.revenue_target} />
                        </div>
                      )}
                    </div>
                  )
                }).filter(Boolean)}
                {goals.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-4">Sem metas definidas ainda</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4 — PROJECÇÕES */}
        <TabsContent value="projecoes" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stock pronto */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-warning" />Potencial do Stock Actual</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-text-muted">{readyToSell.length} equipamento{readyToSell.length !== 1 ? 's' : ''} pronto{readyToSell.length !== 1 ? 's' : ''} para venda</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted text-xs">Receita potencial</span>
                    <span className="text-success font-bold">{fmtGBP(potentialRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-xs">Lucro potencial</span>
                    <span className={cn('font-bold', potentialProfit >= 0 ? 'text-success' : 'text-danger')}>{fmtGBP(potentialProfit)}</span>
                  </div>
                </div>
                {readyToSell.slice(0, 4).map(p => (
                  <div key={p.id} className="flex justify-between text-xs rounded-lg bg-surface border border-border px-3 py-1.5">
                    <span className="text-text-muted truncate flex-1 mr-2">{p.equipment}</span>
                    <span className={cn('font-medium shrink-0', calcROI(p).profit >= 0 ? 'text-success' : 'text-danger')}>
                      {fmtGBP(calcROI(p).profit)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stats & Pace */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-accent" />Velocidade & Médias</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-surface border border-border p-3 text-center">
                    <p className="text-xs text-text-muted">Custo médio/reparação</p>
                    <p className="text-base font-bold text-text-primary mt-1">{fmtGBP(avgCost)}</p>
                  </div>
                  <div className="rounded-lg bg-surface border border-border p-3 text-center">
                    <p className="text-xs text-text-muted">Lucro médio/venda</p>
                    <p className={cn('text-base font-bold mt-1', avgProfit >= 0 ? 'text-success' : 'text-danger')}>{fmtGBP(avgProfit)}</p>
                  </div>
                </div>

                {daysToTarget !== null && (
                  <div className={cn('rounded-xl border px-4 py-3', daysToTarget <= 0 ? 'border-success/30 bg-success/5' : 'border-accent/20 bg-accent/5')}>
                    {daysToTarget <= 0 ? (
                      <p className="text-sm text-success font-semibold">🎉 Meta de receita atingida este mês!</p>
                    ) : (
                      <p className="text-sm text-text-primary">
                        Ao ritmo actual (<span className="text-accent font-medium">{fmtGBP(dailyRate)}/dia</span>),
                        a meta de receita será atingida em aproximadamente{' '}
                        <span className="font-bold text-accent">{daysToTarget} dias</span>.
                      </p>
                    )}
                  </div>
                )}

                <div className="text-xs text-text-muted space-y-1">
                  <p>Taxa diária este mês: <span className="text-text-primary">{fmtGBP(dailyRate)}/dia</span></p>
                  <p>Receita acumulada mês: <span className="text-text-primary">{fmtGBP(current.revenue)}</span></p>
                  {soldAll.length > 0 && <p>Total equipamentos vendidos: <span className="text-text-primary">{soldAll.length}</span></p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Nova Despesa */}
      <Dialog open={expenseModal} onOpenChange={o => !o && setExpenseModal(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <div className="p-6 pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={expForm.category} onValueChange={v => setExpForm(f => ({ ...f, category: v as typeof EXPENSE_CATEGORIES[number] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="ex: Pasta térmica Arctic" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (£)</Label>
                <Input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={expForm.is_recurring}
                onChange={e => setExpForm(f => ({ ...f, is_recurring: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="recurring" className="cursor-pointer text-sm">Despesa recorrente mensal</Label>
            </div>
            {expForm.is_recurring && (
              <div className="space-y-1.5">
                <Label>Dia do mês que repete</Label>
                <Input type="number" min="1" max="31" value={expForm.recurring_day} onChange={e => setExpForm(f => ({ ...f, recurring_day: e.target.value }))} placeholder="ex: 1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateExpense} disabled={!expForm.description || !expForm.amount || createExpense.isPending}>
              {createExpense.isPending ? 'A guardar...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
