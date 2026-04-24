// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const API_KEY = Deno.env.get('BACKMARKET_API_KEY')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOCK_ITEMS = [
  {
    id: 'bm-demo-001',
    title: 'Apple MacBook Pro 13" M1 2020 — 8GB/256GB',
    price: 649,
    currency: 'GBP',
    grade: 'Excellent',
    gradeId: 2,
    imageUrl: 'https://placehold.co/300x200/1a1d27/22c55e?text=MacBook+M1',
    itemWebUrl: 'https://www.backmarket.co.uk',
    seller: 'BackMarket Seller',
    reviewCount: 1243,
    reviewRating: 4.8,
    shippingCost: 0,
    category: 'Laptops',
  },
  {
    id: 'bm-demo-002',
    title: 'iPhone 13 Pro 128GB — Sierra Blue',
    price: 489,
    currency: 'GBP',
    grade: 'Good',
    gradeId: 3,
    imageUrl: 'https://placehold.co/300x200/1a1d27/22c55e?text=iPhone+13+Pro',
    itemWebUrl: 'https://www.backmarket.co.uk',
    seller: 'RefurbPro UK',
    reviewCount: 3892,
    reviewRating: 4.7,
    shippingCost: 0,
    category: 'Smartphones',
  },
  {
    id: 'bm-demo-003',
    title: 'Samsung Galaxy S22 Ultra 256GB — Phantom Black',
    price: 519,
    currency: 'GBP',
    grade: 'Premium',
    gradeId: 1,
    imageUrl: 'https://placehold.co/300x200/1a1d27/22c55e?text=Galaxy+S22',
    itemWebUrl: 'https://www.backmarket.co.uk',
    seller: 'GreenTech Refurb',
    reviewCount: 2104,
    reviewRating: 4.9,
    shippingCost: 0,
    category: 'Smartphones',
  },
]

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { query, maxPrice, grade, category } = await req.json()

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ mock: true, items: MOCK_ITEMS, count: MOCK_ITEMS.length }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const params = new URLSearchParams({
      q: query ?? '',
      page_size: '20',
      country_code: 'GB',
    })
    if (maxPrice) params.set('max_price', String(maxPrice))
    if (grade) params.set('grade', grade)
    if (category) params.set('category_id', category)

    const res = await fetch(
      `https://api.backmarket.com/api/v2/catalog/listings/?${params}`,
      {
        headers: {
          Authorization: `Basic ${API_KEY}`,
          Accept: 'application/json',
          'Accept-Language': 'en-gb',
          'X-Country': 'GB',
        },
      },
    )

    if (!res.ok) {
      return new Response(
        JSON.stringify({ mock: true, items: MOCK_ITEMS, count: MOCK_ITEMS.length }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

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
