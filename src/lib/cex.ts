import { supabase } from './supabase'

export interface CexBox {
  boxId: string
  boxName: string
  categoryName: string
  sellPrice: number | null
  exchangePrice: number | null
  cashPrice: number | null
  thumbnailUrl: string | null
  boxLink: string
}

export async function searchCexPrice(query: string): Promise<CexBox[]> {
  const { data, error } = await supabase.functions.invoke('cex-search', {
    body: { q: query },
  })

  if (error) throw error
  return (data?.boxes ?? []) as CexBox[]
}
