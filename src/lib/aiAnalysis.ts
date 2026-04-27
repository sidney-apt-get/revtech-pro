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

const GEMINI_PROMPT = `Analyse this image of an electronic device or component.
Identify the product and return ONLY valid JSON with this exact structure (no text outside JSON):
{
  "category_slug": "(one of: audio-amplifier, audio-turntable, mobile-iphone, mobile-android-flagship, mobile-ipad, laptop-windows, laptop-macbook-pro, laptop-macbook-air, desktop-imac, desktop-windows-tower, console-playstation, console-xbox, console-nintendo-home, console-nintendo-portable, console-controller, desktop-cpu, desktop-gpu, laptop-ram, laptop-ssd, peripheral-monitor, audio-tubes, audio-capacitors, audio-belt, audio-needle, laptop-battery, laptop-screen, laptop-motherboard, desktop-motherboard, desktop-psu, console-optical, console-fan, mobile-screen, mobile-battery, mobile-motherboard, mobile-camera, mobile-charging-port, consumable-solder, consumable-thermal, tool-soldering, tool-multimeter, tool-oscilloscope, tool-hotair, generic-equipment, generic-part)",
  "confidence": 0-100,
  "brand": "string",
  "model": "string",
  "year_manufactured": number or null,
  "color": "string or null",
  "storage_gb": number or null,
  "ram_gb": number or null,
  "battery_mah": number or null,
  "power_watts": number or null,
  "screen_size_inches": number or null,
  "cpu_model": "string or null",
  "gpu_model": "string or null",
  "serial_number": "string or null (only if visible on label)",
  "imei": "string or null (only if visible)",
  "visible_damage": ["array of visible damage descriptions"],
  "suggested_defect": "string or null",
  "condition_grade": "A, B, C, or D",
  "notes": "string"
}`

export async function analyzeWithGemini(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiResult | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY not set')
    return null
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: GEMINI_PROMPT },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as GeminiResult
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
