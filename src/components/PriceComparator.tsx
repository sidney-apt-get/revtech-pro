import { useEffect, useState } from 'react'
import { searchCexPrice, type CexBox } from '@/lib/cex'
import { calcROI, fmtGBP } from '@/lib/utils'
import type { Project } from '@/lib/supabase'
import { X, Loader2, TrendingUp, CheckCircle2, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLATFORMS = [
  { name: 'CeX',         fee: 0,     color: 'text-blue-400',   note: 'Venda directa à loja' },
  { name: 'eBay UK',     fee: 0.128, color: 'text-yellow-400', note: 'Taxa 12.8% + £0.30' },
  { name: 'Back Market', fee: 0.06,  color: 'text-success',    note: 'Taxa 6%' },
]

interface PriceComparatorProps {
  project: Project
  onClose: () => void
  onSelectPrice: (price: number, platform: string) => void
}

interface PlatformResult {
  name: string
  fee: number
  color: string
  note: string
  suggestedPrice: number | null
  netProfit: number | null
}

export function PriceComparator({ project, onClose, onSelectPrice }: PriceComparatorProps) {
  const [loading, setLoading] = useState(true)
  const [cexBoxes, setCexBoxes] = useState<CexBox[]>([])
  const [selectedBox, setSelectedBox] = useState<CexBox | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { cost } = calcROI(project)
  const query = `${project.brand ?? ''} ${project.model ?? ''} ${project.equipment}`.trim()

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const boxes = await searchCexPrice(query)
        setCexBoxes(boxes)
        if (boxes.length > 0) setSelectedBox(boxes[0])
      } catch {
        setError('Não foi possível obter preços. Verifica a ligação.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [query])

  const results: PlatformResult[] = PLATFORMS.map(p => {
    if (!selectedBox) return { ...p, suggestedPrice: null, netProfit: null }

    let suggestedPrice: number | null = null
    if (p.name === 'CeX') {
      suggestedPrice = selectedBox.cashPrice ?? selectedBox.sellPrice
    } else if (p.name === 'eBay UK') {
      suggestedPrice = selectedBox.sellPrice != null ? selectedBox.sellPrice * 1.05 : null
    } else {
      suggestedPrice = selectedBox.sellPrice != null ? selectedBox.sellPrice * 1.08 : null
    }

    const netProfit = suggestedPrice != null
      ? suggestedPrice * (1 - p.fee) - cost
      : null

    return { ...p, suggestedPrice, netProfit }
  })

  const best = results.reduce<PlatformResult | null>((b, r) => {
    if (r.netProfit == null) return b
    if (b == null || (b.netProfit ?? -Infinity) < r.netProfit) return r
    return b
  }, null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Comparador de Preços</p>
              <p className="text-xs text-text-muted truncate max-w-[300px]">{query}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">A consultar preços CeX...</span>
            </div>
          )}

          {error && <p className="text-sm text-danger text-center py-4">{error}</p>}

          {!loading && !error && cexBoxes.length > 0 && (
            <>
              {/* CeX model selector */}
              {cexBoxes.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-text-muted">Selecciona o modelo CeX:</p>
                  <select
                    value={selectedBox?.boxId ?? ''}
                    onChange={e => setSelectedBox(cexBoxes.find(b => b.boxId === e.target.value) ?? null)}
                    className="w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    {cexBoxes.map(b => (
                      <option key={b.boxId} value={b.boxId}>{b.boxName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cost reference */}
              <div className="rounded-lg bg-surface border border-border px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-text-muted">Custo total do projecto</span>
                <span className="font-bold text-text-primary">{fmtGBP(cost)}</span>
              </div>

              {/* Comparison table */}
              <div className="space-y-2">
                {results.map(r => {
                  const isB = r.name === best?.name
                  const positive = (r.netProfit ?? 0) >= 0
                  return (
                    <div
                      key={r.name}
                      className={cn(
                        'rounded-xl border p-3',
                        isB ? 'border-success/40 bg-success/5' : 'border-border bg-surface'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isB && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                          <span className={cn('text-sm font-semibold', r.color)}>{r.name}</span>
                          {isB && <span className="text-[10px] bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded-full font-medium">Melhor opção</span>}
                        </div>
                        <span className="text-xs text-text-muted">{r.note}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-text-muted mb-0.5">Preço sugerido</p>
                          <p className="font-semibold text-text-primary">
                            {r.suggestedPrice != null ? fmtGBP(r.suggestedPrice) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-muted mb-0.5">Taxa</p>
                          <p className="font-semibold text-text-primary">{(r.fee * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-text-muted mb-0.5">Lucro líquido</p>
                          <p className={cn('font-bold', positive ? 'text-success' : 'text-danger')}>
                            {r.netProfit != null ? fmtGBP(r.netProfit) : '—'}
                          </p>
                        </div>
                      </div>
                      {r.suggestedPrice != null && (
                        <button
                          onClick={() => { onSelectPrice(Math.round(r.suggestedPrice! * 100) / 100, r.name); onClose() }}
                          className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface/50 hover:bg-accent/10 hover:border-accent/40 hover:text-accent px-3 py-1.5 text-xs text-text-muted transition-colors"
                        >
                          <TrendingUp className="h-3 w-3" />
                          Usar este preço ({fmtGBP(r.suggestedPrice)})
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {!loading && !error && cexBoxes.length === 0 && (
            <p className="text-sm text-text-muted text-center py-6">Sem resultados CeX para este equipamento.</p>
          )}
        </div>
      </div>
    </div>
  )
}
