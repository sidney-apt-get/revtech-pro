import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ExternalLink, ShoppingBag, Calculator, AlertCircle, Eye, Tag } from 'lucide-react'
import { searchEbayListings, type EbayItem } from '@/lib/ebay'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

const CONDITION_IDS = [
  { value: '', labelKey: 'ebay.allConditions' },
  { value: '1000', labelKey: 'ebay.conditionNew' },
  { value: '3000', labelKey: 'ebay.conditionUsedExcellent' },
  { value: '5000', labelKey: 'ebay.conditionUsedGood' },
  { value: '7000', labelKey: 'ebay.conditionForParts' },
]

const CATEGORIES = [
  { value: '', labelKey: 'ebay.allCategories' },
  { value: '177', labelKey: 'ebay.laptops' },
  { value: '9355', labelKey: 'ebay.phones' },
  { value: '171485', labelKey: 'ebay.tablets' },
  { value: '293', labelKey: 'ebay.audio' },
  { value: '625', labelKey: 'ebay.cameras' },
  { value: '1249', labelKey: 'ebay.consoles' },
]

function ROIModal({ item, onClose }: { item: EbayItem; onClose: () => void }) {
  const { t } = useTranslation()
  const [parts, setParts] = useState(0)
  const [shipIn, setShipIn] = useState(item.shippingCost ?? 0)
  const [shipOut, setShipOut] = useState(8)
  const [salePrice, setSalePrice] = useState(0)

  const purchase = item.price
  const cost = purchase + parts + shipIn + shipOut
  const profit = salePrice > 0 ? salePrice - cost : null
  const roi = profit !== null && cost > 0 ? (profit / cost) * 100 : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Calculator className="h-4 w-4 text-accent" />
            {t('ebay.roiCalculator')}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">×</button>
        </div>

        <p className="text-xs text-text-muted truncate">{item.title}</p>

        <div className="space-y-3">
          {[
            { label: t('ebay.purchasePrice'), value: purchase, readOnly: true },
            { label: t('ebay.partsCost'), value: parts, onChange: setParts },
            { label: t('ebay.shippingIn'), value: shipIn, onChange: setShipIn },
            { label: t('ebay.shippingOut'), value: shipOut, onChange: setShipOut },
            { label: t('ebay.salePrice'), value: salePrice, onChange: setSalePrice },
          ].map(({ label, value, readOnly, onChange }) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted w-40 shrink-0">{label}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  readOnly={readOnly}
                  onChange={e => onChange?.(parseFloat(e.target.value) || 0)}
                  className={cn(
                    'w-24 rounded-lg bg-surface border border-border px-2 py-1.5 text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50',
                    readOnly && 'opacity-60 cursor-not-allowed'
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Total cost</span>
            <span className="font-semibold text-text-primary">£{cost.toFixed(2)}</span>
          </div>
          {salePrice > 0 && profit !== null && (
            <div className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold',
              profit >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            )}>
              <span>{profit >= 0 ? t('ebay.profit') : t('ebay.loss')}: £{Math.abs(profit).toFixed(2)}</span>
              {roi !== null && <span>ROI {roi.toFixed(1)}%</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EbayCard({ item, onImport }: { item: EbayItem; onImport: (item: EbayItem) => void }) {
  const { t } = useTranslation()
  const [showROI, setShowROI] = useState(false)
  const [imported, setImported] = useState(false)

  async function handleImport() {
    await onImport(item)
    setImported(true)
    setTimeout(() => setImported(false), 2500)
  }

  return (
    <>
      {showROI && <ROIModal item={item} onClose={() => setShowROI(false)} />}
      <Card className="overflow-hidden group hover:border-accent/30 transition-colors">
        <div className="aspect-video bg-surface overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/1a1d27/4F8EF7?text=No+Image' }}
          />
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">{item.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                item.listingType === 'AUCTION'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-accent/20 text-accent'
              )}>
                {item.listingType === 'AUCTION' ? t('ebay.auction') : t('ebay.buyItNow')}
              </span>
              <span className="text-xs text-text-muted">{item.condition}</span>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xl font-bold text-text-primary">£{item.price.toFixed(2)}</p>
              <p className="text-xs text-text-muted">
                {item.shippingCost === 0 ? t('ebay.freeShipping') : `+ £${item.shippingCost?.toFixed(2)} ${t('ebay.shipping')}`}
              </p>
            </div>
            {item.watchCount != null && (
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Eye className="h-3 w-3" />
                {item.watchCount}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Tag className="h-3 w-3" />
            <span className="truncate">{item.seller}</span>
            {item.sellerFeedbackScore > 0 && (
              <span className="text-success/80">({item.sellerFeedbackScore})</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <a
              href={item.itemWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-text-muted hover:bg-surface hover:text-text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              eBay
            </a>
            <button
              onClick={() => setShowROI(true)}
              className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-text-muted hover:bg-surface hover:text-accent transition-colors"
            >
              <Calculator className="h-3 w-3" />
              ROI
            </button>
            <button
              onClick={handleImport}
              disabled={imported}
              className={cn(
                'flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                imported
                  ? 'bg-success/20 text-success border border-success/30'
                  : 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30'
              )}
            >
              <ShoppingBag className="h-3 w-3" />
              {imported ? '✓' : t('common.import')}
            </button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export function EbaySearch() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [condition, setCondition] = useState('')
  const [category, setCategory] = useState('')
  const [results, setResults] = useState<EbayItem[]>([])
  const [total, setTotal] = useState(0)
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(false)
    try {
      const res = await searchEbayListings(query.trim(), maxPrice ? parseFloat(maxPrice) : undefined, condition || undefined, category || undefined)
      setResults(res.items)
      setTotal(res.total)
      setIsMock(res.mock ?? false)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(item: EbayItem) {
    if (!user) return
    await supabase.from('projects').insert({
      user_id: user.id,
      equipment: item.title.substring(0, 120),
      defect_description: `Purchased from eBay: ${item.condition}`,
      status: 'intake',
      purchase_price: item.price,
      notes: `eBay listing: ${item.itemWebUrl}\nSeller: ${item.seller} (${item.sellerFeedbackScore})\nCondition: ${item.condition}`,
    })
    setImportMsg(t('ebay.importSuccess'))
    setTimeout(() => setImportMsg(''), 3000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('ebay.title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('ebay.subtitle')}</p>
        </div>
      </div>

      {isMock && (
        <div className="flex items-start gap-3 rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-orange-400">{t('ebay.keysRequired')}</p>
            <p className="text-xs text-orange-300/80">{t('ebay.keysDesc')}</p>
          </div>
        </div>
      )}

      {importMsg && (
        <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
          ✓ {importMsg}
        </div>
      )}

      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('ebay.searchPlaceholder')}
              className="w-full rounded-xl bg-surface border border-border pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? t('ebay.searching') : t('ebay.search')}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1 block">{t('ebay.maxPrice')}</label>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="e.g. 300"
              className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted font-medium mb-1 block">{t('ebay.condition')}</label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {CONDITION_IDS.map(c => (
                <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted font-medium mb-1 block">{t('ebay.category')}</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {t('ebay.results', { count: total || results.length })}
              {isMock && (
                <span className="ml-2 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">{t('ebay.demoMode')}</span>
              )}
            </p>
          </div>

          {results.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">{t('ebay.noResults')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map(item => (
                <EbayCard key={item.itemId} item={item} onImport={handleImport} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
