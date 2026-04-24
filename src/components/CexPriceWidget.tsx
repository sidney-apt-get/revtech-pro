import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchCexPrice, type CexBox } from '@/lib/cex'
import { fmtGBP } from '@/lib/utils'
import { ExternalLink, X, Loader2, ShoppingBag } from 'lucide-react'

interface CexPriceWidgetProps {
  query: string
  onClose: () => void
}

export function CexPriceWidget({ query, onClose }: CexPriceWidgetProps) {
  const { t } = useTranslation()
  const [results, setResults] = useState<CexBox[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    setLoading(true)
    setError(null)
    try {
      const boxes = await searchCexPrice(query)
      setResults(boxes)
      setSearched(true)
    } catch {
      setError(t('cex.error'))
    } finally {
      setLoading(false)
    }
  }

  // Auto-search on mount
  useState(() => { handleSearch() })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-accent" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{t('cex.title')}</p>
              <p className="text-xs text-text-muted truncate max-w-[240px]">{query}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{t('cex.searching')}</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-danger text-center py-4">{error}</p>
          )}

          {searched && !loading && !error && results?.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">{t('cex.noResults')}</p>
          )}

          {results?.map(box => (
            <div key={box.boxId} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
              {box.thumbnailUrl && (
                <img src={box.thumbnailUrl} alt="" className="h-12 w-12 object-contain rounded shrink-0 bg-white p-1" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary line-clamp-2">{box.boxName}</p>
                <p className="text-xs text-text-muted mt-0.5">{box.categoryName}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  {box.sellPrice != null && (
                    <span className="text-success font-semibold">{t('cex.boxPrice')}: {fmtGBP(box.sellPrice)}</span>
                  )}
                  {box.exchangePrice != null && (
                    <span className="text-text-muted">{t('cex.exchangePrice')}: {fmtGBP(box.exchangePrice)}</span>
                  )}
                  {box.cashPrice != null && (
                    <span className="text-text-muted">{t('cex.cashPrice')}: {fmtGBP(box.cashPrice)}</span>
                  )}
                </div>
              </div>
              <a
                href={box.boxLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
                title={t('cex.viewOnCex')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
