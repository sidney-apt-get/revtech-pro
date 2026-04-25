export interface ProductInfo {
  name?: string
  brand?: string
  model?: string
  category?: string
  description?: string
  imageUrl?: string
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  // Primary: UPCitemdb (gratuito, sem key, 100 req/dia)
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const data = await res.json()
      const item = data.items?.[0]
      if (item && item.title) {
        return {
          name: item.title || undefined,
          brand: item.brand || undefined,
          model: item.model || undefined,
          category: item.category || undefined,
          description: item.description || undefined,
          imageUrl: item.images?.[0] || undefined,
        }
      }
    }
  } catch {}

  // Fallback: Open EAN Database
  try {
    const res = await fetch(
      `https://opengtindb.org/?ean=${encodeURIComponent(barcode)}&cmd=detail&lang=en`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const xml = await res.text()
      const doc = new DOMParser().parseFromString(xml, 'text/xml')
      const errorCode = doc.querySelector('error')?.textContent?.trim()
      if (errorCode === '0') {
        const name = doc.querySelector('name')?.textContent?.trim()
        const cat = doc.querySelector('cat')?.textContent?.trim()
        const desc = doc.querySelector('detaildesc')?.textContent?.trim()
        if (name) return { name, category: cat || undefined, description: desc || undefined }
      }
    }
  } catch {}

  return null
}
