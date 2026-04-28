import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { analyzeWithGemini, type GeminiResult } from '@/lib/aiAnalysis'
import { lookupBarcode } from '@/lib/productLookup'

export type PairingState = 'idle' | 'waiting' | 'paired' | 'analysing' | 'done'

export interface FilledFields {
  equipment?: string
  brand?: string
  model?: string
  serial_number?: string
  imei?: string
  category_slug?: string
  color?: string
  storage_gb?: number
  ram_gb?: number
  battery_mah_original?: number
  screen_size?: number
  cpu_model?: string
  gpu_model?: string
  year_manufactured?: number
  condition_grade?: string
  obs_recepcao?: string
  [key: string]: unknown
}

const STORAGE_KEY = 'revtech_scanner_token'
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000

function buildFields(gemini: GeminiResult): FilledFields {
  const fields: FilledFields = {}
  const equipment = [gemini.brand, gemini.model].filter(Boolean).join(' ')
  if (equipment) fields.equipment = equipment
  if (gemini.brand) fields.brand = gemini.brand
  if (gemini.model) fields.model = gemini.model
  if (gemini.serial_number) fields.serial_number = gemini.serial_number
  if (gemini.imei) fields.imei = gemini.imei
  if (gemini.category_slug) fields.category_slug = gemini.category_slug
  if (gemini.color) fields.color = gemini.color
  if (gemini.storage_gb) fields.storage_gb = gemini.storage_gb
  if (gemini.ram_gb) fields.ram_gb = gemini.ram_gb
  if (gemini.battery_mah) fields.battery_mah_original = gemini.battery_mah
  if (gemini.screen_size_inches) fields.screen_size = gemini.screen_size_inches
  if (gemini.cpu_model) fields.cpu_model = gemini.cpu_model
  if (gemini.gpu_model) fields.gpu_model = gemini.gpu_model
  if (gemini.year_manufactured) fields.year_manufactured = gemini.year_manufactured
  if (gemini.condition_grade) fields.condition_grade = gemini.condition_grade
  const damage = gemini.visible_damage?.join(', ')
  if (damage) fields.obs_recepcao = damage
  return fields
}

export function usePairedScanner(onFieldsFilled: (fields: FilledFields) => void) {
  const [state, setState] = useState<PairingState>('idle')
  const [token, setToken] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [lastActive, setLastActive] = useState<Date | null>(null)
  const [fieldCount, setFieldCount] = useState(0)
  const [confidence, setConfidence] = useState(0)
  const [detectedProduct, setDetectedProduct] = useState('')
  const [progress, setProgress] = useState(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const processedPhotoRef = useRef<string | null>(null)
  const processedBarcodeRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  const resetToPhoto = useCallback(async (tok: string) => {
    await supabase
      .from('camera_sessions')
      .update({ status: 'waiting', photo_url: null, barcode: null, last_active: new Date().toISOString() })
      .eq('session_token', tok)
    processedPhotoRef.current = null
    processedBarcodeRef.current = null
  }, [])

  const processPhoto = useCallback(async (photoUrl: string, tok: string) => {
    if (processedPhotoRef.current === photoUrl) return
    processedPhotoRef.current = photoUrl
    setState('analysing')
    setProgress(0)

    const interval = setInterval(() => setProgress(p => Math.min(p + 12, 88)), 400)
    try {
      const resp = await fetch(photoUrl)
      const blob = await resp.blob()
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })
      const result = await analyzeWithGemini(base64, blob.type || 'image/jpeg')
      clearInterval(interval)
      setProgress(100)

      if (result) {
        const fields = buildFields(result)
        const count = Object.values(fields).filter(v => v !== undefined && v !== null && v !== '').length
        setFieldCount(count)
        setConfidence(result.confidence)
        setDetectedProduct([result.brand, result.model].filter(Boolean).join(' '))
        setState('done')
        onFieldsFilled(fields)
      } else {
        setState('paired')
      }
    } catch {
      clearInterval(interval)
      setState('paired')
    }
    await resetToPhoto(tok)
  }, [onFieldsFilled, resetToPhoto])

  const processBarcode = useCallback(async (barcode: string, tok: string) => {
    if (processedBarcodeRef.current === barcode) return
    processedBarcodeRef.current = barcode
    setLastActive(new Date())

    const info = await lookupBarcode(barcode)
    if (info) {
      const fields: FilledFields = {}
      if (info.name) fields.equipment = info.name
      if (info.brand) fields.brand = info.brand
      if (info.model) fields.model = info.model
      const count = Object.values(fields).filter(Boolean).length
      setFieldCount(count)
      setConfidence(0)
      setDetectedProduct(info.name ?? barcode)
      setState('done')
      onFieldsFilled(fields)
    }
    await resetToPhoto(tok)
  }, [onFieldsFilled, resetToPhoto])

  const subscribe = useCallback((tok: string) => {
    cleanup()
    const ch = supabase
      .channel(`scanner-paired-${tok}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'camera_sessions', filter: `session_token=eq.${tok}` },
        (payload) => {
          const row = payload.new as {
            status: string
            photo_url: string | null
            paired: boolean
            device_name: string | null
            last_active: string | null
            barcode: string | null
          }
          if (row.paired && row.device_name) {
            setDeviceName(row.device_name)
            setState('paired')
          }
          if (row.last_active) setLastActive(new Date(row.last_active))
          if (row.photo_url && row.status === 'photo_taken') {
            processPhoto(row.photo_url, tok)
          }
          if (row.barcode) {
            processBarcode(row.barcode, tok)
          }
        }
      )
      .subscribe()
    channelRef.current = ch
  }, [cleanup, processPhoto, processBarcode])

  const createPairingSession = useCallback(async () => {
    cleanup()
    const tok = crypto.randomUUID().replace(/-/g, '')
    setToken(tok)
    setState('waiting')
    setDeviceName(null)
    setLastActive(null)
    setFieldCount(0)
    processedPhotoRef.current = null
    processedBarcodeRef.current = null
    localStorage.setItem(STORAGE_KEY, tok)

    const { data: { user } } = await supabase.auth.getUser()
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
    await supabase.from('camera_sessions').insert({
      session_token: tok,
      context: 'project',
      user_id: user!.id,
      session_type: 'paired',
      expires_at: expiresAt,
    })
    subscribe(tok)
    return tok
  }, [cleanup, subscribe])

  const disconnect = useCallback(async () => {
    if (token) {
      await supabase
        .from('camera_sessions')
        .update({ status: 'expired', paired: false })
        .eq('session_token', token)
      localStorage.removeItem(STORAGE_KEY)
    }
    cleanup()
    setToken(null)
    setState('idle')
    setDeviceName(null)
    setLastActive(null)
  }, [token, cleanup])

  const newPhoto = useCallback(() => {
    setState('paired')
    setFieldCount(0)
    setDetectedProduct('')
  }, [])

  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY)
    if (!savedToken) return
    ;(async () => {
      const { data } = await supabase
        .from('camera_sessions')
        .select('*')
        .eq('session_token', savedToken)
        .eq('session_type', 'paired')
        .neq('status', 'expired')
        .single()
      if (data && new Date(data.expires_at) > new Date()) {
        setToken(savedToken)
        if (data.paired) {
          setState('paired')
          setDeviceName(data.device_name)
          if (data.last_active) setLastActive(new Date(data.last_active))
        } else {
          setState('waiting')
        }
        subscribe(savedToken)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    })()
    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state,
    token,
    deviceName,
    lastActive,
    fieldCount,
    confidence,
    detectedProduct,
    progress,
    createPairingSession,
    disconnect,
    newPhoto,
  }
}
