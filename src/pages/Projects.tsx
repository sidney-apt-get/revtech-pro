import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'wouter'
import { useProjects } from '@/hooks/useProjects'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ProjectModal } from '@/components/ProjectModal'
import { ScanButton } from '@/components/ScanButton'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectStatus } from '@/lib/supabase'
import { ALL_STATUSES, calcROI, fmtGBP, fmtDate, STATUS_COLORS, STATUS_DOT, cn } from '@/lib/utils'
import { Plus, Kanban, Filter, Search, TrendingUp, TrendingDown, ArrowUpDown, List, Pencil } from 'lucide-react'

type View = 'list' | 'kanban'
type SortBy = 'date_desc' | 'date_asc' | 'profit_desc' | 'value_desc'


function ProjectRow({ project, onEdit }: { project: Project; onEdit: (p: Project) => void }) {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const { profit } = calcROI(project)
  const positive = profit >= 0

  return (
    <tr
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group border-b border-border hover:bg-surface/60 transition-colors cursor-pointer"
    >
      <td className="px-3 py-2.5 text-xs font-mono text-accent/70 whitespace-nowrap hidden md:table-cell">
        {project.ticket_number ?? '—'}
      </td>
      <td className="px-3 py-2.5">
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap', STATUS_COLORS[project.status])}>
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[project.status])} />
          {t(`statusMap.${project.status}`, { defaultValue: project.status })}
        </span>
      </td>
      <td className="px-3 py-2.5 max-w-[180px]">
        <p className="text-sm font-semibold text-text-primary truncate">{project.equipment}</p>
        {(project.brand || project.model) && (
          <p className="text-[10px] text-text-muted truncate">{[project.brand, project.model].filter(Boolean).join(' · ')}</p>
        )}
      </td>
      <td className="px-3 py-2.5 max-w-[200px] hidden md:table-cell">
        <p className="text-xs text-text-muted truncate">{project.defect_description}</p>
      </td>
      <td className="px-3 py-2.5 text-xs text-text-muted whitespace-nowrap hidden md:table-cell">
        {fmtGBP(project.purchase_price)}
        {project.sale_price != null && <span className="mx-1 text-border">→</span>}
        {project.sale_price != null && <span className="text-text-primary">{fmtGBP(project.sale_price)}</span>}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {project.sale_price != null ? (
          <span className={cn('text-xs font-semibold flex items-center gap-0.5', positive ? 'text-success' : 'text-danger')}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmtGBP(Math.abs(profit))}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-text-muted whitespace-nowrap hidden md:table-cell">
        {fmtDate(project.received_at)}
      </td>
      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onEdit(project)}
          className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent hover:bg-accent/10"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

export function Projects() {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  useEffect(() => { document.title = t('page_titles.projects') + ' — RevTech PRO' }, [t])

  const SORT_LABELS: Record<SortBy, string> = {
    date_desc: t('projects.sort.date_desc'),
    date_asc: t('projects.sort.date_asc'),
    profit_desc: t('projects.sort.profit_desc'),
    value_desc: t('projects.sort.value_desc'),
  }
  const { data: projects = [], isLoading } = useProjects()
  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  function handleEdit(p: Project) { setEditing(p); setModalOpen(true) }
  function handleNew() { setEditing(null); setModalOpen(true) }

  const filtered = useMemo(() => {
    let list = projects
    if (filter !== 'all') list = list.filter(p => p.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.equipment.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        (p.model ?? '').toLowerCase().includes(q) ||
        (p.defect_description ?? '').toLowerCase().includes(q) ||
        (p.ticket_number ?? '').toLowerCase().includes(q) ||
        (p.serial_number ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
      if (sortBy === 'profit_desc') {
        const pa = calcROI(a).profit; const pb = calcROI(b).profit
        return pb - pa
      }
      if (sortBy === 'value_desc') return (b.sale_price ?? b.purchase_price) - (a.sale_price ?? a.purchase_price)
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    })
  }, [projects, filter, search, sortBy])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('projects.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('projects.total', { count: projects.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-sm transition-colors ${view === 'list' ? 'bg-accent text-white' : 'bg-surface text-text-muted hover:text-text-primary'}`}
              title="Lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-2 text-sm transition-colors ${view === 'kanban' ? 'bg-accent text-white' : 'bg-surface text-text-muted hover:text-text-primary'}`}
              title="Kanban"
            >
              <Kanban className="h-4 w-4" />
            </button>
          </div>
          <ScanButton
            label="📷 Scan"
            title="Scan Serial / Ticket"
            onScan={(code) => {
              supabase.from('projects')
                .select('id')
                .or(`serial_number.eq.${code},ticket_number.eq.${code},imei.eq.${code}`)
                .single()
                .then(({ data }) => { if (data) navigate(`/projects/${data.id}`) })
            }}
          />
          <Button onClick={handleNew} size="sm">
            <Plus className="h-4 w-4" />
            {t('common.new')}
          </Button>
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={t('projects.searchPlaceholder')}
            className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {(Object.keys(SORT_LABELS) as SortBy[]).map(k => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <Filter className="h-4 w-4 text-text-muted shrink-0" />
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:text-text-primary'}`}
        >
          {t('common.all')} ({projects.length})
        </button>
        {ALL_STATUSES.map(s => {
          const count = projects.filter(p => p.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === s ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:text-text-primary'}`}
            >
              {t(`statusMap.${s}`, { defaultValue: s })} ({count})
            </button>
          )
        })}
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard projects={projects} onProjectClick={handleEdit} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-border">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <p className="text-lg">{t('projects.noProjects')}</p>
              <Button onClick={handleNew} className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> {t('projects.createFirst')}
              </Button>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-card border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-text-muted hidden md:table-cell">Ticket</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-muted">{t('projects.table.status')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-muted">{t('projects.table.equipment')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-muted hidden md:table-cell">{t('projects.table.defect')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-muted hidden md:table-cell">{t('projects.table.buyToSell')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-muted">{t('projects.table.profit')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-text-muted hidden md:table-cell">{t('projects.table.date')}</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {paged.map(p => (
                  <ProjectRow key={p.id} project={p} onEdit={handleEdit} />
                ))}
              </tbody>
            </table>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50 rounded-b-xl">
              <p className="text-xs text-text-muted">
                {t('projects.showing', { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, filtered.length), total: filtered.length })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg border border-border text-xs text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {t('projects.previous')}
                </button>
                <span className="text-xs text-text-muted">{t('projects.pageOf', { current: page + 1, total: totalPages })}</span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg border border-border text-xs text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {t('projects.nextPage')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        project={editing}
      />
    </div>
  )
}
