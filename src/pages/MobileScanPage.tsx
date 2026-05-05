import { useEffect, useRef, useState } from 'react'
import { useParams } from 'wouter'
import { supabase } from '@/lib/supabase'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { Scan, Camera, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type PageState = 'loading' | 'ready' | 'scanning' | 'uploading' | 'success' | 'error' | 'expired'

export default function MobileScanPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastCode, setLastCode] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) {
      setState('error')
      setErrorMsg('Token inválido')
      return
    }

    supabase
      .from('scanner_sessions')
      .select('id, status, expires_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setState('error')
          setErrorMsg('Sessão não encontrada')
          return
        }
        if (new Date(data.expires_at) < new Date()) {
          setState('expired')
          return
        }
        return supabase
          .from('scanner_sessions')
          .update({ status: 'paired', paired_at: new Date().toISOString() })
          .eq('token', token)
      })
      .then((res) => {
        if (res && 'error' in res && res.error) {
          setState('error')
          setErrorMsg('Não foi possível ligar à sessão')
          return
        }
        setState('ready')
      })
  }, [token])

  async function sendResult(type: 'barcode' | 'photo' | 'cancelled', value: string) {
    const { error } = await supabase
      .from('scanner_sessions')
      .update({ status: 'result', result_type: type, result_value: value })
      .eq('token', token)

    if (error) {
      setState('error')
      setErrorMsg('Erro ao enviar resultado')
      return
    }

    if (type === 'barcode') setLastCode(value)
    setState('success')
    setTimeout(() => {
      setLastCode(null)
      setState('ready')
    }, 2000)
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setState('uploading')
    try {
      const base64 = await resizeImage(file, 640)
      await sendResult('photo', base64)
    } catch {
      setState('error')
      setErrorMsg('Erro ao processar foto')
    }
  }

  function resizeImage(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = url
    })
  }

  if (state === 'scanning') {
    return (
      <BarcodeScanner
        title="Scan — RevTech"
        onScan={code => sendResult('barcode', code)}
        onClose={() => setState('ready')}
      />
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0f1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      gap: '20px',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#4F8EF7', letterSpacing: '-0.5px' }}>
          RevTech
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
          Scanner
        </div>
      </div>

      {state === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 style={{ color: '#4F8EF7', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>A ligar...</p>
        </div>
      )}

      {(state === 'ready' || state === 'success') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '340px' }}>

          {/* Status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#14532d',
            border: '1px solid #166534',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '13px',
            color: '#4ade80',
            fontWeight: 500,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} />
            Ligado ao computador
          </div>

          {state === 'success' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#14532d',
              border: '1px solid #166534',
              borderRadius: '12px',
              padding: '12px 16px',
              width: '100%',
            }}>
              <CheckCircle2 style={{ color: '#4ade80', width: 22, height: 22, flexShrink: 0 }} />
              <div>
                <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '14px', margin: 0 }}>✅ Enviado!</p>
                {lastCode && (
                  <p style={{ color: '#86efac', fontSize: '12px', fontFamily: 'monospace', marginTop: '2px' }}>{lastCode}</p>
                )}
              </div>
            </div>
          )}

          <p style={{ color: '#d1d5db', fontSize: '15px', fontWeight: 500, textAlign: 'center', margin: 0 }}>
            O que queres fazer?
          </p>

          <button
            onClick={() => setState('scanning')}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '18px 20px',
              borderRadius: '16px',
              background: '#1e293b',
              border: '2px solid #4F8EF7',
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Scan style={{ width: 30, height: 30, color: '#4F8EF7', flexShrink: 0 }} />
            Escanear Código de Barras
          </button>

          <button
            onClick={() => photoInputRef.current?.click()}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '18px 20px',
              borderRadius: '16px',
              background: '#1e293b',
              border: '2px solid #10b981',
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Camera style={{ width: 30, height: 30, color: '#10b981', flexShrink: 0 }} />
            Tirar Foto do Produto
          </button>

          <button
            onClick={() => sendResult('cancelled', 'cancelled')}
            style={{
              marginTop: '4px',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px',
              touchAction: 'manipulation',
            }}
          >
            <X style={{ width: 14, height: 14 }} />
            Cancelar
          </button>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhotoSelected}
          />
        </div>
      )}

      {state === 'uploading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 style={{ color: '#4F8EF7', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>A enviar foto...</p>
        </div>
      )}

      {state === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
          <AlertCircle style={{ color: '#ef4444', width: 52, height: 52 }} />
          <p style={{ color: '#ef4444', fontSize: '18px', fontWeight: 600, margin: 0 }}>Erro</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', maxWidth: '280px', margin: 0 }}>{errorMsg}</p>
        </div>
      )}

      {state === 'expired' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
          <AlertCircle style={{ color: '#f59e0b', width: 52, height: 52 }} />
          <p style={{ color: '#f59e0b', fontSize: '18px', fontWeight: 600, margin: 0 }}>Sessão expirada</p>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Gera um novo QR code no computador.</p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
