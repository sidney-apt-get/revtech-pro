import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useReactToPrint } from 'react-to-print'
import { X, Printer, Save, Camera, Trash2 } from 'lucide-react'
import { supabase, type Project, type Checklist, type ChecklistItem } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const RECEPTION_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  { id: 'r1', label: 'Liga normalmente' },
  { id: 'r2', label: 'Ecrã sem riscos visíveis' },
  { id: 'r3', label: 'Ecrã sem pixels mortos' },
  { id: 'r4', label: 'Caixa sem danos físicos' },
  { id: 'r5', label: 'Bateria presente' },
  { id: 'r6', label: 'Todos os botões funcionam' },
  { id: 'r7', label: 'Portas/conectores sem danos' },
  { id: 'r8', label: 'Acessórios incluídos' },
]

const DELIVERY_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  { id: 'd1', label: 'Reparação concluída e testada' },
  { id: 'd2', label: 'Liga e funciona correctamente' },
  { id: 'd3', label: 'Defeito original resolvido' },
  { id: 'd4', label: 'Limpeza exterior feita' },
  { id: 'd5', label: 'Teste de carga (se aplicável)' },
  { id: 'd6', label: 'Fotografado antes de enviar' },
  { id: 'd7', label: 'Embalagem adequada' },
  { id: 'd8', label: 'Número de tracking registado' },
]

interface ChecklistModalProps {
  project: Project
  onClose: () => void
}

function initItems(defaults: Omit<ChecklistItem, 'checked'>[], saved?: ChecklistItem[]): ChecklistItem[] {
  if (saved && saved.length > 0) return saved
  return defaults.map(d => ({ ...d, checked: false }))
}

