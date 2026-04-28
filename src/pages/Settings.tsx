import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Upload, Save, LogOut, Palette, Building2, Briefcase, User, AlertTriangle, Lock, Database, Download, RotateCcw, CloudUpload, HardDrive, Link2, Link2Off } from 'lucide-react'
import { initiateXeroAuth, isXeroConnected, clearXeroTokens } from '@/lib/xero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  backupToGoogleDrive,
  downloadBackupLocally,
  listDriveBackups,
  restoreFromDriveBackup,
} from '@/lib/googleDriveBackup'

const THEME_PRESETS = [
  { name: 'Dark Blue', primary: '#4F8EF7', accent: '#6C63FF' },
  { name: 'Dark Green', primary: '#4CAF82', accent: '#2DD4BF' },
  { name: 'Dark Purple', primary: '#9C6FD6', accent: '#C084FC' },
  { name: 'Midnight', primary: '#E8EAED', accent: '#94A3B8' },
  { name: 'Dark Amber', primary: '#F0A500', accent: '#F59E0B' },
]

const TABS = [
  { id: 'company',      labelKey: 'settings.tabs.company',      icon: Building2 },
  { id: 'appearance',   labelKey: 'settings.tabs.appearance',   icon: Palette },
  { id: 'business',     labelKey: 'settings.tabs.business',     icon: Briefcase },
  { id: 'account',      labelKey: 'settings.tabs.account',      icon: User },
  { id: 'security',     labelKey: 'settings.tabs.security',     icon: Lock },
  { id: 'data',         labelKey: 'settings.tabs.data',         icon: Database },
  { id: 'integrations', labelKey: 'settings.tabs.integrations', icon: Link2 },
] as const

type Tab = typeof TABS[number]['id']

const CURRENCIES = [
  { value: 'GBP', symbol: '£', label: 'GBP £ — Libra esterlina' },
  { value: 'EUR', symbol: '€', label: 'EUR € — Euro' },
  { value: 'USD', symbol: '$', label: 'USD $ — Dólar americano' },
]

