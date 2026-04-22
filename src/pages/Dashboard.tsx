import { useDashboard } from '@/hooks/useDashboard'
import { fmtGBP } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StockAlert } from '@/components/Layout'
import { ProjectCard } from '@/components/ProjectCard'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

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
  const { totalInvested, totalRevenue, netProfit, activeCount, readyToSell, lowStock, byStatus, recentProjects } = useDashboard()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted text-sm mt-0.5">Resumo do mês actual</p>
      </div>

      <StockAlert count={lowStock.length} />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Investido (mês)" value={fmtGBP(totalInvested)} icon={DollarSign} />
        <MetricCard title="Vendido (mês)" value={fmtGBP(totalRevenue)} icon={TrendingUp} positive />
        <MetricCard
          title="Lucro líquido"
          value={fmtGBP(netProfit)}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          positive={netProfit >= 0}
        />
        <MetricCard title="Projectos activos" value={String(activeCount)} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Projectos por estado</CardTitle></CardHeader>
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
              <CardTitle className="text-base">Prontos para venda</CardTitle>
              <span className="text-xs text-success font-semibold bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                {readyToSell.length} items
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {readyToSell.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Nenhum projecto pronto para venda</p>
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
          <CardHeader><CardTitle className="text-base text-warning">⚠ Stock baixo</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.item_name}</p>
                    <p className="text-xs text-text-muted">{item.category} · {item.location || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-warning">{item.quantity} / {item.min_stock}</p>
                    <p className="text-xs text-text-muted">actual / mínimo</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent projects */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3">Projectos recentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      </div>
    </div>
  )
}
