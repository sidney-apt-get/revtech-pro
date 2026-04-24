import { useTranslation } from 'react-i18next'
import { useDashboard } from '@/hooks/useDashboard'
import { useOrders } from '@/hooks/useOrders'
import { useInventory } from '@/hooks/useInventory'
import { fmtGBP, fmtDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StockAlert } from '@/components/Layout'
import { ProjectCard } from '@/components/ProjectCard'
import { TrendingUp, TrendingDown, DollarSign, Activity, ShoppingCart, ClipboardCheck, Wrench } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { addDays, parseISO } from 'date-fns'

const STATUS_CHART_COLORS: Record<string, string> = {
  'Recebido': '#4F8EF7',
  'Em Diagnóstico': '#F0A500',
  'Aguardando Peças': '#E07C2D',
  'Em Manutenção': '#9C6FD6',
  'Pronto para Venda': '#4CAF82',
  'Vendido': '#34C678',
  'Cancelado': '#E05C5C',
}

function MetricCard({ title, value, sub, icon: Icon, positive }: {
  title: string; value: string; sub?: string; icon: typeof DollarSign; positive?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            {sub && <p className="text-xs text-text-muted">{sub}</p>}
          </div>
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center',
            positive === true ? 'bg-success/15' : positive === false ? 'bg-danger/15' : 'bg-accent/15'
          )}>
            <Icon className={cn(
              'h-5 w-5',
              positive === true ? 'text-success' : positive === false ? 'text-danger' : 'text-accent'
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { t } = useTranslation()
  const { totalInvested, totalRevenue, netProfit, activeCount, readyToSell, lowStock, byStatus, recentProjects } = useDashboard()
  const { data: orders = [] } = useOrders()
  const { data: inventory = [] } = useInventory()

  const inTransitOrders = orders.filter(o => ['Encomendado', 'Em Trânsito'].includes(o.status))
  const toolsToCalibrate = inventory.filter(i => {
    if (!i.calibration_date || i.category !== 'Ferramentas') return false
    const calibDate = parseISO(i.calibration_date)
    const in30Days = addDays(new Date(), 30)
    return calibDate <= in30Days
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted text-sm mt-0.5">{t('dashboard.subtitle')}</p>
      </div>

      <StockAlert count={lowStock.length} />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title={t('dashboard.investedMonth')} value={fmtGBP(totalInvested)} icon={DollarSign} />
        <MetricCard title={t('dashboard.soldMonth')} value={fmtGBP(totalRevenue)} icon={TrendingUp} positive />
        <MetricCard
          title={t('dashboard.netProfit')}
          value={fmtGBP(netProfit)}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          positive={netProfit >= 0}
        />
        <MetricCard title={t('dashboard.activeProjects')} value={String(activeCount)} icon={Activity} />
      </div>

      {/* New widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Parts arriving */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-400" />
                {t('dashboard.partsArriving')}
              </CardTitle>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border',
                inTransitOrders.length > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-surface text-text-muted border-border')}>
                {inTransitOrders.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {inTransitOrders.length === 0 ? (
              <p className="text-xs text-text-muted py-2">{t('dashboard.noPendingOrders')}</p>
            ) : (
              <div className="space-y-2">
                {inTransitOrders.slice(0, 3).map(o => (
                  <div key={o.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{o.part_name}</p>
                      <p className="text-xs text-text-muted">{o.supplier}</p>
                    </div>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ml-2',
                      o.status === 'Em Trânsito' ? 'bg-orange-500/15 text-orange-400' : 'bg-blue-500/15 text-blue-400')}>
                      {t(`orderStatusMap.${o.status}`, { defaultValue: o.status })}
                    </span>
                  </div>
                ))}
                {inTransitOrders.length > 3 && (
                  <p className="text-xs text-text-muted">{t('dashboard.moreItems', { count: inTransitOrders.length - 3 })}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklists */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-purple-400" />
                {t('dashboard.checklists')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border">
                <p className="text-xs text-text-muted">{t('dashboard.receptionPending')}</p>
                <span className="text-xs font-bold text-text-primary">
                  {recentProjects.filter(p => !['Vendido', 'Cancelado'].includes(p.status)).length}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 border border-border">
                <p className="text-xs text-text-muted">{t('dashboard.readyDelivery')}</p>
                <span className="text-xs font-bold text-success">{readyToSell.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calibrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4 text-yellow-400" />
                {t('dashboard.calibrations')}
              </CardTitle>
              {toolsToCalibrate.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/20">
                  {toolsToCalibrate.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {toolsToCalibrate.length === 0 ? (
              <p className="text-xs text-text-muted py-2">{t('dashboard.noCalibrations')}</p>
            ) : (
              <div className="space-y-2">
                {toolsToCalibrate.slice(0, 3).map(tool => (
                  <div key={tool.id} className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-primary truncate">{tool.item_name}</p>
                    <p className="text-xs text-warning shrink-0 ml-2">{fmtDate(tool.calibration_date)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.projectsStatus')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStatus} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3141" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 9, fill: '#9AA0AC' }} angle={-30} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 11, fill: '#9AA0AC' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#252836', border: '1px solid #2E3141', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#E8EAED' }}
                  cursor={{ fill: 'rgba(79,142,247,0.05)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] ?? '#4F8EF7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ready to sell */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('dashboard.readyToSell')}</CardTitle>
              <span className="text-xs text-success font-semibold bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                {readyToSell.length} items
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {readyToSell.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">{t('dashboard.noReadyProjects')}</p>
            ) : (
              readyToSell.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.equipment}</p>
                    <p className="text-xs text-text-muted">{fmtGBP(p.cost)} custo</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={cn('text-sm font-bold', p.profit >= 0 ? 'text-success' : 'text-danger')}>
                      {fmtGBP(p.profit)}
                    </p>
                    <p className="text-xs text-text-muted">ROI {p.roi.toFixed(0)}%</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock alerts */}
      {lowStock.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-warning">⚠ {t('dashboard.stockLow', { count: lowStock.length })}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.item_name}</p>
                    <p className="text-xs text-text-muted">{t(`categoryMap.${item.category}`, { defaultValue: item.category })} · {item.location || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-warning">{item.quantity} / {item.min_stock}</p>
                    <p className="text-xs text-text-muted">{t('dashboard.actualMin')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent projects */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3">{t('dashboard.recentProjects')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      </div>
    </div>
  )
}
