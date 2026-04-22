import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, type AppSettings } from '@/lib/supabase'

const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  company_name: 'RevTech',
  company_subtitle: 'Oficina · Livingston',
  company_location: 'Livingston, Scotland',
  logo_url: null,
  primary_color: '#4F8EF7',
  accent_color: '#6C63FF',
  currency: 'GBP',
  currency_symbol: '£',
  vat_rate: 20,
  ticket_prefix: 'RT',
}

interface SettingsContextValue {
  settings: Omit<AppSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  loading: boolean
  save: (updates: Partial<Omit<AppSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  save: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  function applyColors(primary: string, accent: string) {
    document.documentElement.style.setProperty('--color-accent', primary)
    document.documentElement.style.setProperty('--color-accent-alt', accent)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase.from('app_settings').select('*').eq('user_id', user.id).single()

      if (data) {
        const s = {
          company_name: data.company_name,
          company_subtitle: data.company_subtitle,
          company_location: data.company_location,
          logo_url: data.logo_url,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          currency: data.currency,
          currency_symbol: data.currency_symbol,
          vat_rate: data.vat_rate,
          ticket_prefix: data.ticket_prefix,
        }
        setSettings(s)
        applyColors(s.primary_color, s.accent_color)
      } else {
        applyColors(DEFAULT_SETTINGS.primary_color, DEFAULT_SETTINGS.accent_color)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save(updates: Partial<typeof DEFAULT_SETTINGS>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const merged = { ...settings, ...updates }
    await supabase.from('app_settings').upsert({
      user_id: user.id,
      ...merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSettings(merged)
    if (updates.primary_color || updates.accent_color) {
      applyColors(merged.primary_color, merged.accent_color)
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, save }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
