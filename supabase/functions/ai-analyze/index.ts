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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
          }),
        }
      )
    