import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Category slugs ────────────────────────────────────────────────────────────
const CATEGORY_SLUGS = [
  'audio-amplifier', 'audio-turntable', 'audio-speakers', 'audio-tubes',
  'mobile-iphone', 'mobile-android-flagship', 'mobile-ipad', 'mobile-ereader',
  'mobile-screen', 'mobile-battery', 'mobile-motherboard', 'mobile-camera', 'mobile-charging-port',
  'laptop-windows', 'laptop-macbook-pro', 'laptop-macbook-air',
  'laptop-screen', 'laptop-battery', 'laptop-ram', 'laptop-ssd', 'laptop-charger', 'laptop-motherboard',
  'desktop-imac', 'desktop-windows-tower', 'desktop-cpu', 'desktop-gpu', 'desktop-motherboard', 'desktop-psu',
  'console-playstation', 'console-xbox', 'console-nintendo-home', 'console-nintendo-portable',
  'console-controller', 'console-optical', 'console-fan',
  'peripheral-monitor', 'peripheral-printer',
  'consumable-solder', 'consumable-flux', 'consumable-thermal',
  'tool-soldering', 'tool-multimeter', 'tool-oscilloscope', 'tool-hotair',
  'generic-equipment', 'generic-part',
].join(', ')

// ── Structured JSON schema (Gemini responseSchema format) ─────────────────────
// No nullable fields (causes issues in some Gemini versions)
// No enum constraints (model uses prompt guidance instead)
const ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    category_slug:        { type: 'STRING',  description: `One of: ${CATEGORY_SLUGS}` },
    confidence:           { type: 'NUMBER',  description: 'Identification confidence 0-100' },
    brand:                { type: 'STRING',  description: 'Manufacturer brand name' },
    model:                { type: 'STRING',  description: 'Specific model name and number' },
    year_manufactured:    { type: 'NUMBER',  description: 'Year of manufacture, or 0 if unknown' },
    color:                { type: 'STRING',  description: 'Main colour, or empty string if unknown' },
    storage_gb:           { type: 'NUMBER',  description: 'Storage in GB, or 0 if not applicable' },
    ram_gb:               { type: 'NUMBER',  description: 'RAM in GB, or 0 if not applicable' },
    battery_mah:          { type: 'NUMBER',  description: 'Battery in mAh, or 0 if not applicable' },
    power_watts:          { type: 'NUMBER',  description: 'Power in watts, or 0 if not applicable' },
    screen_size_inches:   { type: 'NUMBER',  description: 'Screen diagonal in inches, or 0 if not applicable' },
    cpu_model:            { type: 'STRING',  description: 'CPU model name, or empty string' },
    gpu_model:            { type: 'STRING',  description: 'GPU model name, or empty string' },
    serial_number:        { type: 'STRING',  description: 'Serial number if visible on label, else empty string' },
    imei:                 { type: 'STRING',  description: 'IMEI if visible in image, else empty string' },
    visible_damage:       { type: 'ARRAY',   items: { type: 'STRING' }, description: 'List of all visible damage items' },
    suggested_defect:     { type: 'STRING',  description: 'Most likely functional fault, or empty string' },
    condition_grade:      { type: 'STRING',  description: 'A (near-mint), B (light wear), C (visible damage), or D (heavy damage/non-functional)' },
    estimated_value_gbp:  { type: 'NUMBER',  description: 'Current UK resale value in GBP for working refurbished unit, or 0 if unknown' },
    repair_complexity:    { type: 'STRING',  description: 'simple, moderate, complex, or unknown' },
    notes:                { type: 'STRING',  description: 'Expert observations, repair tips, common failure modes' },
  },
  required: [
    'category_slug', 'confidence', 'brand', 'model', 'condition_grade',
    'visible_damage', 'notes', 'estimated_value_gbp', 'repair_complexity'
  ],
}

