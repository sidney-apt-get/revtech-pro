import { useRef } from 'react'
import { X, Plus, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  photos: string[]
  onChange: (photos: string[]) => void
  maxPhotos?: number
  className?: string
}

export function PhotoUpload({ photos, onChange, maxPhotos = 6, className }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    const remaining = maxPhotos - photos.length
    const toProcess = Array.from(files).slice(0, remaining)
    const results: string[] = []

    for (const file of toProcess) {
      const base64 = await fileToBase64(file)
      results.push(base64)
    }

    onChange([...photos, ...results])
  }

  function removePhoto(idx: number) {
    onChange(photos.filter((_, i) => i !== idx))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative group">
            <img
              src={src}
              alt={`Foto ${i + 1}`}
              className="h-20 w-20 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-20 w-20 rounded-lg border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col items-center justify-center gap-1 text-text-muted hover:text-accent"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px]">Foto</span>
          </button>
        )}

        {photos.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <ImageIcon className="h-4 w-4" />
            <span>Sem fotos</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
