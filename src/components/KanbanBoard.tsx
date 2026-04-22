import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Project, ProjectStatus } from '@/lib/supabase'
import { useUpdateProject } from '@/hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import { ALL_STATUSES, STATUS_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'

function SortableCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn('touch-none', isDragging && 'opacity-40')}
    >
      <ProjectCard project={project} onClick={onClick} compact />
    </div>
  )
}

interface KanbanBoardProps {
  projects: Project[]
  onProjectClick: (p: Project) => void
}

export function KanbanBoard({ projects, onProjectClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const updateProject = useUpdateProject()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeProject = projects.find(p => p.id === activeId)

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const column = over.id as ProjectStatus
    if (!ALL_STATUSES.includes(column as ProjectStatus)) return
    const project = projects.find(p => p.id === active.id)
    if (project && project.status !== column) {
      await updateProject.mutateAsync({
        id: project.id,
        status: column,
        sold_at: column === 'Vendido' ? new Date().toISOString() : null,
      })
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 h-full">
        {ALL_STATUSES.map((status) => {
          const cols = projects.filter(p => p.status === status)
          return (
            <div
              key={status}
              id={status}
              className="flex-shrink-0 w-64 flex flex-col rounded-xl border border-border bg-surface"
            >
              {/* Column header */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[status])}>
                    {status}
                  </span>
                  <span className="text-xs text-text-muted font-medium">{cols.length}</span>
                </div>
              </div>

              {/* Cards drop zone */}
              <SortableContext items={cols.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div
                  id={status}
                  className="flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto"
                >
                  {cols.map(p => (
                    <SortableCard key={p.id} project={p} onClick={() => onProjectClick(p)} />
                  ))}
                  {cols.length === 0 && (
                    <div className="h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-text-muted">
                      Arrastar aqui
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeProject && <ProjectCard project={activeProject} compact />}
      </DragOverlay>
    </DndContext>
  )
}
