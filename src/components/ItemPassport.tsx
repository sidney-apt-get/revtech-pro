import { useTranslation } from 'react-i18next'
import { useItemHistory } from '@/hooks/useSmartCatalog'
import type { ItemHistory } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const EVENT_CONFIG: Record<string, { icon: string; color: string }> = {
  item_created:    { icon: '📥', color: 'text-accent border-accent/30 bg-accent/5' },
  photo_added:     { icon: '📷', color: 'text-purple-400 border-purple-400/30 bg-purple-400/5' },
  field_updated:   { icon: '✏️', color: 'text-text-muted border-border bg-surface' },
  status_changed:  { icon: '🔄', color: 'text-warning border-warning/30 bg-warning/5' },
  used_in_project: { icon: '🔧', color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
  sold:            { icon: '💰', color: 'text-success border-success/30 bg-success/5' },
  cannibalized_from:{ icon: '♻️', color: 'text-orange-400 border-orange-400/30 bg-orange-400/5' },
  time_tracked:    { icon: '⏱️', color: 'text-text-muted border-border bg-surface' },
  lot_assigned:    { icon: '📦', color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
  ai_analyzed:     { icon: '🔍', color: 'text-accent border-accent/30 bg-accent/5' },
  note_added:      { icon: '💬', color: 'text-text-muted border-border bg-surface' },
}

function EventCard({ event }: { event: ItemHistory }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const cfg = EVENT_CONFIG[event.event_type] ?? { icon: '📌', color: 'text-text-muted border-border bg-surface' }

  const tKey = `history.events.${event.event_type}`
  const label = t(tKey, { defaultValue: event.event_type.replace(/_/g, ' ') })

  return (
    <div className={cn('relative pl-8')}>
      {/* Timeline line */}
      <div className="absolute left-3.5 top-8 bottom-0 w-px bg-border" />

      {/* Icon dot */}
      <div className={cn(
        'absolute left-0 top-1 h-7 w-7 rounded-full border flex items-center justify-center text-sm',
        cfg.color
      )}>
        {cfg.icon}
      </div>

      <div className={cn('rounded-xl border p-3 mb-3', cfg.color)}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-text-primary">{label}</p>
          <time className="text-[10px] text-text-muted shrink-0">
            {format(parseISO(event.created_at), 'dd MMM yy HH:mm')}
          </time>
        </div>

        {/* Event-specific data display */}
        {event.event_type === 'field_updated' && !!event.event_data && (
          <div className="mt-1.5 text-xs">
            <span className="text-text-muted">{String(event.event_data.field ?? '')}: </span>
            <span className="line-through text-danger/70">{String(event.event_data.old_value ?? '—')}</span>
            <span className="mx-1 text-text-muted">→</span>
            <span className="text-success">{String(event.event_data.new_value ?? '—')}</span>
          </div>
        )}

        {event.event_type === 'status_changed' && !!event.event_data && (
          <div className="mt-1.5 text-xs">
            <span className="text-danger/70">{String(event.event_data.from ?? '')}</span>
            <span className="mx-1 text-text-muted">→</span>
            <span className="text-success">{String(event.event_data.to ?? '')}</span>
          </div>
        )}

        {event.event_type === 'sold' && !!event.event_data && (
          <div className="mt-1.5 text-xs text-text-muted">
            {event.event_data.price != null ? `£${String(event.event_data.price)}` : ''}
            {event.event_data.platform != null ? ` · ${String(event.event_data.platform)}` : ''}
          </div>
        )}

        {event.event_type === 'ai_analyzed' && !!event.event_data?.category_slug && (
          <div className="mt-1.5 text-xs text-text-muted">
            {String(lang === 'pt' ? (event.event_data.category_name_pt ?? '') : (event.event_data.category_name_en ?? ''))}
            {event.event_data.confidence != null ? ` · ${String(event.event_data.confidence)}%` : ''}
          </div>
        )}

        {event.event_type === 'photo_added' && !!event.event_data?.photo_url && (
          <div className="mt-1.5">
            <img
              src={event.event_data.photo_url as string}
              alt="Photo"
              className="h-16 w-16 rounded-lg object-cover border border-border"
            />
          </div>
        )}

        {event.notes && (
          <p className="mt-1.5 text-xs text-text-muted italic">"{event.notes}"</p>
        )}
      </div>
    </div>
  )
}

interface ItemPassportProps {
  itemId: string
  itemType: 'project' | 'inventory' | 'expense' | 'lot'
  className?: string
}

export function ItemPassport({ itemId, itemType, className }: ItemPassportProps) {
  const { t } = useTranslation()
  const { data: history = [], isLoading } = useItemHistory(itemId, itemType)

  if (isLoading) {
    return <p className="text-sm text-text-muted animate-pulse py-4">{t('common.loading')}</p>
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p className="text-sm">{t('history.noEvents')}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-text-muted mb-4 flex items-center gap-2">
        🗂️ {t('history.title')}
      </h3>
      <div className="relative">
        {history.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
