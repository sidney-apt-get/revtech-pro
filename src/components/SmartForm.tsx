import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories, useCategoryFields } from '@/hooks/useSmartCatalog'
import { SmartCameraButton } from '@/components/SmartCameraButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { GeminiResult } from '@/lib/aiAnalysis'
import type { CategoryField } from '@/lib/supabase'
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartFormSectionProps {
  context: 'project' | 'inventory'
  initialCategorySlug?: string | null
  initialFieldValues?: Record<string, string>
  onCategoryChange: (slug: string | null) => void
  onFieldValuesChange: (values: Record<string, string>) => void
  onAiResult?: (result: GeminiResult) => void
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { t } = useTranslation()
  if (confidence >= 90) return (
    <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
      <CheckCircle className="h-3 w-3" />
      {t('ai.highConfidence')} ({confidence}%)
    </span>
  )
  if (confidence >= 70) return (
    <span className="flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 border border-warning/20 rounded-full px-2 py-0.5">
      <AlertTriangle className="h-3 w-3" />
      {t('ai.verifyData')} ({confidence}%)
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-danger bg-danger/10 border border-danger/20 rounded-full px-2 py-0.5">
      <XCircle className="h-3 w-3" />
      {t('ai.verifyManually')} ({confidence}%)
    </span>
  )
}

function DynamicField({
  field,
  value,
  onChange,
  lang,
}: {
  field: CategoryField
  value: string
  onChange: (v: string) => void
  lang: string
}) {
  const label = lang === 'pt' ? field.label_pt : field.label_en
  const options: string[] = lang === 'pt'
    ? (field.options_pt ?? [])
    : (field.options_en ?? [])
  const unit = field.unit ? ` (${field.unit})` : ''

  if (field.field_type === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={value === 'true'}
          onClick={() => onChange(value === 'true' ? 'false' : 'true')}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors',
            value === 'true' ? 'bg-accent border-accent' : 'bg-surface border-border'
          )}
        >
          <span className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            value === 'true' ? 'translate-x-4' : 'translate-x-0'
          )} />
        </button>
        <Label className="text-sm cursor-pointer" onClick={() => onChange(value === 'true' ? 'false' : 'true')}>
          {label}{field.is_required ? ' *' : ''}
        </Label>
      </div>
    )
  }

  if (field.field_type === 'select' && options.length > 0) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}{unit}{field.is_required ? ' *' : ''}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (field.field_type === 'multiselect' && options.length > 0) {
    const selected = value ? value.split(',') : []
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}{field.is_required ? ' *' : ''}</Label>
        <div className="flex flex-wrap gap-1.5">
          {options.map(o => {
            const active = selected.includes(o)
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  const next = active ? selected.filter(s => s !== o) : [...selected, o]
                  onChange(next.join(','))
                }}
                className={cn(
                  'text-xs px-2 py-1 rounded-full border transition-colors',
                  active ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent/40'
                )}
              >
                {o}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.field_type === 'textarea') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}{field.is_required ? ' *' : ''}</Label>
        <Textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="text-xs" />
      </div>
    )
  }

  if (field.field_type === 'date') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}{field.is_required ? ' *' : ''}</Label>
        <Input type="date" value={value} onChange={e => onChange(e.target.value)} className="h-8 text-xs" />
      </div>
    )
  }

  if (field.field_type === 'number') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}{unit}{field.is_required ? ' *' : ''}</Label>
        <Input type="number" value={value} onChange={e => onChange(e.target.value)} className="h-8 text-xs" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{unit}{field.is_required ? ' *' : ''}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} className="h-8 text-xs" />
    </div>
  )
}

