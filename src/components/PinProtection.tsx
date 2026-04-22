import { useState, useEffect, useRef, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Eye, EyeOff } from 'lucide-react'

const SESSION_KEY = 'revtech_admin_pin_unlocked'
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_ATTEMPTS = 3
const LOCKOUT_SECONDS = 30

function isSessionUnlocked(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const { ts } = JSON.parse(raw)
    return Date.now() - ts < SESSION_TTL_MS
  } catch {
    return false
  }
}

function markSessionUnlocked() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }))
}

async function fetchStoredPin(): Promise<string> {
  const { data } = await supabase
    .from('app_settings')
    .select('admin_pin')
    .single()
  return data?.admin_pin ?? '1234'
}

interface PinModalProps {
  onSuccess: () => void
}

function PinModal({ onSuccess }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockout, setLockout] = useState(0)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (lockout <= 0) return
    const t = setInterval(() => setLockout(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [lockout > 0])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lockout > 0 || checking || pin.length < 4) return

    setChecking(true)
    setError('')

    const storedPin = await fetchStoredPin()
    setChecking(false)

    if (pin === storedPin) {
      markSessionUnlocked()
      onSuccess()
    } else {
      const next = attempts + 1
      setAttempts(next)
      setPin('')
      if (next >= MAX_ATTEMPTS) {
        setLockout(LOCKOUT_SECONDS)
        setAttempts(0)
        setError(`Bloqueado por ${LOCKOUT_SECONDS} segundos após ${MAX_ATTEMPTS} tentativas.`)
      } else {
        setError(`PIN incorrecto. ${MAX_ATTEMPTS - next} tentativa${MAX_ATTEMPTS - next !== 1 ? 's' : ''} restante${MAX_ATTEMPTS - next !== 1 ? 's' : ''}.`)
      }
    }
  }

  const isLocked = lockout > 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-accent/10 border-b border-border px-6 py-5 text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-accent/20 flex items-center justify-center">
              <Shield className="h-7 w-7 text-accent" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary">Área Restrita</h1>
            <p className="text-xs text-text-muted mt-0.5">Administrador</p>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <img
              src="/revtech-logo.png"
              alt="RevTech"
              className="h-5 w-5 rounded object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-xs font-semibold text-text-muted">RevTech PRO</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-muted text-center">
            Introduz o PIN para continuar
          </p>

          <div className="space-y-1">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setPin(v)
                  setError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e as unknown as React.FormEvent)}
                disabled={isLocked}
                placeholder="PIN (4-6 dígitos)"
                inputMode="numeric"
                maxLength={6}
                className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-text-primary placeholder:text-text-muted placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* PIN dots indicator */}
            <div className="flex justify-center gap-2 py-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${i < pin.length ? 'bg-accent' : 'bg-border'}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className={`text-xs text-center px-3 py-2 rounded-lg border ${
              isLocked
                ? 'bg-danger/10 text-danger border-danger/30'
                : 'bg-warning/10 text-warning border-warning/30'
            }`}>
              {isLocked ? `🔒 ${error} Aguarda ${lockout}s.` : `⚠ ${error}`}
            </p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || isLocked || checking}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking ? 'A verificar...' : isLocked ? `Bloqueado (${lockout}s)` : 'Confirmar'}
          </button>

          <p className="text-xs text-text-muted text-center">
            PIN por defeito: <span className="font-mono">1234</span>
          </p>
        </form>
      </div>
    </div>
  )
}

interface PinProtectionProps {
  children: ReactNode
}

export function PinProtection({ children }: PinProtectionProps) {
  const [unlocked, setUnlocked] = useState(isSessionUnlocked)

  if (!unlocked) {
    return <PinModal onSuccess={() => setUnlocked(true)} />
  }

  return <>{children}</>
}
