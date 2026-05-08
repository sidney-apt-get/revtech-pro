import { useRef, useState } from 'react'
import { useProjectPhotos, useUploadPhoto, useDeletePhoto, useUpdateCaption } from '@/hooks/useProjectPhotos'
import type { ProjectPhoto, ProjectPhase } from '@/lib/supabase'
import { Plus, X, ZoomIn, Trash2, Check, Loader2, AlertCircle } from 'lucide-react'

const PHASES: { key: ProjectPhase; label: string; emoji: string }[] = [
  { key: 'recepcao',   label: 'Recepção',   emoji: '📥' },
  { key: 'diagnostico', label: 'Diagnóstico', emoji: '🔍' },
  { key: 'reparacao',  label: 'Reparação',  emoji: '🔧' },
  { key: 'concluido',  label: 'Concluído',  emoji: '✅' },
  { key: 'entrega',    label: 'Entrega',    emoji: '📦' },
]

const MAX_PER_PHASE = 10

interface PhotoGalleryProps {
  projectId: string
  defaultPhase?: ProjectPhase
}

export function PhotoGallery({ projectId, defaultPhase = 'recepcao' }: PhotoGalleryProps) {
  const { data: photos = [], isLoading } = useProjectPhotos(projectId)
  const upload = useUploadPhoto()
  const remove = useDeletePhoto()
  const updateCaption = useUpdateCaption()

  const [activePhase, setActivePhase] = useState<ProjectPhase>(defaultPhase)
  const [fullscreen, setFullscreen] = useState<ProjectPhoto | null>(null)
  const [editCaption, setEditCaption] = useState<{ id: string; value: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const phasePhotos = photos.filter(p => p.phase === activePhase)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (phasePhotos.length >= MAX_PER_PHASE) {
      alert(`Máximo ${MAX_PER_PHASE} fotos por fase`)
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      await upload.mutateAsync({ projectId, phase: activePhase, file })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setUploadError(msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSaveCaption() {
    if (!editCaption || !fullscreen) return
    await updateCaption.mutateAsync({ id: editCaption.id, caption: editCaption.value, projectId })
    setEditCaption(null)
    setFullscreen(prev => prev ? { ...prev, caption: editCaption.value } : null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        A carregar fotos...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Phase tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PHASES.map(p => {
          const count = photos.filter(ph => ph.phase === p.key).length
          const isActive = activePhase === p.key
          return (
            <button
              key={p.key}
              onClick={() => setActivePhase(p.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:text-text-primary hover:border-accent/40'
              }`}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
              {count > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-accent/10 text-accent'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-start gap-2 rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro ao guardar foto</p>
            <p className="text-danger/80 mt-0.5">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError(null)} className="ml-auto shrink-0 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {phasePhotos.map(photo => (
          <div
            key={photo.id}
            className="relative group aspect-square rounded-lg overflow-hidden bg-surface border border-border"
          >
            <img
              src={photo.photo_url}
              alt={photo.caption ?? ''}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => { setFullscreen(photo); setEditCaption(null) }}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove.mutate({ id: photo.id, photoUrl: photo.photo_url, projectId })}
                className="p-1.5 rounded-full bg-danger/30 hover:bg-danger/60 text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                <p className="text-white text-[10px] truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}

        {phasePhotos.length < MAX_PER_PHASE && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-accent/50 bg-surface hover:bg-accent/5 flex flex-col items-center justify-center gap-1 text-text-muted hover:text-accent transition-all disabled:opacity-50"
          >
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <Plus className="h-5 w-5" />
            }
            <span className="text-[10px]">{uploading ? 'A enviar...' : 'Adicionar foto'}</span>
          </button>
        )}
      </div>

      {phasePhotos.length === 0 && (
        <p className="text-xs text-text-muted text-center py-1">Sem fotos nesta fase</p>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Fullscreen */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => { setFullscreen(null); setEditCaption(null) }}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setFullscreen(null); setEditCaption(null) }}
              className="absolute -top-9 right-0 text-white/60 hover:text-white p-1"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={fullscreen.photo_url}
              alt={fullscreen.caption ?? ''}
              className="w-full rounded-xl object-contain max-h-[72vh]"
            />
            <div className="mt-3">
              {editCaption?.id === fullscreen.id ? (
                <div className="flex gap-2">
                  <input
                    value={editCaption.value}
                    onChange={e => setEditCaption({ id: fullscreen.id, value: e.target.value })}
                    placeholder="Legenda..."
                    className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveCaption()}
                  />
                  <button
                    onClick={handleSaveCaption}
                    className="px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/80 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditCaption({ id: fullscreen.id, value: fullscreen.caption ?? '' })}
                  className="text-white/50 hover:text-white text-sm text-left w-full transition-colors"
                >
                  {fullscreen.caption || '+ Adicionar legenda'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
