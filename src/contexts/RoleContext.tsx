import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type Role = 'admin' | 'technician' | 'viewer'

const ADMIN_EMAIL = 'sidneyalves@msn.com'

interface RoleContextValue {
  role: Role | null
  isAdmin: boolean
  isTechnician: boolean
  isViewer: boolean
  loading: boolean
  showWelcome: boolean
  dismissWelcome: () => void
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  isAdmin: false,
  isTechnician: false,
  isViewer: false,
  loading: true,
  showWelcome: false,
  dismissWelcome: () => {},
})

function WelcomeModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto">
          <span className="text-2xl">👋</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Bem-vindo ao RevTech PRO</h2>
          <p className="text-sm text-text-muted mt-2">
            A tua conta foi criada com acesso limitado.<br />
            Contacta o administrador para obter acesso completo.
          </p>
        </div>
        <div className="rounded-lg bg-surface border border-border px-4 py-3 text-xs text-text-muted">
          Neste momento podes aceder ao <strong className="text-text-primary">Dashboard</strong> e <strong className="text-text-primary">Analytics</strong>.
        </div>
        <button
          onClick={onDismiss}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setRole(null); setLoading(false); return }

    async function loadRole() {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .single()

      if (data) {
        setRole(data.role as Role)
        // Update last_seen + avatar silently
        supabase.from('user_roles').update({
          last_seen: new Date().toISOString(),
          avatar_url: user!.user_metadata?.avatar_url ?? null,
          display_name: user!.user_metadata?.full_name ?? null,
        }).eq('user_id', user!.id)
        setLoading(false)
        return
      }

      // First login — assign role
      const isAdminEmail = user!.email === ADMIN_EMAIL
      const newRole: Role = isAdminEmail ? 'admin' : 'viewer'

      await supabase.from('user_roles').insert({
        user_id: user!.id,
        role: newRole,
        email: user!.email ?? '',
        display_name: user!.user_metadata?.full_name ?? null,
        avatar_url: user!.user_metadata?.avatar_url ?? null,
        last_seen: new Date().toISOString(),
      })

      setRole(newRole)
      if (newRole === 'viewer') setShowWelcome(true)
      setLoading(false)
    }

    loadRole()
  }, [user?.id, authLoading])

  return (
    <RoleContext.Provider value={{
      role,
      isAdmin: role === 'admin',
      isTechnician: role === 'technician',
      isViewer: role === 'viewer',
      loading,
      showWelcome,
      dismissWelcome: () => setShowWelcome(false),
    }}>
      {children}
      {showWelcome && <WelcomeModal onDismiss={() => setShowWelcome(false)} />}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
