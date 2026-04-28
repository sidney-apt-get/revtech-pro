import { useState, useEffect } from 'react'

interface FinancialInputProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  symbol?: string
  placeholder?: string
  optional?: boolean
}

export function FinancialInput({ label, value, onChange, symbol = '£', placeholder = '0.00', optional }: FinancialInputProps) {
  const [display, setDisplay] = useState(() =>
    value != null && value !== 0 ? String(value) : ''
  )

  useEffect(() => {
    setDisplay(value != null && value !== 0 ? String(value) : '')
  }, [value])

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-primary block">
        {label}{optional && <span className="text-text-muted ml-1">(opcional)</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm select-none">
          {symbol}
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={display}
          step="0.01"
          min="0"
          placeholder={placeholder}
          className="w-full bg-surface border border-border rounded-md pl-7 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-9"
          onChange={e => {
            setDisplay(e.target.value)
            if (e.target.value === '') {
              onChange(null)
            } else {
              const num = parseFloat(e.target.value)
              if (!isNaN(num)) onChange(num)
            }
          }}
        />
      </div>
    </div>
  )
}
