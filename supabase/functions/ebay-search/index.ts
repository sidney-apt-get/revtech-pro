// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const APP_ID = Deno.env.get('EBAY_APP_ID')
const CERT_ID = Deno.env.get('EBAY_CERT_ID')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOCK_ITEMS = [
  {
    itemId: 'demo-001',
    title: 'Apple MacBook Pro 13" M1 2020 — Cracked Screen — For Parts',
    price: { value: '180', currency: 'GBP' },
    condition: 'For parts or not working',
    conditionId: '7000',
    image: { imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=MacBook+M1' },
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: { username: 'tech_parts_uk', feedbackScore: 2341 },
    shippingOptions: [{ shippingCost: { value: '0', currency: 'GBP' } }],
    buyingOptions: ['FIXED_PRICE'],
    watchCount: 47,
  },
  {
    itemId: 'demo-002',
    title: 'iPhone 12 Pro 128GB — LCD Damage — Untested — Spares',
    price: { value: '95', currency: 'GBP' },
    condition: 'For parts or not working',
    conditionId: '7000',
    image: { imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=iPhone+12+Pro' },
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: { username: 'mobile_salvage_ltd', feedbackScore: 5892 },
    shippingOptions: [{ shippingCost: { value: '3.99', currency: 'GBP' } }],
    buyingOptions: ['FIXED_PRICE'],
    watchCount: 23,
  },
  {
    itemId: 'demo-003',
    title: 'Samsung Galaxy S22 Ultra — Water Damage — Motherboard Fault',
    price: { value: '65', currency: 'GBP' },
    condition: 'For parts or not working',
    conditionId: '7000',
    image: { imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=Galaxy+S22+Ultra' },
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: { username: 'phone_recyclers_uk', feedbackScore: 1204 },
    shippingOptions: [{ shippingCost: { value: '0', currency: 'GBP' } }],
    buyingOptions: ['AUCTION'],
    watchCount: 12,
    bidCount: 5,
  },
]

async function getAppToken(): Promise<string | null> {
  if (!APP_ID || !CERT_ID) return null
  const credentials = btoa(`${APP_ID}:${CERT_ID}`)
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { query, maxPrice, condition, category } = await req.json()

    if (!APP_ID || !CERT_ID) {
      return new Response(JSON.stringify({ mock: true, itemSummaries: MOCK_ITEMS, total: MOCK_ITEMS.length }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const token = await getAppToken()
    if (!token) {
      return new Response(JSON.stringify({ mock: true, itemSummaries: MOCK_ITEMS, total: MOCK_ITEMS.length }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const filters: string[] = ['buyingOptions:{FIXED_PRICE|AUCTION}']
    if (maxPrice) filters.push(`price:[..${maxPrice}],priceCurrency:GBP`)
    if (condition) filters.push(`conditionIds:{${condition}}`)

    const params = new URLSearchParams({
      q: query ?? '',
      limit: '20',
      filter: filters.join(','),
    })
    if (category) params.set('category_ids', category)

    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
        },
      }
    )
    const data: any = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
