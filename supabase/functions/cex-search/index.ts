import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { q } = await req.json() as { q: string }
    if (!q || q.trim().length < 2) {
      return new Response(JSON.stringify({ boxes: [] }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const url = `https://wss2.cex.uk.webuy.io/v3/boxes?q=${encodeURIComponent(q)}&inStockOnline=1&firstRecord=0&count=5&sortBy=relevance&sortOrder=desc`

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; RevTech/1.0)',
      },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ boxes: [], error: `CeX API ${res.status}` }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const boxes = (data?.response?.data?.boxes ?? []).map((b: Record<string, unknown>) => ({
      boxId: b.boxId,
      boxName: b.boxName,
      categoryName: b.categoryName,
      sellPrice: b.sellPrice,
      exchangePrice: b.exchangePrice,
      cashPrice: b.cashPrice,
      thumbnailUrl: b.thumbnailUrl,
      boxLink: `https://uk.webuy.com/product-detail?id=${b.boxId}`,
    }))

    return new Response(JSON.stringify({ boxes }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ boxes: [], error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
