import { useState, useEffect, Fragment } from 'react'
import { useAuditLog, type AuditActionType, type AuditEntityType } from '@/hooks/useAuditLog'
import { fmtDate } from '@/lib/utils'
import { Shield, Search, Filter, ChevronDown, ChevronUp, Trash2, Pencil, Plus, ArrowLeftRight, DollarSign, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTION_LABELS: Record<AuditActionType, { label: string; color: string; icon: typeof Trash2 }> = {
  delete:         { label: 'Eliminação',    color: 'text-danger bg-danger/10 border-danger/20',       icon: Trash2 },
  create:         { label: 'Criação',       color: 'text-success bg-success/10 border-success/20',    icon: Plus },
  edit:           { label: 'Edição',        color: 'text-accent bg-accent/10 border-accent/20',       icon: Pencil },
  status_change:  { label: 'Mudança Estado',color: 'text-warning bg-warning/10 border-warning/20',   icon: ArrowLeftRight },
  financial_edit: { label: 'Edição Financ.',color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: DollarSign },
}

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  project:   'Projecto',
  inventory: 'Inventário',
  rma:       'RMA',
  order:     'Encomenda',
  expense:   'Despesa',
  contact:   'Contacto',
}

function ActionBadge({ type }: { type: AuditActionType }) {
  const cfg = ACTION_LABELS[type] ?? { label: type, color: 'text-text-muted bg-surface border-border', icon: Pencil }
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', cfg.color)}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  )
}

export function AuditLog() {
  useEffect(() => { document.title = 'Audit Log — RevTech PRO' }, [])

  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | ''>('')
  const [actionFilter, setActionFilter] = useState<AuditActionType | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: entries = [], isLoading, refetch } = useAuditLog({
    entity_type: entityFilter || undefined,
    action_type: actionFilter || undefined,
    user_email: search || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    limit: 500,
  })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Log de Auditoria</h1>
            <p className="text-text-muted text-xs mt-0.5">{entries.length} entradas · Só visível para administradores</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent border border-border rounded-lg px-3 py-1.5 hover:border-accent/40 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      {/* Search + Filters toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por email..."
            className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
            filtersOpen ? 'border-accent bg-accent/5 text-accent' : 'border-border text-text-muted hover:border-accent/40'
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded filters */}
      {filtersOpen && (
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Tipo de entidade</label>
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value as AuditEntityType | '')}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todas</option>
              {Object.entries(ENTITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Tipo de acção</label>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value as AuditActionType | '')}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">De</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Até</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button
              onClick={() => { setEntityFilter(''); setActionFilter(''); setFromDate(''); setToDate(''); setSearch('') }}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-text-muted text-sm animate-pulse">A carregar...</div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="h-10 w-10 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">Nenhuma entrada encontrada</p>
            <p className="text-text-muted/60 text-xs mt-1">As acções protegidas por PIN ficam registadas aqui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Data / Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Utilizador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Acção</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Entidade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Campo / Detalhe</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {entries.map(entry => {
                  const isExpanded = expandedId === entry.id
                  return (
                    <Fragment key={entry.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="hover:bg-surface/60 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-text-primary">{fmtDate(entry.created_at)}</p>
                          <p className="text-[10px] text-text-muted">{new Date(entry.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-text-primary truncate max-w-[160px]">{entry.user_email ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <ActionBadge type={entry.action_type as AuditActionType} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-text-primary">{entry.entity_name ?? '—'}</p>
                          <p className="text-[10px] text-text-muted">{ENTITY_LABELS[entry.entity_type as AuditEntityType] ?? entry.entity_type}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {entry.field_name && (
                            <p className="text-xs text-text-muted">
                              <span className="font-medium text-text-primary">{entry.field_name}</span>
                              {entry.old_value && entry.new_value && (
                                <span> · <span className="line-through text-danger/80">{entry.old_value.slice(0, 30)}</span> → <span className="text-success">{entry.new_value.slice(0, 30)}</span></span>
                              )}
                            </p>
                          )}
                          {entry.notes && !entry.field_name && (
                            <p className="text-xs text-text-muted truncate max-w-[200px]">{entry.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-surface/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-text-muted uppercase tracking-wider text-[10px] mb-1">ID da entidade</p>
                                <p className="font-mono text-text-primary">{entry.entity_id ?? '—'}</p>
                              </div>
                              {entry.field_name && (
                                <div>
                                  <p className="text-text-muted uppercase tracking-wider text-[10px] mb-1">Campo</p>
                                  <p className="font-medium text-text-primary">{entry.field_name}</p>
                                </div>
                              )}
                              {entry.old_value && (
                                <div>
                                  <p className="text-text-muted uppercase tracking-wider text-[10px] mb-1">Valor anterior</p>
                                  <p className="text-danger font-mono">{entry.old_value}</p>
                                </div>
                              )}
                              {entry.new_value && (
                                <div>
                                  <p className="text-text-muted uppercase tracking-wider text-[10px] mb-1">Novo valor</p>
                                  <p className="text-success font-mono">{entry.new_value}</p>
                                </div>
                              )}
                              {entry.notes && (
                                <div className="col-span-2 md:col-span-4">
                                  <p className="text-text-muted uppercase tracking-wider text-[10px] mb-1">Notas</p>
                                  <p className="text-text-primary">{entry.notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
