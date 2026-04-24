import { supabase } from './supabase'

export interface BackMarketItem {
  id: string
  title: string
  price: number
  currency: string
  grade: string
  gradeId: number
  imageUrl: string
  itemWebUrl: string
  seller: string
  reviewCount: number
  reviewRating: number
  shippingCost: number | null
  category: string
}

export interface BackMarketSearchResult {
  items: BackMarketItem[]
  total: number
  mock?: boolean
}

const MOCK_ITEMS: BackMarketItem[] = [
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
  {
    id: 'bm-demo-004',
    title: 'iPad Pro 11" M1 2021 — 128GB WiFi',
    price: 399,
    currency: 'GBP',
    grade: 'Excellent',
    gradeId: 2,
    imageUrl: 'https://placehold.co/300x200/1a1d27/22c55e?text=iPad+Pro+11',
    itemWebUrl: 'https://www.backmarket.co.uk',
    seller: 'EcoTech Solutions',
    reviewCount: 891,
    reviewRating: 4.6,
    shippingCost: 0,
    category: 'Tablets',
  },
  {
    id: 'bm-demo-005',
    title: 'Sony WH-1000XM4 Wireless Headphones — Black',
    price: 159,
    currency: 'GBP',
    grade: 'Good',
    gradeId: 3,
    imageUrl: 'https://placehold.co/300x200/1a1d27/22c55e?text=Sony+XM4',
    itemWebUrl: 'https://www.backmarket.co.uk',
    seller: 'AudioRefurb UK',
    reviewCount: 567,
    reviewRating: 4.5,
    shippingCost: 0,
    category: 'Audio',
  },
  {
    id: 'bm-demo-006',
    title: 'Apple MacBook Air 13" M2 2022 — Midnight',
    price: 749,
    currency: 'GBP',
    grade: 'Premium',
    gradeId: 1,
    imageUrl: 'https://placehold.co/300x200/1a1d27/22c55e?text=MacBook+Air+M2',
    itemWebUrl: 'https://www.backmarket.co.uk',
    seller: 'AppleRefurb Scotland',
    reviewCount: 432,
    reviewRating: 4.9,
    shippingCost: 0,
    category: 'Laptops',
  },
]

export async function searchBackMarketListings(
  query: string,
  maxPrice?: number,
  grade?: string,
  category?: string,
): Promise<BackMarketSearchResult> {
  const { data, error } = await supabase.functions.invoke('backmarket-search', {
    body: { query, maxPrice, grade, category },
  })

  if (error) {
    return { items: MOCK_ITEMS, total: MOCK_ITEMS.length, mock: true }
  }

  if (data?.mock) {
    return { items: data.items ?? MOCK_ITEMS, total: (data.items ?? MOCK_ITEMS).length, mock: true }
  }

  return {
    items: (data?.results ?? []).map(mapBackMarketItem),
    total: data?.count ?? 0,
    mock: false,
  }
}

function mapBackMarketItem(raw: Record<string, unknown>): BackMarketItem {
  const price = raw.price as { amount?: string; currency?: string } | number | undefined
  const priceValue = typeof price === 'number'
    ? price
    : parseFloat((price as { amount?: string })?.amount ?? '0')

  return {
    id: String(raw.id ?? raw.listing_id ?? ''),
    title: String(raw.title ?? raw.product_title ?? ''),
    price: priceValue,
    currency: 'GBP',
    grade: String(raw.grade ?? raw.condition ?? ''),
    gradeId: Number(raw.grade_id ?? 0),
    imageUrl: String(raw.image ?? raw.main_image ?? raw.image_url ?? ''),
    itemWebUrl: String(raw.listing_url ?? raw.url ?? 'https://www.backmarket.co.uk'),
    seller: String(raw.merchant_name ?? raw.seller ?? ''),
    reviewCount: Number(raw.review_count ?? raw.reviews_count ?? 0),
    reviewRating: Number(raw.review_rating ?? raw.average_rating ?? 0),
    shippingCost: raw.shipping_price != null ? Number(raw.shipping_price) : 0,
    category: String(raw.category ?? ''),
  }
}
