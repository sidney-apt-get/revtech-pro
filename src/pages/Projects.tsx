import { useState } from 'react'
import { useProjects, useDeleteProject } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/ProjectCard'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ProjectModal } from '@/components/ProjectModal'
import { Button } from '@/components/ui/button'
import type { Project, ProjectStatus } from '@/lib/supabase'
import { ALL_STATUSES } from '@/lib/utils'
import { Plus, LayoutGrid, Kanban, Filter } from 'lucide-react'

type View = 'grid' | 'kanban'

export function Projects() {
  const { data: projects = [], isLoading } = useProjects()
  const deleteProject = useDeleteProject()
  const [view, setView] = useState<View>('grid')
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  function handleEdit(p: Project) { setEditing(p); setModalOpen(true) }
  function handleNew() { setEditing(null); setModalOpen(true) }

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">A carregar...</div>

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projectos</h1>
          <p className="text-text-muted text-sm mt-0.5">{projects.length} projectos no total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-2 text-sm transition-colors ${view === 'grid' ? 'bg-accent text-white' : 'bg-surface text-text-muted hover:text-text-primary'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-2 text-sm transition-colors ${view === 'kanban' ? 'bg-accent text-white' : 'bg-surface text-text-muted hover:text-text-primary'}`}
            >
              <Kanban className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleNew} size="sm">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <Filter className="h-4 w-4 text-text-muted shrink-0" />
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:text-text-primary hover:border-accent/40'}`}
        >
          Todos ({projects.length})
        </button>
        {ALL_STATUSES.map(s => {
          const count = projects.filter(p => p.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === s ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:text-text-primary'}`}
            >
              {s} ({count})
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 text-text-muted">
              <p className="text-lg">Nenhum projecto encontrado</p>
              <Button onClick={handleNew} className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Criar primeiro projecto
              </Button>
            </div>
          ) : (
            filtered.map(p => <ProjectCard key={p.id} project={p} onClick={() => handleEdit(p)} />)
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
