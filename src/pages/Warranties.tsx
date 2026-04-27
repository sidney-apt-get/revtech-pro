import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWarranties, useClaimWarranty } from '@/hooks/useWarranties'
import { useProjects } from '@/hooks/useProjects'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ShieldCheck, ShieldOff, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

function WarrantyBadge({ status, expiresAt }: { status: string; expiresAt: string }) {
  const { t } = useTranslation()
  const daysLeft = differenceInDays(parseISO(expiresAt), new Date())
  if (status === 'claimed') return (
    <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-medium">{t('warranties.statusBadge.claimed')}</span>
  )
  if (status === 'expired') return (
    <span className="text-xs bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded-full font-medium">{t('warranties.statusBadge.expired')}</span>
  )
  if (daysLeft <= 30) return (
    <span className="text-xs bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />{daysLeft}d
    </span>
  )
  return (
    <span className="text-xs bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
      <ShieldCheck className="h-3 w-3" />{daysLeft}d
    </span>
  )
}

export function Warranties() {
  const { t } = useTranslation()
  const { data: warranties = [], isLoading } = useWarranties()
  const { data: projects = [] } = useProjects()
  const claimWarranty = useClaimWarranty()
  const [claimId, setClaimId] = useState<string | null>(null)
  const [claimDesc, setClaimDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const active = warranties.filter(w => w.status === 'active')
  const expiringSoon = active.filter(w => differenceInDays(parseISO(w.expires_at), new Date()) <= 30)
  const claimed = warranties.filter(w => w.status === 'claimed')
  const expired = warranties.filter(w => w.status === 'expired')

  async function handleClaim() {
    if (!claimId) return
    setSaving(true)
    try {
      await claimWarranty.mutateAsync({ id: claimId, description: claimDesc })
      setClaimId(null)
      setClaimDesc('')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <div className="text-text-muted animate-pulse p-4">{t('common.loading')}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-success" /> {t('warranties.title')}
        </h1>
        <p className="text-text-muted text-sm mt-0.5">{t('warranties.subtitle')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('warranties.kpi.active'), count: active.length, color: 'text-success', bg: 'bg-success/15' },
          { label: t('warranties.kpi.expiringSoon'), count: expiringSoon.length, color: 'text-warning', bg: 'bg-warning/15' },
          { label: t('warranties.kpi.claimed'), count: claimed.length, color: 'text-purple-400', bg: 'bg-purple-500/15' },
          { label: t('warranties.kpi.expired'), count: expired.length, color: 'text-danger', bg: 'bg-danger/15' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-2', s.bg)}>
                <ShieldCheck className={cn('h-4 w-4', s.color)} />
              </div>
              <p className="text-xl font-bold text-text-primary">{s.count}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning: expiring soon */}
      {expiringSoon.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t('warranties.expiringAlert', { count: expiringSoon.length })}</span>
        </div>
      )}

      {/* Warranties list */}
      {warranties.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldOff className="h-12 w-12 text-text-muted mx-auto mb-3 opacity-30" />
            <p className="text-text-muted">{t('warranties.noWarranties')}</p>
            <p className="text-text-muted text-sm mt-1 opacity-70">{t('warranties.autoCreated')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {warranties.map(w => {
            const project = projects.find(p => p.id === w.project_id)
            const daysLeft = differenceInDays(parseISO(w.expires_at), new Date())
            return (
              <Card key={w.id} className={cn(
                w.status === 'claimed' && 'border-purple-500/20',
                w.status === 'expired' && 'opacity-60',
                w.status === 'active' && daysLeft <= 30 && 'border-warning/30',
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <WarrantyBadge status={w.status} expiresAt={w.expires_at} />
                        {project?.ticket_number && (
                          <span className="text-xs font-mono text-accent/70">#{project.ticket_number}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-text-primary">
                        {project?.equipment ?? t('warranties.deletedProject')}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('warranties.months', { count: w.warranty_months })}
                        </span>
                        <span>{t('warranties.starts')}: {format(parseISO(w.starts_at), 'dd/MM/yyyy')}</span>
                        <span>{t('warranties.expires')}: {format(parseISO(w.expires_at), 'dd/MM/yyyy')}</span>
                      </div>
                      {w.terms && (
                        <p className="text-xs text-text-muted mt-1 line-clamp-1 italic">"{w.terms}"</p>
                      )}
                      {w.status === 'claimed' && w.claim_description && (
                        <p className="text-xs text-purple-400 mt-1">{t('warranties.claimDetail', { description: w.claim_description })}</p>
                      )}
                    </div>

                    {w.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setClaimId(w.id)}
                        className="text-xs border-warning/40 text-warning hover:bg-warning/10"
                      >
                        {t('warranties.claimButton')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Claim dialog */}
      <Dialog open={!!claimId} onOpenChange={o => !o && setClaimId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('warranties.claimDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-2 space-y-3">
            <p className="text-sm text-text-muted">{t('warranties.claimDialog.description')}</p>
            <Textarea
              value={claimDesc}
              onChange={e => setClaimDesc(e.target.value)}
              placeholder={t('warranties.claimDialog.placeholder')}
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimId(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleClaim} disabled={saving || !claimDesc.trim()} className="bg-warning text-black hover:bg-warning/90">
              {saving ? t('common.saving') : t('warranties.claimDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