export function ChecklistModal({ project, onClose }: ChecklistModalProps) {
  const { t } = useTranslation()
  const printRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'reception' | 'delivery'>('reception')
  const [saving, setSaving] = useState(false)
  const [receptionChecklist, setReceptionChecklist] = useState<Checklist | null>(null)
  const [deliveryChecklist, setDeliveryChecklist] = useState<Checklist | null>(null)
  const [receptionItems, setReceptionItems] = useState<ChecklistItem[]>(initItems(RECEPTION_ITEMS))
  const [deliveryItems, setDeliveryItems] = useState<ChecklistItem[]>(initItems(DELIVERY_ITEMS))
  const [receptionNotes, setReceptionNotes] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [receptionPhotos, setReceptionPhotos] = useState<string[]>([])
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>([])

  const handlePrint = useReactToPrint({ contentRef: printRef })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('checklists')
        .select('*')
        .eq('project_id', project.id)
      if (!data) return
      const rec = data.find(c => c.type === 'reception')
      const del = data.find(c => c.type === 'delivery')
      if (rec) {
        setReceptionChecklist(rec as Checklist)
        const items = rec.items as ChecklistItem[]
        const notes = items.find(i => i.id === 'notes')
        setReceptionItems(initItems(RECEPTION_ITEMS, items.filter(i => i.id !== 'notes')))
        if (notes) setReceptionNotes((notes as any).label)
        setReceptionPhotos((rec.photos as string[]) ?? [])
      }
      if (del) {
        setDeliveryChecklist(del as Checklist)
        const items = del.items as ChecklistItem[]
        const notes = items.find(i => i.id === 'notes')
        setDeliveryItems(initItems(DELIVERY_ITEMS, items.filter(i => i.id !== 'notes')))
        if (notes) setDeliveryNotes((notes as any).label)
        setDeliveryPhotos((del.photos as string[]) ?? [])
      }
    }
    load()
  }, [project.id])

  async function handlePhotoUpload(type: 'reception' | 'delivery', e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const photos = type === 'reception' ? receptionPhotos : deliveryPhotos
    if (photos.length + files.length > 4) return
    const b64s = await Promise.all(files.map(f => new Promise<string>((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(f)
    })))
    if (type === 'reception') setReceptionPhotos(p => [...p, ...b64s])
    else setDeliveryPhotos(p => [...p, ...b64s])
  }

  async function save(type: 'reception' | 'delivery') {
    setSaving(true)
    const items = type === 'reception' ? receptionItems : deliveryItems
    const notes = type === 'reception' ? receptionNotes : deliveryNotes
    const photos = type === 'reception' ? receptionPhotos : deliveryPhotos
    const existing = type === 'reception' ? receptionChecklist : deliveryChecklist
    const allItems = [...items, ...(notes ? [{ id: 'notes', label: notes, checked: false }] : [])]

    try {
      if (existing) {
        await supabase.from('checklists').update({ items: allItems, photos, completed_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        const { data } = await supabase.from('checklists').insert({
          project_id: project.id,
          type,
          items: allItems,
          photos,
          completed_at: new Date().toISOString(),
        }).select().single()
        if (data) {
          if (type === 'reception') setReceptionChecklist(data as Checklist)
          else setDeliveryChecklist(data as Checklist)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const isReception = activeTab === 'reception'
  const items = isReception ? receptionItems : deliveryItems
  const setItems = isReception ? setReceptionItems : setDeliveryItems
  const notes = isReception ? receptionNotes : deliveryNotes
  const setNotes = isReception ? setReceptionNotes : setDeliveryNotes
  const photos = isReception ? receptionPhotos : deliveryPhotos
  const setPhotos = isReception ? setReceptionPhotos : setDeliveryPhotos
  const completed = isReception ? receptionChecklist?.completed_at : deliveryChecklist?.completed_at

  function toggleItem(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">{t('checklist.title')} · {project.ticket_number ?? project.equipment}</h2>
            <p className="text-xs text-text-muted">{project.equipment}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {(['reception', 'delivery'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 px-4 py-2.5 text-xs font-semibold transition-colors',
                activeTab === tab
                  ? 'text-accent border-b-2 border-accent bg-accent/5'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              {tab === 'reception' ? `📥 ${t('checklist.reception')}` : `📤 ${t('checklist.delivery')}`}
              {tab === 'reception' && receptionChecklist && <span className="ml-1 text-success">✓</span>}
              {tab === 'delivery' && deliveryChecklist && <span className="ml-1 text-success">✓</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={printRef}>
          <div className="print-only hidden" style={{ marginBottom: '8px' }}>
            <strong>RevTech — {isReception ? t('checklist.reception') : t('checklist.delivery')}</strong><br />
            <span style={{ fontSize: '12px' }}>{project.ticket_number} · {project.equipment} · {fmtDate(project.received_at)}</span>
          </div>

          {items.map(item => (
            <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className="h-4 w-4 rounded accent-accent cursor-pointer"
              />
              <span className={cn('text-sm transition-colors', item.checked ? 'line-through text-text-muted' : 'text-text-primary')}>
                {item.label}
              </span>
            </label>
          ))}

          {/* Notes */}
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-text-muted">
              {isReception ? t('checklist.receptionNotes') : t('checklist.deliveryNotes')}
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              placeholder={t('checklist.noNotes')}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-text-muted">{t('checklist.photos')} ({photos.length}/4)</p>
              {photos.length < 4 && (
                <label className="cursor-pointer flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors">
                  <Camera className="h-3.5 w-3.5" />
                  {t('checklist.addPhoto')}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(activeTab, e)} />
                </label>
              )}
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={p} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, pi) => pi !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 hover:bg-danger/80 transition-colors"
                    >
                      <Trash2 className="h-2.5 w-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {completed && (
            <p className="text-xs text-success">✓ {t('checklist.completedAt')} {fmtDate(completed)}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-border shrink-0">
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface transition-colors"
          >
            <Printer className="h-4 w-4" />
            {t('checklist.print')}
          </button>
          <button
            onClick={() => save(activeTab)}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? t('common.saving') : t('checklist.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