// ── Expert prompt ─────────────────────────────────────────────────────────────
const GEMINI_IMAGE_PROMPT = `You are a senior electronics repair technician and appraiser with 20+ years of experience.
You work for a UK repair shop that buys defective electronics, repairs them, and resells via CeX, Back Market, and eBay UK.

Analyse this image of an electronic device or component with expert precision:

1. IDENTIFICATION — Exact brand, model, variant/SKU. Use logos, ports, design, bezels, buttons, materials.
2. SPECIFICATIONS — Extract visible specs; infer the rest from the confirmed model.
3. CONDITION — Grade A/B/C/D: A=near-mint, B=light wear, C=visible damage, D=heavy damage/non-functional.
4. DAMAGE — List every visible defect, scratch, crack, discolouration, missing part.
5. REPAIR — If damaged: identify most probable fault and complexity (simple/moderate/complex/unknown).
6. VALUATION — Current UK market value in GBP for a fully working refurbished unit (CeX/Back Market/eBay UK reference).
7. LABELS — Transcribe serial number or IMEI exactly if visible on any label.

Use 0 for numeric fields that don't apply. Use empty string for text fields that don't apply.
Be accurate — a lower confidence score is better than a wrong answer.`

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const requestType = body.type ?? 'analyze_image'
    console.log('[AI Analyze] type:', requestType)

    // ── TRANSLATION (flash — fast) ────────────────────────────────────────────
    if (requestType === 'translate') {
      const prompt = `Translate the following text to ${body.targetLanguage}.\nReturn ONLY the translated text, nothing else.\n\n${body.text}`
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
          }),
        }
      )
      if (!r.ok) {
        const e = await r.text()
        console.error('[Translate] Gemini error:', r.status, e.slice(0, 300))
        return new Response(JSON.stringify({ error: 'Translation failed', detail: e.slice(0, 200) }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }
      const d = await r.json()
      const result = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      return new Response(JSON.stringify({ result: result.trim() }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // ── IMAGE ANALYSIS ────────────────────────────────────────────────────────
    const { imageBase64: rawBase64, mimeType = 'image/jpeg' } = body
    if (!rawBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const imageBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '')

    // Model: gemini-3.1-flash-lite (GA) — migrated from pre-release 2026-05-15
    // thinkingBudget:0 prevents the 25-60s thinking delay that caused prior timeouts
    const model = 'gemini-3.1-flash-lite'
    const payload = {
      contents: [{
        parts: [
          { text: GEMINI_IMAGE_PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: ANALYSIS_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    console.log('[AI] model:', model, '| image length:', imageBase64.length)

    const TIMEOUT_MS = 30_000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let geminiRes: Response
    try {
      geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        console.error('[AI] Timed out after', TIMEOUT_MS, 'ms')
        return new Response(
          JSON.stringify({ error: 'timeout', message: 'Analysis timed out — try again' }),
          { status: 504, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
      throw err
    }

    const responseText = await geminiRes.text()
    console.log('[AI] Gemini status:', geminiRes.status)
    console.log('[AI] Response (first 600):', responseText.slice(0, 600))

    if (geminiRes.status !== 200) {
      let detail = responseText.slice(0, 400)
      try { detail = JSON.parse(responseText)?.error?.message ?? detail } catch { /**/ }
      console.error('[AI] Gemini error:', geminiRes.status, detail)
      return new Response(
        JSON.stringify({ error: 'Gemini API error', status: geminiRes.status, detail }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const data = JSON.parse(responseText)
    const parts: { text?: string }[] = data.candidates?.[0]?.content?.parts ?? []
    const finishReason: string = data.candidates?.[0]?.finishReason ?? 'UNKNOWN'

    // Find the JSON part (last text part — thinking output comes first if any)
    let rawJson = ''
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].text) { rawJson = parts[i].text!; break }
    }

    if (!rawJson) {
      console.error('[AI] Empty response. finishReason:', finishReason)
      return new Response(
        JSON.stringify({ error: 'Empty response from Gemini', finishReason }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    let result: Record<string, unknown>
    try {
      result = JSON.parse(rawJson)
    } catch {
      const m = rawJson.match(/```json\s*([\s\S]*?)```/) ?? rawJson.match(/\{[\s\S]*\}/)
      if (!m) {
        return new Response(
          JSON.stringify({ error: 'Could not parse JSON from Gemini', raw: rawJson.slice(0, 400) }),
          { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
      result = JSON.parse(m[1] ?? m[0])
    }

    // Normalise: convert 0 back to null for optional numeric fields
    const nullIfZero = (v: unknown) => (v === 0 ? null : v)
    result.year_manufactured   = nullIfZero(result.year_manufactured)
    result.storage_gb          = nullIfZero(result.storage_gb)
    result.ram_gb              = nullIfZero(result.ram_gb)
    result.battery_mah         = nullIfZero(result.battery_mah)
    result.power_watts         = nullIfZero(result.power_watts)
    result.screen_size_inches  = nullIfZero(result.screen_size_inches)
    result.estimated_value_gbp = nullIfZero(result.estimated_value_gbp)
    // Normalise: convert empty strings to null for optional text fields
    const nullIfEmpty = (v: unknown) => (v === '' ? null : v)
    result.color             = nullIfEmpty(result.color)
    result.cpu_model         = nullIfEmpty(result.cpu_model)
    result.gpu_model         = nullIfEmpty(result.gpu_model)
    result.serial_number     = nullIfEmpty(result.serial_number)
    result.imei              = nullIfEmpty(result.imei)
    result.suggested_defect  = nullIfEmpty(result.suggested_defect)

    console.log('[AI] ✓', result.brand, result.model,
      '| conf:', result.confidence, '| grade:', result.condition_grade,
      '| £', result.estimated_value_gbp ?? 'n/a')

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[AI] Unhandled error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
