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

    const body = await req.json()
    console.log('[AI Analyze] Request type:', body.type ?? 'image')
    console.log('[AI Analyze] Has image:', !!body.imageBase64)

    // Translation request
    if (body.type === 'translate') {
      const prompt = `Translate the following text to ${body.targetLanguage}.
Return ONLY the translated text, nothing else. Do not add explanations or quotes.

Text to translate:
${body.text}`

      const geminiRes = await fetch(
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
      if (!geminiRes.ok) {
        return new Response(JSON.stringify({ error: 'Translation failed' }), {
          status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }
      const tData = await geminiRes.json()
      const result = tData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      return new Response(JSON.stringify({ result: result.trim() }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { imageBase64: rawBase64, mimeType = 'image/jpeg' } = body
    if (!rawBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const imageBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '')

    const payload = {
      contents: [{
        parts: [
          { text: GEMINI_PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    console.log('[AI] Calling Gemini API...')
    console.log('[AI] Model: gemini-2.5-flash')
    console.log('[AI] Image size:', imageBase64.length)
    console.log('[AI] Payload size:', JSON.stringify(payload).length)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

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
        console.log('[AI] Request timed out after 25s')
        return new Response(
          JSON.stringify({ error: 'Gemini timeout' }),
          { status: 504, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
      console.log('[AI] Fetch error:', err.message)
      throw err
    }

    console.log('[AI] Gemini status:', geminiRes.status)
    const responseText = await geminiRes.text()
    console.log('[AI] Gemini response:', responseText.slice(0, 500))

    if (geminiRes.status !== 200) {
      return new Response(
        JSON.stringify({
          error: 'Gemini error',
          status: geminiRes.status,
          detail: responseText.slice(0, 200),
        }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const data = JSON.parse(responseText)
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'No JSON in Gemini response', raw: text }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const result = JSON.parse(jsonMatch[0])
    // PhotoAnalyzeButton uses type:'analyze_image' and expects { result: ... }
    // analyzeWithGemini (SmartCameraButton) calls without type and expects direct object
    if (body.type === 'analyze_image') {
      return new Response(
        JSON.stringify({ result }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }
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
