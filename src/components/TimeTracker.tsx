import { useState, useEffect, useRef } from 'react'
import { Play, Square, Clock } from 'lucide-react'
import { useTimeEntries, useStartTimer, useStopTimer } from '@/hooks/useTimeTracking'
import { useAuth } from '@/hooks/useAuth'
import type { Project } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface TimeTrackerProps {
  project: Project
  compact?: boolean
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function TimeTracker({ project, compact = false }: TimeTrackerProps) {
  const { user } = useAuth()
  const { data: entries = [] } = useTimeEntries(project.id)
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeEntry = entries.find(e => !e.ended_at)
  const totalMinutes = entries.filter(e => e.duration_minutes).reduce((s, e) => s + (e.duration_minutes ?? 0), 0)

  useEffect(() => {
    if (activeEntry) {
      const tick = () => setElapsed(Date.now() - new Date(activeEntry.started_at).getTime())
      tick()
      intervalRef.current = setInterval(tick, 1000)
    } else {
      setElapsed(0)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeEntry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

  async function handleStart() {
    await startTimer.mutateAsync({ projectId: project.id, userId: user!.id })
  }

  async function handleStop() {
    if (!activeEntry) return
    await stopTimer.mutateAsync({ entryId: activeEntry.id, startedAt: activeEntry.started_at })
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {activeEntry ? (
          <>
            <span className="text-xs font-mono text-accent animate-pulse">{formatDuration(elapsed)}</span>
            <button
              onClick={handleStop}
              className="p-1 rounded hover:bg-surface text-danger transition-colors"
              title="Parar"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          </>
        ) : (
          <>
            {totalMinutes > 0 && <span className="text-xs text-text-muted">{formatMinutes(totalMinutes)}</span>}
            <button
              onClick={handleStart}
              className="p-1 rounded hover:bg-surface text-text-muted hover:text-success transition-colors"
              title="Iniciar timer"
            >
              <Play className="h-3 w-3 fill-current" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2',
      activeEntry ? 'border-success/30 bg-success/5' : 'border-border bg-surface'
    )}>
      <Clock className={cn('h-4 w-4 shrink-0', activeEntry ? 'text-success' : 'text-text-muted')} />
      <div className="flex-1 min-w-0">
        {activeEntry ? (
          <p className="text-sm font-mono font-semibold text-success">{formatDuration(elapsed)}</p>
        ) : (
          <p className="text-xs text-text-muted">
            {totalMinutes > 0 ? `Total: ${formatMinutes(totalMinutes)}` : 'Sem registos'}
          </p>
        )}
      </div>
      {activeEntry ? (
        <button
          onClick={handleStop}
          disabled={stopTimer.isPending}
          className="flex items-center gap-1 text-xs font-medium text-danger hover:bg-danger/10 rounded px-2 py-1 transition-colors"
        >
          <Square className="h-3.5 w-3.5 fill-current" /> Parar
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={startTimer.isPending}
          className="flex items-center gap-1 text-xs font-medium text-success hover:bg-success/10 rounded px-2 py-1 transition-colors"
        >
          <Play className="h-3.5 w-3.5 fill-current" /> Iniciar
        </button>
      )}
    </div>
  )
}
