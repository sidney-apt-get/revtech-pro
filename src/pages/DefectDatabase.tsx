import { useState } from 'react'
import { useDefects, useCreateDefect, useDeleteDefect } from '@/hooks/useDefects'
import { type DefectEntry } from '@/lib/supabase'
import { fmtGBP } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plus, Search, Trash2, Clock, PoundSterling, Star, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'] as const
const DIFFICULTY_COLOR: Record<string, string> = {
  'Fácil': 'bg-success/15 text-success border-success/30',
  'Médio': 'bg-warning/15 text-warning border-warning/30',
  'Difícil': 'bg-danger/15 text-danger border-danger/30',
}
const EQUIPMENT_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Consola', 'Outro']

interface DefectCardProps {
  defect: DefectEntry
  onDelete: (id: string) => void
}

function DefectCard({ defect, onDelete }: DefectCardProps) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card className="hover:border-accent/30 transition-colors">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted">{defect.equipment_type}</span>
              {defect.brand && <span className="text-xs font-semibold text-text-primary">{defect.brand}</span>}
              {defect.model && <span className="text-xs text-text-muted">{defect.model}</span>}
            </div>
            <p className="text-sm font-semibold text-text-primary mt-0.5">{defect.common_defect}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {defect.difficulty && (
              <span className={cn('text-xs font-medium rounded-full border px-2 py-0.5', DIFFICULTY_COLOR[defect.difficulty])}>
                {defect.difficulty}
              </span>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onDelete(defect.id)}
              className="p-1 text-text-muted hover:text-danger transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-2 pt-2 border-t border-border">
            {defect.likely_cause && (
              <div>
                <p className="text-xs text-text-muted">Causa provável</p>
                <p className="text-xs text-text-primary">{defect.likely_cause}</p>
              </div>
            )}
            {defect.required_parts && defect.required_parts.length > 0 && (
              <div>
                <p className="text-xs text-text-muted">Peças necessárias</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {defect.required_parts.map(p => (
                    <span key={p} className="text-xs bg-surface border border-border rounded px-2 py-0.5 text-text-primary">{p}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-text-muted">
              {defect.avg_repair_time_hours != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {defect.avg_repair_time_hours}h
                </span>
              )}
              {defect.avg_parts_cost != null && (
                <span className="flex items-center gap-1">
                  <PoundSterling className="h-3 w-3" />
                  {fmtGBP(defect.avg_parts_cost)} peças
                </span>
              )}
              {defect.success_rate != null && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {defect.success_rate}% sucesso
                </span>
              )}
            </div>
            {defect.notes && <p className="text-xs text-text-muted italic">{defect.notes}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddDefectModal({ onClose }: { onClose: () => void }) {
  const createDefect = useCreateDefect()
  const [form, setForm] = useState<Partial<Omit<DefectEntry, 'id' | 'user_id' | 'created_at'>>>({
    equipment_type: 'Smartphone',
    difficulty: 'Médio',
    required_parts: [],
  })
  const [partsInput, setPartsInput] = useState('')

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.equipment_type || !form.common_defect) return
    await createDefect.mutateAsync({
      equipment_type: form.equipment_type!,
      brand: form.brand ?? null,
      model: form.model ?? null,
      common_defect: form.common_defect!,
      likely_cause: form.likely_cause ?? null,
      required_parts: partsInput ? partsInput.split(',').map(p => p.trim()) : [],
      avg_repair_time_hours: form.avg_repair_time_hours ?? null,
      avg_parts_cost: form.avg_parts_cost ?? null,
      difficulty: form.difficulty ?? null,
      success_rate: form.success_rate ?? null,
      notes: form.notes ?? null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Novo defeito</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">Tipo de equipamento *</label>
              <select value={form.equipment_type} onChange={e => set('equipment_type', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Marca</label>
              <input value={form.brand ?? ''} onChange={e => set('brand', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="Apple, Samsung..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Modelo</label>
              <input value={form.model ?? ''} onChange={e => set('model', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="iPhone 12, Galaxy S21..." />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">Defeito comum *</label>
              <input value={form.common_defect ?? ''} onChange={e => set('common_defect', e.target.value)} required
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="Ecrã partido, não liga..." />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">Causa provável</label>
              <input value={form.likely_cause ?? ''} onChange={e => set('likely_cause', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">Peças necessárias (separadas por vírgula)</label>
              <input value={partsInput} onChange={e => setPartsInput(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="Bateria, Ecrã LCD..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Tempo médio (h)</label>
              <input type="number" step="0.5" value={form.avg_repair_time_hours ?? ''} onChange={e => set('avg_repair_time_hours', parseFloat(e.target.value))}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Custo médio peças (£)</label>
              <input type="number" step="0.01" value={form.avg_parts_cost ?? ''} onChange={e => set('avg_parts_cost', parseFloat(e.target.value))}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Dificuldade</label>
              <select value={form.difficulty ?? 'Médio'} onChange={e => set('difficulty', e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Taxa de sucesso (%)</label>
              <input type="number" min="0" max="100" value={form.success_rate ?? ''} onChange={e => set('success_rate', parseInt(e.target.value))}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-text-muted">Notas</label>
              <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createDefect.isPending}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              {createDefect.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function DefectDatabase() {
  const { data: defects = [], isLoading } = useDefects()
  const deleteDefect = useDeleteDefect()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDiff, setFilterDiff] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = defects.filter(d => {
    if (filterType && d.equipment_type !== filterType) return false
    if (filterDiff && d.difficulty !== filterDiff) return false
    if (search) {
      const q = search.toLowerCase()
      return d.common_defect.toLowerCase().includes(q) ||
        d.brand?.toLowerCase().includes(q) ||
        d.equipment_type.toLowerCase().includes(q) ||
        d.likely_cause?.toLowerCase().includes(q)
    }
    return true
  })

  const uniqueTypes = [...new Set(defects.map(d => d.equipment_type))]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Base de Defeitos</h1>
          <p className="text-text-muted text-sm mt-0.5">{defects.length} entradas · conhecimento técnico</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo defeito
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar defeito, marca..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
          <option value="">Todos os tipos</option>
          {uniqueTypes.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
          className="rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
          <option value="">Qualquer dificuldade</option>
          {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-muted">A carregar base de dados...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">Nenhum defeito encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <DefectCard key={d.id} defect={d} onDelete={id => deleteDefect.mutate(id)} />
          ))}
        </div>
      )}

      {showAdd && <AddDefectModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
