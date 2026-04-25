import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/hooks/useProjects'
import { calcROI, fmtGBP, fmtDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { differenceInDays } from 'date-fns'

const STATUS_COLOR: Record<string, string> = {
  'Recebido': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Em Diagnóstico': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  'Aguardando Peças': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Em Manutenção': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Pronto para Venda': 'bg-success/15 text-success border-success/20',
  'Vendido': 'bg-success/10 text-success border-success/10',
  'Cancelado': 'bg-danger/10 text-danger border-danger/10',
}

export function SerialHistory() {
  const { t } = useTranslation()
  const { data: projects = [], isLoading } = useProjects()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return projects.filter(p =>
      p.serial_number && p.serial_number.toLowerCase().includes(q)
    ).sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
  }, [projects, query])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>()
    results.forEach(p => {
      const sn = p.serial_number!.toUpperCase()
      const arr = map.get(sn) ?? []
      arr.push(p)
      map.set(sn, arr)
    })
    return map
  }, [results])

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Histórico por Número de Série</h1>
        <p className="text-text-muted text-sm mt-0.5">Pesquisa o historial de qualquer equipamento pelo seu serial ou IMEI</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ex: C02X1234, 356938102345673..."
              className="w-full rounded-lg bg-surface border border-border pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoFocus
            />
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-text-muted mt-2">Escreve pelo menos 2 caracteres</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {grouped.size === 0 && query.length >= 2 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
            <p className="text-text-muted text-sm">Nenhum equipamento encontrado com "{query}"</p>
          </CardContent>
        </Card>
      )}

      {Array.from(grouped.entries()).map(([serial, entries]) => {
        const soldEntries = entries.filter(p => p.status === 'Vendido')
        const totalRevenue = soldEntries.reduce((s, p) => s + (p.sale_price ?? 0), 0)
        const totalCost = entries.reduce((s, p) => s + calcROI(p).cost, 0)
        const isProblematic = entries.length >= 3

        return (
          <Card key={serial} className={cn(isProblematic && 'border-warning/40')}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  {isProblematic && <AlertTriangle className="h-4 w-4 text-warning" />}
                  {serial}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  {isProblematic && (
                    <span className="bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded-full font-semibold">
                      ⚠️ Este equipamento já passou pela oficina {entries.length} vezes
                    </span>
                  )}
                  <span className="bg-surface border border-border px-2 py-1 rounded-full text-text-muted">
                    {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
                  </span>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-lg bg-surface border border-border px-3 py-2 text-center">
                  <p className="text-xs text-text-muted">Receita Total</p>
                  <p className="text-sm font-bold text-success">{fmtGBP(totalRevenue)}</p>
                </div>
                <div className="rounded-lg bg-surface border border-border px-3 py-2 text-center">
                  <p className="text-xs text-text-muted">Custo Total</p>
                  <p className="text-sm font-bold text-danger">{fmtGBP(totalCost)}</p>
                </div>
                <div className="rounded-lg bg-surface border border-border px-3 py-2 text-center">
                  <p className="text-xs text-text-muted">Lucro Total</p>
                  <p className={cn('text-sm font-bold', totalRevenue - totalCost >= 0 ? 'text-success' : 'text-danger')}>
                    {fmtGBP(totalRevenue - totalCost)}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Timeline */}
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-border" />

                {entries.map((p) => {
                  const { profit } = calcROI(p)
                  const days = p.sold_at
                    ? differenceInDays(new Date(p.sold_at), new Date(p.received_at))
                    : differenceInDays(new Date(), new Date(p.received_at))

                  return (
                    <div key={p.id} className="relative mb-4 last:mb-0">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute -left-3.5 top-2 h-3 w-3 rounded-full border-2',
                        p.status === 'Vendido' ? 'bg-success border-success' :
                        p.status === 'Cancelado' ? 'bg-danger border-danger' :
                        'bg-accent border-accent'
                      )} />

                      <div className="rounded-xl border border-border bg-card p-3 ml-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              {p.ticket_number && (
                                <span className="text-xs font-mono text-accent/70">#{p.ticket_number}</span>
                              )}
                              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[p.status] ?? 'bg-surface border-border text-text-muted')}>
                                {t(`statusMap.${p.status}`, { defaultValue: p.status })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-text-primary mt-1">{p.equipment}</p>
                            {p.defect_description && (
                              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{p.defect_description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {p.status === 'Vendido' && p.sale_price && (
                              <div className="flex items-center gap-1">
                                {profit >= 0
                                  ? <TrendingUp className="h-3.5 w-3.5 text-success" />
                                  : <TrendingDown className="h-3.5 w-3.5 text-danger" />
                                }
                                <span className={cn('text-sm font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>
                                  {fmtGBP(profit)}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-text-muted">{fmtDate(p.received_at)}</p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-text-muted">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{days} dias na oficina</span>
                          </div>
                          {p.supplier_name && (
                            <div>Fornecedor: <span className="text-text-primary">{p.supplier_name}</span></div>
                          )}
                          {p.sale_price && (
                            <div>Venda: <span className="text-success font-medium">{fmtGBP(p.sale_price)}</span></div>
                          )}
                          {p.sale_platform && (
                            <div>Plataforma: <span className="text-text-primary">{p.sale_platform}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
