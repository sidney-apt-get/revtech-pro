import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number | null
  onChange: (value: number) => void
  isDecimal?: boolean
}

export function NumberInput({ value, onChange, isDecimal = false, className, ...props }: NumberInputProps) {
  const [local, setLocal] = useState(() => (value != null ? String(value) : ''))

  useEffect(() => {
    setLocal(value != null ? String(value) : '')
  }, [value])

  return (
    <input
      type="number"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const n = isDecimal ? parseFloat(local) : parseInt(local, 10)
        onChange(isNaN(n) ? 0 : n)
      }}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text-primary placeholder:text-text-muted shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
