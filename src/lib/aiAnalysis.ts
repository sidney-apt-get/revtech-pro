export interface GeminiResult {
  category_slug: string
  confidence: number
  brand: string
  model: string
  year_manufactured: number | null
  color: string | null
  storage_gb: number | null
  ram_gb: number | null
  battery_mah: number | null
  power_watts: number | null
  screen_size_inches: number | null
  cpu_model: string | null
  gpu_model: string | null
  serial_number: string | null
  imei: string | null
  visible_damage: string[]
  suggested_defect: string | null
  condition_grade: 'A' | 'B' | 'C' | 'D'
  notes: string
}

export interface BarcodeResult {
  name?: string
  brand?: string
  model?: string
  imageUrl?: string
  specs?: Record<string, string>
}

import { supabase } from '@/lib/supabase'

export async function analyzeWithGemini(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyze', {
      body: { imageBase64, mimeType },
    })
    if (error) throw error
    if (!data || data.error) {
      console.error('Edge function error:', data?.error ?? 'unknown')
      return null
    }
    return data as GeminiResult
  } catch (err) {
    console.error('Gemini analysis failed:', err)
    return null
  }
}

export async function lookupBarcodeExtended(barcode: string): Promise<BarcodeResult | null> {
  // 15-digit IMEI
  if (/^\d{15}$/.test(barcode)) {
    return { name: `IMEI: ${barcode}`, specs: { imei: barcode } }
  }

  // EAN/UPC lookup via Open EAN Database
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null
    return {
      name: item.title,
      brand: item.brand,
      model: item.model,
      imageUrl: item.images?.[0],
      specs: { description: item.description },
    }
  } catch {
    return null
  }
}

export async function lookupSerialNumber(
  brand: string,
  serial: string
): Promise<{ model?: string; manufactureDate?: string; warranty?: string } | null> {
  const b = brand.toLowerCase()

  // Apple check-coverage redirect (cannot do CORS, so just return the URL)
  if (b.includes('apple')) {
    return { model: `Serial: ${serial}`, warranty: `https://checkcoverage.apple.com/?sn=${serial}` }
  }
  if (b.includes('dell')) {
    return { model: `Serial: ${serial}`, warranty: `https://www.dell.com/support/home/en-gb?ServiceTag=${serial}` }
  }
  if (b.includes('lenovo')) {
    return { model: `Serial: ${serial}`, warranty: `https://pcsupport.lenovo.com/gb/en/warranty-lookup?SN=${serial}` }
  }
  if (b.includes('hp') || b.includes('hewlett')) {
    return { model: `Serial: ${serial}`, warranty: `https://support.hp.com/us-en/checkwarranty/?serialNumber=${serial}` }
  }

  return null
}

export function mergeAiResults(
  gemini: GeminiResult | null,
  barcode: BarcodeResult | null,
  serial: { model?: string; manufactureDate?: string; warranty?: string } | null
): Partial<GeminiResult> & { warranty_url?: string } {
  if (!gemini && !barcode) return {}

  const base: Partial<GeminiResult> & { warranty_url?: string } = gemini ?? {
    category_slug: 'generic-equipment',
    confidence: 0,
    brand: '',
    model: '',
    year_manufactured: null,
    color: null,
    storage_gb: null,
    ram_gb: null,
    battery_mah: null,
    power_watts: null,
    screen_size_inches: null,
    cpu_model: null,
    gpu_model: null,
    serial_number: null,
    imei: null,
    visible_damage: [],
    suggested_defect: null,
    condition_grade: 'C',
    notes: '',
  }

  // Barcode data supplements but doesn't override Gemini
  if (barcode) {
    if (!base.brand && barcode.brand) base.brand = barcode.brand
    if (!base.model && barcode.model) base.model = barcode.model
  }

  // Serial lookup supplements model info
  if (serial?.warranty) base.warranty_url = serial.warranty

  return base
}
