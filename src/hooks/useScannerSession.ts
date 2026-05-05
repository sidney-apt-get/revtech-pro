import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type ScannerResultType = 'barcode' | 'photo' | 'cancelled'

export type ScannerResult = {
  type: ScannerResultType
  value: string
}

export type ScannerStatus = 'idle' | 'waiting' | 'paired' | 'result' | 'expired' | 'error'

interface UseScannerSessionOptions {
  onResult: (result: ScannerResult) => void
}

export function useScannerSession({ onResult }: UseScannerSessionOptions) {
  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [sessionUrl, setSessionUrl] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(1800)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const close = useCallback(() => {
    cleanup()
    setStatus('idle')
    setSessionUrl(null)
    setTimeLeft(1800)
  }, [cleanup])

  const start = useCallback(async () => {
    cleanup()
    const token = crypto.randomUUID().replace(/-/g, '')
    setStatus('waiting')
    setTimeLeft(1800)

    const url = `${window.location.origin}/scan/${token}`
    setSessionUrl(url)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('scanner_sessions').insert({
        token,
        user_id: user?.id ?? null,
      })
      if (error) {
        console.error('scanner_sessions insert error:', error)
        setStatus('error')
        return
      }
    } catch (err) {
      console.error('Session create error:', err)
      setStatus('error')
      return
    }

    const ch = supabase
      .channel(`scanner-${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scanner_sessions',
          filter: `token=eq.${token}`,
        },
        (payload) => {
          const row = payload.new as {
            status: string
            result_type: string | null
            result_value: string | null
          }
          if (row.status === 'paired') {
            setStatus('paired')
          } else if (row.status === 'result' && row.result_type && row.result_value !== null) {
            cleanup()
            setStatus('result')
            onResultRef.current({
              type: row.result_type as ScannerResultType,
              value: row.result_value,
            })
          }
        }
      )
      .subscribe()
    channelRef.current = ch

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          cleanup()
          setStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return { status, sessionUrl, timeLeft, timeFmt: fmt(timeLeft), start, close }
}