export function SmartFormSection({
  context,
  initialCategorySlug,
  initialFieldValues = {},
  onCategoryChange,
  onFieldValuesChange,
  onAiResult,
}: SmartFormSectionProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  const [aiResult, setAiResult] = useState<GeminiResult | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [confirmedSlug, setConfirmedSlug] = useState<string | null>(initialCategorySlug ?? null)
  const [changingCategory, setChangingCategory] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(initialFieldValues)
  const [expanded, setExpanded] = useState(true)

  const { data: allCategories = [] } = useCategories(context)
  const { data: fields = [] } = useCategoryFields(confirmedSlug)

  useEffect(() => {
    if (initialCategorySlug) setConfirmedSlug(initialCategorySlug)
  }, [initialCategorySlug])

  useEffect(() => {
    onCategoryChange(confirmedSlug)
  }, [confirmedSlug, onCategoryChange])

  useEffect(() => {
    onFieldValuesChange(fieldValues)
  }, [fieldValues, onFieldValuesChange])

  function handleAiResult(result: GeminiResult, url: string) {
    setAiResult(result)
    setPhotoUrl(url)
    setConfirmedSlug(result.category_slug)

    // Pre-fill field values from AI result
    const newValues: Record<string, string> = { ...fieldValues }
    if (result.color) newValues['color'] = result.color
    if (result.storage_gb) newValues['storage_gb'] = String(result.storage_gb)
    if (result.ram_gb) newValues['ram_gb'] = String(result.ram_gb)
    if (result.battery_mah) newValues['battery_mah'] = String(result.battery_mah)
    if (result.power_watts) newValues['power_watts'] = String(result.power_watts)
    if (result.year_manufactured) newValues['year_manufactured'] = String(result.year_manufactured)
    if (result.cpu_model) newValues['cpu_model'] = result.cpu_model
    if (result.gpu_model) newValues['gpu_model'] = result.gpu_model
    if (result.imei) newValues['imei'] = result.imei
    if (result.serial_number) newValues['serial_number'] = result.serial_number
    if (result.condition_grade) newValues['condition_grade'] = result.condition_grade
    setFieldValues(newValues)

    onAiResult?.(result)
  }

  function handleFieldChange(key: string, value: string) {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }

  const selectedCategory = allCategories.find(c => c.slug === confirmedSlug)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface text-sm font-semibold text-text-muted hover:text-text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          ✨ {t('ai.sectionTitle')}
          {confirmedSlug && selectedCategory && (
            <span className="text-accent font-medium text-xs">
              {selectedCategory.icon} {lang === 'pt' ? selectedCategory.name_pt : selectedCategory.name_en}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Camera button */}
          <div className="flex items-center gap-2 flex-wrap">
            <SmartCameraButton
              context={context}
              onResult={handleAiResult}
            />
            {aiResult && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setAiResult(null); setPhotoUrl(null) }}
                className="gap-1.5 text-text-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('ai.newPhoto')}
              </Button>
            )}
          </div>

          {/* AI Detection result */}
          {aiResult && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-3">
              <div className="flex items-start gap-3">
                {photoUrl && (
                  <img src={photoUrl} alt="AI detected" className="w-16 h-16 rounded-lg object-cover border border-border shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {aiResult.brand} {aiResult.model}
                  </p>
                  <ConfidenceBadge confidence={aiResult.confidence} />
                  {aiResult.visible_damage.length > 0 && (
                    <p className="text-xs text-warning mt-1">⚠️ {aiResult.visible_damage.join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Category confirmation */}
              {!changingCategory ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-text-muted">{t('ai.detectedCategory')}:</span>
                  {selectedCategory && (
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      {selectedCategory.icon} {lang === 'pt' ? selectedCategory.name_pt : selectedCategory.name_en}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setChangingCategory(true)}
                    className="text-xs text-text-muted hover:text-accent underline"
                  >
                    ✏️ {t('ai.changeCategory')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">{t('ai.selectCategory')}</Label>
                  <Select
                    value={confirmedSlug ?? ''}
                    onValueChange={v => { setConfirmedSlug(v); setChangingCategory(false) }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories
                        .filter(c => c.parent_slug !== null)
                        .map(c => (
                          <SelectItem key={c.slug} value={c.slug} className="text-xs">
                            {c.icon} {lang === 'pt' ? c.name_pt : c.name_en}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Category selector when no AI result */}
          {!aiResult && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ai.selectCategory')}</Label>
              <Select
                value={confirmedSlug ?? ''}
                onValueChange={v => setConfirmedSlug(v || null)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t('ai.noCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-text-muted">{t('ai.noCategory')}</SelectItem>
                  {allCategories
                    .filter(c => c.parent_slug !== null)
                    .map(c => (
                      <SelectItem key={c.slug} value={c.slug} className="text-xs">
                        {c.icon} {lang === 'pt' ? c.name_pt : c.name_en}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dynamic fields */}
          {fields.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-text-muted mb-3">{t('ai.specificFields')}</p>
              <div className={cn(
                'grid gap-3',
                fields.filter(f => f.field_type !== 'boolean').length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              )}>
                {fields.map(f => (
                  <DynamicField
                    key={f.field_key}
                    field={f}
                    value={fieldValues[f.field_key] ?? ''}
                    onChange={v => handleFieldChange(f.field_key, v)}
                    lang={lang}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
