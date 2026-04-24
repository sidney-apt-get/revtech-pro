import { supabase } from './supabase'

export interface EbayItem {
  itemId: string
  title: string
  price: number
  currency: string
  condition: string
  conditionId: string
  imageUrl: string
  itemWebUrl: string
  seller: string
  sellerFeedbackScore: number
  shippingCost: number | null
  buyingOptions: string[]
  watchCount?: number
  listingType: 'BUY_IT_NOW' | 'AUCTION'
  bidCount?: number
  endDate?: string
}

export interface EbaySearchResult {
  items: EbayItem[]
  total: number
  mock?: boolean
}

const MOCK_ITEMS: EbayItem[] = [
  {
    itemId: 'demo-001',
    title: 'Apple MacBook Pro 13" M1 2020 — Cracked Screen — For Parts',
    price: 180,
    currency: 'GBP',
    condition: 'For parts or not working',
    conditionId: '7000',
    imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=MacBook+M1',
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: 'tech_parts_uk',
    sellerFeedbackScore: 2341,
    shippingCost: 0,
    buyingOptions: ['FIXED_PRICE'],
    watchCount: 47,
    listingType: 'BUY_IT_NOW',
  },
  {
    itemId: 'demo-002',
    title: 'iPhone 12 Pro 128GB — LCD Damage — Untested — Spares',
    price: 95,
    currency: 'GBP',
    condition: 'For parts or not working',
    conditionId: '7000',
    imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=iPhone+12+Pro',
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: 'mobile_salvage_ltd',
    sellerFeedbackScore: 5892,
    shippingCost: 3.99,
    buyingOptions: ['FIXED_PRICE'],
    watchCount: 23,
    listingType: 'BUY_IT_NOW',
  },
  {
    itemId: 'demo-003',
    title: 'Samsung Galaxy S22 Ultra — Water Damage — Motherboard Fault',
    price: 65,
    currency: 'GBP',
    condition: 'For parts or not working',
    conditionId: '7000',
    imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=Galaxy+S22+Ultra',
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: 'phone_recyclers_uk',
    sellerFeedbackScore: 1204,
    shippingCost: 0,
    buyingOptions: ['AUCTION'],
    watchCount: 12,
    listingType: 'AUCTION',
    bidCount: 5,
    endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
  },
  {
    itemId: 'demo-004',
    title: 'Apple MacBook Air 13" M2 2022 — Battery Fault — Powers On',
    price: 320,
    currency: 'GBP',
    condition: 'Used',
    conditionId: '3000',
    imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=MacBook+Air+M2',
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: 'apple_refurb_scotland',
    sellerFeedbackScore: 789,
    shippingCost: 0,
    buyingOptions: ['FIXED_PRICE'],
    watchCount: 89,
    listingType: 'BUY_IT_NOW',
  },
  {
    itemId: 'demo-005',
    title: 'Sony WH-1000XM5 Headphones — Right Driver Fault — Spares',
    price: 45,
    currency: 'GBP',
    condition: 'For parts or not working',
    conditionId: '7000',
    imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=Sony+XM5',
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: 'audio_parts_depot',
    sellerFeedbackScore: 3421,
    shippingCost: 2.99,
    buyingOptions: ['FIXED_PRICE'],
    watchCount: 31,
    listingType: 'BUY_IT_NOW',
  },
  {
    itemId: 'demo-006',
    title: 'iPad Pro 11" 3rd Gen — Touch ID Fault — Screen Perfect',
    price: 210,
    currency: 'GBP',
    condition: 'Used',
    conditionId: '3000',
    imageUrl: 'https://placehold.co/300x200/1a1d27/4F8EF7?text=iPad+Pro+11',
    itemWebUrl: 'https://www.ebay.co.uk',
    seller: 'gadget_rescue_uk',
    sellerFeedbackScore: 4120,
    shippingCost: 0,
    buyingOptions: ['FIXED_PRICE'],
    watchCount: 55,
    listingType: 'BUY_IT_NOW',
  },
]

export async function searchEbayListings(
  query: string,
  maxPrice?: number,
  condition?: string,
  category?: string,
): Promise<EbaySearchResult> {
  const { data, error } = await supabase.functions.invoke('ebay-search', {
    body: { query, maxPrice, condition, category },
  })

  if (error) {
    return { items: MOCK_ITEMS, total: MOCK_ITEMS.length, mock: true }
  }

  if (data?.mock) {
    return { items: data.items ?? MOCK_ITEMS, total: (data.items ?? MOCK_ITEMS).length, mock: true }
  }

  return {
    items: (data?.itemSummaries ?? []).map(mapEbayItem),
    total: data?.total ?? 0,
    mock: false,
  }
}

function mapEbayItem(raw: Record<string, unknown>): EbayItem {
  const price = raw.price as { value?: string } | undefined
  const shipping = (raw.shippingOptions as Array<{ shippingCost?: { value?: string } }> | undefined)?.[0]
  const image = raw.image as { imageUrl?: string } | undefined
  const seller = raw.seller as { username?: string; feedbackScore?: number } | undefined
  return {
    itemId: String(raw.itemId ?? ''),
    title: String(raw.title ?? ''),
    price: parseFloat(price?.value ?? '0'),
    currency: 'GBP',
    condition: String(raw.condition ?? ''),
    conditionId: String(raw.conditionId ?? ''),
    imageUrl: image?.imageUrl ?? '',
    itemWebUrl: String(raw.itemWebUrl ?? ''),
    seller: seller?.username ?? '',
    sellerFeedbackScore: seller?.feedbackScore ?? 0,
    shippingCost: parseFloat(shipping?.shippingCost?.value ?? '0') || null,
    buyingOptions: (raw.buyingOptions as string[] | undefined) ?? [],
    watchCount: raw.watchCount as number | undefined,
    listingType: ((raw.buyingOptions as string[] | undefined)?.[0] === 'AUCTION' ? 'AUCTION' : 'BUY_IT_NOW'),
    bidCount: raw.bidCount as number | undefined,
    endDate: raw.itemEndDate as string | undefined,
  }
}
