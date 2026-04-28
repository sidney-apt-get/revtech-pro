import { useCategoryFields } from '@/hooks/useCategoryFields'
import type { CategoryField } from '@/lib/supabase'

interface DynamicFieldsProps {
  categorySlug: string | null
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  language?: 'pt' | 'en'
}

const INPUT_CLS = 'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent'

function FieldInput({
  field,
  value,
  onChange,
  lang,
}: {
  field: CategoryField
  value: string
  onChange: (v: string) => void
  lang: 'pt' | 'en'
}) {
  const label = lang === 'en' ? field.label_en : field.label_pt
  const options = lang === 'en' ? field.options_en : field.options_pt

  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted font-medium">
        {label}
        {field.unit && <span className="ml-1 text-text-muted/60">({field.unit})</span>}
        {field.is_required && <span className="ml-1 text-danger text-[10px]">*</span>}
      </label>

      {field.field_type === 'text' && (
        <input className={INPUT_CLS} value={value} onChange={e => onChange(e.target.value)} placeholder="" />
      )}
      {field.field_type === 'number' && (
        <input type="number" className={INPUT_CLS} value={value} onChange={e => onChange(e.target.value)} placeholder="" />
      )}
      {field.field_type === 'textarea' && (
        <textarea className={INPUT_CLS + ' resize-none'} rows={2} value={value} onChange={e => onChange(e.target.value)} />
      )}
      {field.field_type === 'date' && (
        <input type="date" className={INPUT_CLS} value={value} onChange={e => onChange(e.target.value)} />
      )}
      {field.field_type === 'boolean' && (
        <button
          type="button"
          onClick={() => onChange(value === 'true' ? 'false' : 'true')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value === 'true' ? 'bg-accent' : 'bg-surface border border-border'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${value === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      )}
      {field.field_type === 'select' && options && (
        <select className={INPUT_CLS} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.field_type === 'range' && (
        <div className="flex items-center gap-3">
          <input type="range" min="0" max="100" value={value || '0'}
            onChange={e => onChange(e.target.value)}
            className="flex-1 accent-accent" />
          <span className="text-sm text-text-primary w-8 text-right">{value || 0}{field.unit ? field.unit : ''}</span>
        </div>
      )}
      {field.field_type === 'multiselect' && options && (
        <div className="grid grid-cols-2 gap-1.5">
          {options.map(o => {
            const selected = (value || '').split(',').filter(Boolean)
            const checked = selected.includes(o)
            return (
              <label key={o} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter(x => x !== o)
                      : [...selected, o]
                    onChange(next.join(','))
                  }}
                  className="rounded"
                />
                <span className="text-xs text-text-primary">{o}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DynamicFields({ categorySlug, values, onChange, language = 'pt' }: DynamicFieldsProps) {
  const { fields, loading } = useCategoryFields(categorySlug)

  if (!categorySlug || (!loading && fields.length === 0)) return null

  if (loading) return (
    <div className="border-t border-border pt-4">
      <p className="text-xs text-text-muted animate-pulse">A carregar campos...</p>
    </div>
  )

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Campos específicos
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(field => (
          <div key={field.field_key} className={field.field_type === 'textarea' || field.field_type === 'multiselect' ? 'col-span-2' : ''}>
            <FieldInput
              field={field}
              value={values[field.field_key] ?? ''}
              onChange={v => onChange(field.field_key, v)}
              lang={language}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DynamicFieldsDisplay({
  categorySlug,
  values,
  language = 'pt',
}: {
  categorySlug: string | null
  values: Record<string, string>
  language?: 'pt' | 'en'
}) {
  const { fields } = useCategoryFields(categorySlug)

  const filledFields = fields.filter(f => values[f.field_key] && values[f.field_key] !== '')
  if (filledFields.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Campos específicos</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {filledFields.map(field => {
          const label = language === 'en' ? field.label_en : field.label_pt
          let displayValue = values[field.field_key]
          if (field.field_type === 'boolean') displayValue = displayValue === 'true' ? '✓ Sim' : '✗ Não'
          if (field.field_type === 'multiselect') displayValue = displayValue.split(',').filter(Boolean).join(', ')
          if (field.unit) displayValue = `${displayValue} ${field.unit}`

          return (
            <div key={field.field_key} className={field.field_type === 'textarea' ? 'col-span-2' : ''}>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-sm text-text-primary">{displayValue}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