export function Settings() {
  const { t } = useTranslation()
  useEffect(() => { document.title = 'Configurações — RevTech PRO' }, [])
  const { settings, save } = useSettings()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('company')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Data tab state
  const [backingUp, setBackingUp] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupError, setBackupError] = useState('')
  const [driveBackups, setDriveBackups] = useState<Array<{ id: string; name: string; createdTime: string }>>([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const lastBackup = localStorage.getItem('revtech_last_backup')
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('revtech_auto_backup') === '1')

  async function handleDriveBackup() {
    setBackingUp(true)
    setBackupMsg('')
    setBackupError('')
    const result = await backupToGoogleDrive()
    setBackingUp(false)
    if (result.success) {
      setBackupMsg(t('settings.data.backupSuccess'))
      setTimeout(() => setBackupMsg(''), 4000)
    } else if (result.message === 'drive_scope_missing') {
      setBackupError(t('settings.data.driveScopeDesc'))
    } else {
      setBackupError(t('settings.data.backupError'))
    }
  }

  async function handleLocalBackup() {
    await downloadBackupLocally()
    setBackupMsg(t('common.download') + ' ✓')
    setTimeout(() => setBackupMsg(''), 3000)
  }

  async function handleLoadBackups() {
    setLoadingBackups(true)
    const backups = await listDriveBackups()
    setDriveBackups(backups)
    setLoadingBackups(false)
  }

  async function handleRestore(fileId: string) {
    if (!window.confirm(t('settings.data.confirmRestore'))) return
    setRestoring(true)
    const result = await restoreFromDriveBackup(fileId)
    setRestoring(false)
    if (result.success) {
      setBackupMsg(t('settings.data.restoreSuccess'))
      setTimeout(() => setBackupMsg(''), 4000)
    } else {
      setBackupError(t('settings.data.restoreError'))
    }
  }

  function toggleAutoBackup() {
    const next = !autoBackup
    setAutoBackup(next)
    localStorage.setItem('revtech_auto_backup', next ? '1' : '0')
  }

  const [companyName, setCompanyName] = useState(settings.company_name)
  const [companySubtitle, setCompanySubtitle] = useState(settings.company_subtitle)
  const [companyLocation, setCompanyLocation] = useState(settings.company_location)
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo_url)
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color)
  const [accentColor, setAccentColor] = useState(settings.accent_color)
  const [currency, setCurrency] = useState(settings.currency)
  const [vatRate, setVatRate] = useState(settings.vat_rate)
  const [ticketPrefix, setTicketPrefix] = useState(settings.ticket_prefix)

  // Security tab state
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const [savingPin, setSavingPin] = useState(false)

  async function handlePinChange(e: React.FormEvent) {
    e.preventDefault()
    setPinError('')
    setPinSuccess(false)
    if (newPin.length < 4 || newPin.length > 6) { setPinError('PIN deve ter 4 a 6 dígitos.'); return }
    if (newPin !== confirmPin) { setPinError('Os PINs não coincidem.'); return }
    setSavingPin(true)
    // Verify current PIN first
    const { data } = await supabase.from('app_settings').select('admin_pin').single()
    const stored = data?.admin_pin ?? '1234'
    if (currentPin !== stored) {
      setSavingPin(false)
      setPinError('PIN actual incorrecto.')
      return
    }
    await supabase.from('app_settings').upsert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      admin_pin: newPin,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setSavingPin(false)
    setPinSuccess(true)
    // Refresh session unlock so they don't get locked out
    sessionStorage.setItem('revtech_admin_pin_unlocked', JSON.stringify({ ts: Date.now() }))
    setTimeout(() => setPinSuccess(false), 3000)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      setLogoPreview(data.publicUrl)
    } else {
      const reader = new FileReader()
      reader.onload = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  function applyPreset(preset: typeof THEME_PRESETS[number]) {
    setPrimaryColor(preset.primary)
    setAccentColor(preset.accent)
    document.documentElement.style.setProperty('--color-accent', preset.primary)
    document.documentElement.style.setProperty('--color-accent-alt', preset.accent)
  }

  async function handleSave() {
    setSaving(true)
    const currencyObj = CURRENCIES.find(c => c.value === currency)
    await save({
      company_name: companyName,
      company_subtitle: companySubtitle,
      company_location: companyLocation,
      logo_url: logoPreview,
      primary_color: primaryColor,
      accent_color: accentColor,
      currency,
      currency_symbol: currencyObj?.symbol ?? '£',
      vat_rate: vatRate,
      ticket_prefix: ticketPrefix,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('settings.title')}</h1>
        <p className="text-text-muted text-sm mt-0.5">{t('settings.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors',
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* ABA 1 — EMPRESA */}
      {activeTab === 'company' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Informação da Empresa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Logo upload */}
            <div className="space-y-2">
              <label className="text-xs text-text-muted font-medium">Logo</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="h-16 w-16 rounded-xl border-2 border-dashed border-border hover:border-accent/50 flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-surface"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-6 w-6 text-text-muted" />
                  )}
                </div>
                <div className="text-xs text-text-muted space-y-1">
                  <p>Clica para fazer upload</p>
                  <p>PNG, JPG, SVG, WebP</p>
                  {logoPreview && (
                    <button onClick={() => setLogoPreview(null)} className="text-danger hover:underline">Remover logo</button>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-muted font-medium">Nome da empresa</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted font-medium">Subtítulo</label>
              <input value={companySubtitle} onChange={e => setCompanySubtitle(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted font-medium">Localização</label>
              <input value={companyLocation} onChange={e => setCompanyLocation(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>

            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'A guardar...' : saved ? '✓ Guardado!' : 'Guardar'}
            </button>
          </CardContent>
        </Card>
      )}

      {/* ABA 2 — APARÊNCIA */}
      {activeTab === 'appearance' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tema e Cores</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs text-text-muted font-medium">Temas prontos</label>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-primary hover:border-accent/50 transition-colors"
                  >
                    <div className="flex gap-1">
                      <div className="h-3 w-3 rounded-full" style={{ background: preset.primary }} />
                      <div className="h-3 w-3 rounded-full" style={{ background: preset.accent }} />
                    </div>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-text-muted font-medium">Cor primária</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor}
                    onChange={e => { setPrimaryColor(e.target.value); document.documentElement.style.setProperty('--color-accent', e.target.value) }}
                    className="h-9 w-9 rounded cursor-pointer border border-border bg-transparent" />
                  <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 rounded-lg bg-surface border border-border px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-text-muted font-medium">Cor de destaque</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor}
                    onChange={e => { setAccentColor(e.target.value); document.documentElement.style.setProperty('--color-accent-alt', e.target.value) }}
                    className="h-9 w-9 rounded cursor-pointer border border-border bg-transparent" />
                  <input value={accentColor} onChange={e => setAccentColor(e.target.value)}
                    className="flex-1 rounded-lg bg-surface border border-border px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <p className="text-xs text-text-muted font-medium">Preview</p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${primaryColor}25` }}>
                  <div className="h-4 w-4 rounded" style={{ background: primaryColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: primaryColor }}>{companyName || 'RevTech'}</p>
                  <p className="text-xs text-text-muted">PRO v2</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}40` }}>Botão primário</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}>Destaque</span>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'A guardar...' : saved ? '✓ Guardado!' : 'Guardar tema'}
            </button>
          </CardContent>
        </Card>
      )}

      {/* ABA 3 — NEGÓCIO */}
      {activeTab === 'business' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Configurações de Negócio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-muted font-medium">Moeda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50">
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted font-medium">Taxa de IVA (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value))}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted font-medium">Prefixo de tickets (ex: RT → RT-2026-001)</label>
              <input value={ticketPrefix} onChange={e => setTicketPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                maxLength={4}
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <p className="text-xs text-text-muted">Formato: {ticketPrefix || 'RT'}-{new Date().getFullYear()}-001</p>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'A guardar...' : saved ? '✓ Guardado!' : 'Guardar'}
            </button>
          </CardContent>
        </Card>
      )}

      {/* ABA 4 — CONTA */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Perfil</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-14 w-14 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-accent/20 flex items-center justify-center text-accent text-lg font-bold">
                    {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-text-primary">{user?.user_metadata?.full_name ?? '—'}</p>
                  <p className="text-sm text-text-muted">{user?.email}</p>
                  <p className="text-xs text-text-muted mt-0.5">Google OAuth</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface hover:text-danger transition-colors">
                <LogOut className="h-4 w-4" />
                Terminar sessão
              </button>
            </CardContent>
          </Card>

          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle className="text-base text-danger flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-muted mb-3">Estas acções são irreversíveis. Procede com cuidado.</p>
              <button
                onClick={async () => {
                  if (!window.confirm('Tens a certeza? Isto apaga TODOS os teus dados permanentemente.')) return
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  await Promise.all([
                    supabase.from('projects').delete().eq('user_id', user.id),
                    supabase.from('checklists').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                    supabase.from('defect_database').delete().eq('user_id', user.id),
                    supabase.from('parts_orders').delete().eq('user_id', user.id),
                    supabase.from('app_settings').delete().eq('user_id', user.id),
                  ])
                  await supabase.auth.signOut()
                }}
                className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors"
              >
                Apagar todos os dados
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ABA 5 — SEGURANÇA */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-accent" />Alterar PIN de Administrador</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
              <p className="text-amber-400 text-sm font-medium">🔐 Boas práticas de segurança</p>
              <p className="text-gray-400 text-xs mt-1">
                Renova o Google Client Secret periodicamente em{' '}
                <span className="font-mono text-amber-400/80">console.cloud.google.com</span>{' '}
                para manter a conta segura.
              </p>
            </div>
            <form onSubmit={handlePinChange} className="space-y-4 max-w-sm">
              <div className="rounded-lg bg-surface border border-border px-4 py-3 text-xs text-text-muted space-y-1">
                <p>O PIN protege o acesso às Configurações.</p>
                <p>Deve ter entre <strong className="text-text-primary">4 e 6 dígitos</strong>.</p>
                <p>A sessão fica desbloqueada por <strong className="text-text-primary">30 minutos</strong> após cada autenticação.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">PIN actual</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN actual"
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">Novo PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="4 a 6 dígitos"
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">Confirmar novo PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Repete o novo PIN"
                  className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              {pinError && (
                <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{pinError}</p>
              )}
              {pinSuccess && (
                <p className="text-xs text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2">✓ PIN alterado com sucesso!</p>
              )}

              <button
                type="submit"
                disabled={savingPin || !currentPin || newPin.length < 4 || confirmPin.length < 4}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {savingPin ? 'A guardar...' : 'Alterar PIN'}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ABA 6 — DADOS */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-accent" />
                {t('settings.data.title')}
              </CardTitle>
              <p className="text-xs text-text-muted mt-0.5">{t('settings.data.subtitle')}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Feedback messages */}
              {backupMsg && (
                <p className="text-xs text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2">✓ {backupMsg}</p>
              )}
              {backupError && (
                <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 space-y-2">
                  <p>{backupError}</p>
                  <button
                    onClick={() => { setBackupError(''); handleLocalBackup() }}
                    className="flex items-center gap-1.5 text-accent hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    {t('settings.data.downloadLocal')}
                  </button>
                </div>
              )}

              {/* Last backup */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-text-primary">{t('settings.data.lastBackup')}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {lastBackup
                      ? new Date(lastBackup).toLocaleString()
                      : t('settings.data.never')}
                  </p>
                </div>
              </div>

              {/* Backup buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDriveBackup}
                  disabled={backingUp}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {backingUp ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  {backingUp ? t('settings.data.backingUp') : t('settings.data.backupNow')}
                </button>

                <button
                  onClick={handleLocalBackup}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface hover:text-text-primary transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t('settings.data.downloadLocal')}
                </button>
              </div>

              {/* Auto backup toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{t('settings.data.autoBackup')}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t('settings.data.autoBackupDesc')}</p>
                </div>
                <button
                  onClick={toggleAutoBackup}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
                    autoBackup ? 'bg-accent' : 'bg-surface border border-border'
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    autoBackup ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Restore */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-accent" />
                {t('settings.data.restoreBackup')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={handleLoadBackups}
                disabled={loadingBackups}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {loadingBackups ? (
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                {t('settings.data.availableBackups')}
              </button>

              {driveBackups.length === 0 && !loadingBackups && (
                <p className="text-xs text-text-muted">{t('settings.data.noBackups')}</p>
              )}

              {driveBackups.length > 0 && (
                <div className="space-y-2">
                  {driveBackups.map(b => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-text-primary">{b.name}</p>
                        <p className="text-xs text-text-muted">{new Date(b.createdTime).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleRestore(b.id)}
                        disabled={restoring}
                        className="flex items-center gap-1.5 rounded-lg bg-warning/20 text-warning px-3 py-1.5 text-xs font-semibold hover:bg-warning/30 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        {restoring ? t('settings.data.restoring') : t('common.import')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Integrations tab ─────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-accent" />
                Xero — Contabilidade UK
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-muted">
                Liga o RevTech PRO ao Xero para exportar vendas e compras automaticamente para a tua contabilidade.
                O Xero é o sistema de contabilidade mais usado por pequenas empresas no Reino Unido.
              </p>

              {isXeroConnected() ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success text-sm font-medium">
                    <Link2 className="h-4 w-4" />
                    Ligado ao Xero
                  </div>
                  <button
                    onClick={() => { clearXeroTokens(); window.location.reload() }}
                    className="flex items-center gap-2 text-sm text-danger hover:bg-danger/10 rounded-lg px-3 py-2 transition-colors border border-danger/30"
                  >
                    <Link2Off className="h-4 w-4" />
                    Desligar do Xero
                  </button>
                </div>
              ) : (
                <button
                  onClick={initiateXeroAuth}
                  className="flex items-center gap-2 rounded-lg bg-[#13B5EA] text-white px-4 py-2 text-sm font-semibold hover:bg-[#0ea5d4] transition-colors"
                >
                  <Link2 className="h-4 w-4" />
                  Ligar ao Xero
                </button>
              )}

              <div className="rounded-lg bg-surface border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-text-primary">Passos para activar:</p>
                <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
                  <li>Cria uma conta gratuita em xero.com (30 dias de trial)</li>
                  <li>Em developer.xero.com, cria uma App OAuth 2.0</li>
                  <li>Adiciona <code className="bg-surface border border-border px-1 rounded">VITE_XERO_CLIENT_ID</code> ao .env.local</li>
                  <li>Clica em "Ligar ao Xero" acima</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
