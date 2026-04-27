import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { imageBase64, mimeType = 'image/jpeg' } = await req.json()
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const geminiRes = await fetch(
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return new Response(
        JSON.stringify({ error: `Gemini error ${geminiRes.status}`, detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const data = await geminiRes.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'No JSON in Gemini response', raw: text }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const result = JSON.parse(jsonMatch[0])
    return new Response(
      JSON.stringify(result),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
