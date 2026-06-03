import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Eye, EyeOff, X } from 'lucide-react'

const SESSION_KEY = 'revtech_admin_pin_unlocked'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 min
const MAX_ATTEMPTS = 3
const LOCKOUT_SECONDS = 30

export function isSessionUnlocked(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const { ts } = JSON.parse(raw)
    return Date.now() - ts < SESSION_TTL_MS
  } catch { return false }
}

export function markSessionUnlocked() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }))
}

async function fetchStoredPin(): Promise<string> {
  const { data } = await supabase.from('app_settings').select('admin_pin').single()
  return data?.admin_pin ?? '1234'
}

interface PinGuardModalProps {
  description: string
  onSuccess: () => void
  onCancel: () => void
}

export function PinGuardModal({ description, onSuccess, onCancel }: PinGuardModalProps) {
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockout, setLockout] = useState(0)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // If session already unlocked, skip PIN entirely
  useEffect(() => {
    if (isSessionUnlocked()) { onSuccess() }
    else { setTimeout(() => inputRef.current?.focus(), 50) }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (lockout <= 0) return
    const t = setInterval(() => setLockout(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [lockout]) // eslint-disable-line

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lockout > 0 || checking || pin.length < 4) return
    setChecking(true)
    setError('')
    try {
      const stored = await fetchStoredPin()
      if (pin === stored) {
        markSessionUnlocked()
        onSuccess()
      } else {
        const next = attempts + 1
        setAttempts(next)
        setPin('')
        if (next >= MAX_ATTEMPTS) {
          setLockout(LOCKOUT_SECONDS)
          setAttempts(0)
          setError(`Bloqueado ${LOCKOUT_SECONDS}s após ${MAX_ATTEMPTS} tentativas incorrectas.`)
        } else {
          setError(`PIN incorrecto. ${MAX_ATTEMPTS - next} tentativa${MAX_ATTEMPTS - next !== 1 ? 's' : ''} restante${MAX_ATTEMPTS - next !== 1 ? 's' : ''}.`)
        }
      }
    } finally {
      setChecking(false)
    }
  }

  // Already unlocked — component will self-dismiss via useEffect above
  if (isSessionUnlocked()) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/15 flex items-center justify-center">
              <Shield className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Confirmar identidade</p>
              <p className="text-[10px] text-text-muted">Sessão desbloqueada por 30 min</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Action description */}
          <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5 text-center">
            <p className="text-xs text-warning font-medium">{description}</p>
          </div>

          {/* PIN input */}
          <div className="space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                onKeyDown={e => { if (e.key === 'Escape') { onCancel() } }}
                disabled={lockout > 0}
                placeholder="PIN (4–6 dígitos)"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-center text-xl tracking-[0.6em] font-mono text-text-primary placeholder:text-text-muted placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
                    i < pin.length ? 'bg-accent scale-125' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className={`text-xs text-center px-3 py-2 rounded-lg border ${
              lockout > 0
                ? 'bg-danger/10 text-danger border-danger/30'
                : 'bg-warning/10 text-warning border-warning/30'
            }`}>
              {lockout > 0 ? `🔒 ${error} Aguarda ${lockout}s.` : `⚠ ${error}`}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pin.length < 4 || lockout > 0 || checking}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checking ? 'A verificar...' : lockout > 0 ? `Bloqueado (${lockout}s)` : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
