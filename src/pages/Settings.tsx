import { useState, useRef } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Upload, Save, LogOut, Palette, Building2, Briefcase, User, AlertTriangle, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const THEME_PRESETS = [
  { name: 'Dark Blue', primary: '#4F8EF7', accent: '#6C63FF' },
  { name: 'Dark Green', primary: '#4CAF82', accent: '#2DD4BF' },
  { name: 'Dark Purple', primary: '#9C6FD6', accent: '#C084FC' },
  { name: 'Midnight', primary: '#E8EAED', accent: '#94A3B8' },
  { name: 'Dark Amber', primary: '#F0A500', accent: '#F59E0B' },
]

const TABS = [
  { id: 'company', label: 'Empresa', icon: Building2 },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'business', label: 'Negócio', icon: Briefcase },
  { id: 'account', label: 'Conta', icon: User },
  { id: 'security', label: 'Segurança', icon: Lock },
] as const

type Tab = typeof TABS[number]['id']

const CURRENCIES = [
  { value: 'GBP', symbol: '£', label: 'GBP £ — Libra esterlina' },
  { value: 'EUR', symbol: '€', label: 'EUR € — Euro' },
  { value: 'USD', symbol: '$', label: 'USD $ — Dólar americano' },
]

export function Settings() {
  const { settings, save } = useSettings()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('company')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

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
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-muted text-sm mt-0.5">Personaliza o RevTech PRO</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
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
            {tab.label}
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
    </div>
  )
}
