import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/hooks/useProjects'
import { usePhotosByProjects } from '@/hooks/useProjectPhotos'
import { lookupBarcode, type ProductInfo } from '@/lib/productLookup'
import { calcROI, fmtGBP, fmtDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import {
  Search, AlertTriangle, Clock, TrendingUp, TrendingDown,
  ScanLine, Loader2, Package, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { differenceInDays } from 'date-fns'

const STATUS_COLOR: Record<string, string> = {
  'Recebido':          'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Em Diagnóstico':    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  'Aguardando Peças':  'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Em Manutenção':     'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Pronto para Venda': 'bg-success/15 text-success border-success/20',
  'Vendido':           'bg-success/10 text-success border-success/10',
  'Cancelado':         'bg-danger/10 text-danger border-danger/10',
}

export function SerialHistory() {
  const { t } = useTranslation()
  const { data: projects = [], isLoading } = useProjects()
  const [query, setQuery] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return projects.filter(p =>
      p.serial_number && p.serial_number.toLowerCase().includes(q)
    ).sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
  }, [projects, query])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>()
    results.forEach(p => {
      const sn = p.serial_number!.toUpperCase()
      const arr = map.get(sn) ?? []
      arr.push(p)
      map.set(sn, arr)
    })
    return map
  }, [results])

  const allResultIds = results.map(p => p.id)
  const { data: allPhotos = [] } = usePhotosByProjects(allResultIds)

  async function handleScan(code: string) {
    setQuery(code)
    setScannerOpen(false)
    setProductInfo(null)
    setLookingUp(true)
    try {
      const info = await lookupBarcode(code)
      if (info) setProductInfo(info)
    } finally {
      setLookingUp(false)
    }
  }

  async function handleSearch(q: string) {
    setQuery(q)
    setProductInfo(null)
    if (q.trim().length >= 8) {
      setLookingUp(true)
      try {
        const info = await lookupBarcode(q.trim())
        if (info) setProductInfo(info)
      } finally {
        setLookingUp(false)
      }
    }
  }

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('serialHistory.title')}</h1>
        <p className="text-text-muted text-sm mt-0.5">{t('serialHistory.subtitle')}</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder={t('serialHistory.searchPlaceholder')}
                className="w-full rounded-lg bg-surface border border-border pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                autoFocus
              />
              {lookingUp && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-accent" />
              )}
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              title={t('serialHistory.scanBarcode')}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-accent transition-colors"
            >
              <ScanLine className="h-4 w-4" />
            </button>
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-text-muted mt-2">{t('serialHistory.minChars')}</p>
          )}
        </CardContent>
      </Card>

      {/* Product info from API */}
      {productInfo && (
        <Card className="border-accent/30">
          <CardContent className="p-4">
            <div className="flex gap-3 items-start">
              {productInfo.imageUrl && (
                <img
                  src={productInfo.imageUrl}
                  alt={productInfo.name ?? ''}
                  className="h-16 w-16 rounded-lg object-cover border border-border shrink-0"
                />
              )}
              {!productInfo.imageUrl && (
                <div className="h-16 w-16 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6 text-text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs text-accent font-medium">{t('serialHistory.productIdentified')}</span>
                </div>
                {productInfo.name && (
                  <p className="font-semibold text-text-primary text-sm">{productInfo.name}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-text-muted">
                  {productInfo.brand && <span>{t('serialHistory.brand')}: <span className="text-text-primary">{productInfo.brand}</span></span>}
                  {productInfo.model && <span>{t('serialHistory.model')}: <span className="text-text-primary">{productInfo.model}</span></span>}
                  {productInfo.category && <span>{t('serialHistory.category')}: <span className="text-text-primary">{productInfo.category}</span></span>}
                </div>
                {productInfo.description && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{productInfo.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {grouped.size === 0 && query.length >= 2 && !lookingUp && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
            <p className="text-text-muted text-sm">{t('serialHistory.notFound', { query })}</p>
            {productInfo && (
              <p className="text-xs text-text-muted mt-2">{t('serialHistory.productInShop')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {Array.from(grouped.entries()).map(([serial, entries]) => {
        const soldEntries = entries.filter(p => p.status === 'Vendido')
        const totalRevenue = soldEntries.reduce((s, p) => s + (p.sale_price ?? 0), 0)
        const totalCost = entries.reduce((s, p) => s + calcROI(p).cost, 0)
        const isProblematic = entries.length >= 3

        // Stats
        const avgDays = entries.length > 0
          ? Math.round(entries.reduce((s, p) => {
            const d = p.sold_at
              ? differenceInDays(new Date(p.sold_at), new Date(p.received_at))
              : differenceInDays(new Date(), new Date(p.received_at))
            return s + d
          }, 0) / entries.length)
          : 0
        const successRate = entries.length > 0
          ? Math.round((soldEntries.length / entries.length) * 100)
          : 0

        return (
          <Card key={serial} className={cn(isProblematic && 'border-warning/40')}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  {isProblematic && <AlertTriangle className="h-4 w-4 text-warning" />}
                  {serial}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  {isProblematic && (
                    <span className="bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded-full font-semibold">
                      ⚠️ {t('serialHistory.timesInShop', { count: entries.length })}
                    </span>
                  )}
                  <span className="bg-surface border border-border px-2 py-1 rounded-full text-text-muted">
                    {t('serialHistory.entries', { count: entries.length })}
                  </span>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <div className="rounded-lg bg-surface border border-border px-3 py-2 text-center">
                  <p className="text-xs text-text-muted">{t('serialHistory.totalRevenue')}</p>
                  <p className="text-sm font-bold text-success">{fmtGBP(totalRevenue)}</p>
                </div>
                <div className="rounded-lg bg-surface border border-border px-3 py-2 text-center">
                  <p className="text-xs text-text-muted">{t('serialHistory.totalCost')}</p>
                  <p className="text-sm font-bold text-danger">{fmtGBP(totalCost)}</p>
                </div>
                <div className="rounded-lg bg-surface border border-border px-3 py-2 text-center">
                  <p className="text-xs text-text-muted">{t('serialHistory.avgTime')}</p>
                  <p className="text-sm font-bold text-text-primary">{avgDays}d</p>
                </div>
                <div className="rounded-lg bg-surface border border-border px-3 py-2 text-center">
                  <p className="text-xs text-text-muted">{t('serialHistory.successRate')}</p>
                  <p className={cn('text-sm font-bold', successRate >= 50 ? 'text-success' : 'text-danger')}>
                    {successRate}%
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Timeline */}
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-border" />

                {entries.map(p => {
                  const { profit } = calcROI(p)
                  const days = p.sold_at
                    ? differenceInDays(new Date(p.sold_at), new Date(p.received_at))
                    : differenceInDays(new Date(), new Date(p.received_at))
                  const projectPhotos = allPhotos.filter(ph => ph.project_id === p.id)

                  return (
                    <div key={p.id} className="relative mb-4 last:mb-0">
                      <div className={cn(
                        'absolute -left-3.5 top-2 h-3 w-3 rounded-full border-2',
                        p.status === 'Vendido' ? 'bg-success border-success' :
                        p.status === 'Cancelado' ? 'bg-danger border-danger' :
                        'bg-accent border-accent'
                      )} />

                      <div className="rounded-xl border border-border bg-card p-3 ml-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              {p.ticket_number && (
                                <span className="text-xs font-mono text-accent/70">#{p.ticket_number}</span>
                              )}
                              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[p.status] ?? 'bg-surface border-border text-text-muted')}>
                                {t(`statusMap.${p.status}`, { defaultValue: p.status })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-text-primary mt-1">{p.equipment}</p>
                            {p.defect_description && (
                              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{p.defect_description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {p.status === 'Vendido' && p.sale_price && (
                              <div className="flex items-center gap-1">
                                {profit >= 0
                                  ? <TrendingUp className="h-3.5 w-3.5 text-success" />
                                  : <TrendingDown className="h-3.5 w-3.5 text-danger" />
                                }
                                <span className={cn('text-sm font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>
                                  {fmtGBP(profit)}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-text-muted">{fmtDate(p.received_at)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-text-muted">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{t('serialHistory.daysInShop', { count: days })}</span>
                          </div>
                          {p.supplier_name && (
                            <div>{t('serialHistory.supplier')}: <span className="text-text-primary">{p.supplier_name}</span></div>
                          )}
                          {p.sale_price && (
                            <div>{t('serialHistory.sale')}: <span className="text-success font-medium">{fmtGBP(p.sale_price)}</span></div>
                          )}
                          {p.sale_platform && (
                            <div>{t('serialHistory.platform')}: <span className="text-text-primary">{p.sale_platform}</span></div>
                          )}
                        </div>

                        {/* Photos from this repair */}
                        {projectPhotos.length > 0 && (
                          <div className="mt-3 border-t border-border pt-2.5">
                            <p className="text-[10px] text-text-muted mb-1.5">
                              {t('serialHistory.photos', { count: projectPhotos.length })}
                            </p>
                            <div className="flex gap-1.5 flex-wrap">
                              {projectPhotos.slice(0, 6).map(photo => (
                                <a
                                  key={photo.id}
                                  href={photo.photo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <img
                                    src={photo.photo_url}
                                    alt={photo.caption ?? ''}
                                    className="h-12 w-12 rounded-lg object-cover border border-border hover:border-accent/40 transition-colors"
                                  />
                                </a>
                              ))}
                              {projectPhotos.length > 6 && (
                                <div className="h-12 w-12 rounded-lg bg-surface border border-border flex items-center justify-center text-xs text-text-muted">
                                  +{projectPhotos.length - 6}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {scannerOpen && (
        <BarcodeScanner
          title={t('serialHistory.scanBarcode')}
          onDetected={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}
