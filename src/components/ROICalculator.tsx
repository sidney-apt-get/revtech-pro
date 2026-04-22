import { fmtGBP } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ROICalculatorProps {
  purchasePrice: number
  partsCost: number
  shippingIn: number
  shippingOut: number
  salePrice: number | null
}

export function ROICalculator({ purchasePrice, partsCost, shippingIn, shippingOut, salePrice }: ROICalculatorProps) {
  const cost = (purchasePrice || 0) + (partsCost || 0) + (shippingIn || 0) + (shippingOut || 0)
  const revenue = salePrice || 0
  const profit = revenue - cost
  const roi = cost > 0 && revenue > 0 ? (profit / cost) * 100 : null
  const positive = profit >= 0

  if (cost === 0 && !salePrice) return null

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Calculadora ROI</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Compra</span>
          <span className="text-text-primary font-medium">{fmtGBP(purchasePrice || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Peças</span>
          <span className="text-text-primary font-medium">{fmtGBP(partsCost || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Frete entrada</span>
          <span className="text-text-primary font-medium">{fmtGBP(shippingIn || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Frete saída</span>
          <span className="text-text-primary font-medium">{fmtGBP(shippingOut || 0)}</span>
        </div>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-text-muted">Custo total</span>
          <span className="text-text-primary">{fmtGBP(cost)}</span>
        </div>
        {salePrice != null && (
          <>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-text-muted">Preço venda</span>
              <span className="text-text-primary">{fmtGBP(revenue)}</span>
            </div>
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              <span className="flex items-center gap-1">
                {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {positive ? 'Lucro' : 'Prejuízo'}: {fmtGBP(Math.abs(profit))}
              </span>
              {roi !== null && <span>ROI {roi.toFixed(1)}%</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
