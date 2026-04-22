import { type ReactNode, useState } from 'react'
import { Link, useLocation } from 'wouter'
import {
  LayoutDashboard, Wrench, Package, Users,
  BarChart3, Map, LogOut, Menu, X, AlertTriangle,
  ShoppingCart, Database, FileText, Settings, Bell,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useLowStockCount } from '@/hooks/useInventory'
import { useInTransitCount } from '@/hooks/useOrders'
import { useSettings } from '@/contexts/SettingsContext'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projectos', icon: Wrench },
  { href: '/orders', label: 'Encomendas de Peças', icon: ShoppingCart, badge: 'orders' },
  { href: '/inventory', label: 'Inventário', icon: Package, badge: 'stock' },
  { href: '/defects', label: 'Base de Defeitos', icon: Database },
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/reports', label: 'Relatórios', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/map', label: 'Mapa', icon: Map },
]

function NavLink({ href, label, icon: Icon, badgeCount, onClick }: {
  href: string; label: string; icon: typeof LayoutDashboard
  badgeCount?: number; onClick?: () => void
}) {
  const [location] = useLocation()
  const active = location === href

  return (
    <Link href={href}>
      <span
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer transition-all select-none group',
          active
            ? 'bg-accent/15 text-accent border border-accent/20'
            : 'text-text-muted hover:bg-surface hover:text-text-primary border border-transparent'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-text-muted group-hover:text-text-primary')} />
        <span className="flex-1 truncate">{label}</span>
        {badgeCount != null && badgeCount > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger text-white text-xs font-bold px-1">
            {badgeCount}
          </span>
        )}
      </span>
    </Link>
  )
}

function NotificationBell({ stockCount, ordersCount }: { stockCount: number; ordersCount: number }) {
  const [open, setOpen] = useState(false)
  const total = stockCount + ordersCount

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-danger text-white text-xs font-bold">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-border bg-card shadow-2xl p-2">
          <p className="text-xs font-semibold text-text-muted px-2 py-1.5">Notificações</p>
          {total === 0 ? (
            <p className="text-xs text-text-muted px-2 py-3 text-center">Nenhuma notificação</p>
          ) : (
            <div className="space-y-1">
              {stockCount > 0 && (
                <Link href="/inventory">
                  <span onClick={() => setOpen(false)} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface cursor-pointer transition-colors">
                    <div className="h-7 w-7 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                      <Package className="h-3.5 w-3.5 text-warning" />
                    </div>
                    <p className="text-xs text-text-primary"><span className="font-semibold">{stockCount}</span> items com stock baixo</p>
                  </span>
                </Link>
              )}
              {ordersCount > 0 && (
                <Link href="/orders">
                  <span onClick={() => setOpen(false)} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface cursor-pointer transition-colors">
                    <div className="h-7 w-7 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                      <ShoppingCart className="h-3.5 w-3.5 text-orange-400" />
                    </div>
                    <p className="text-xs text-text-primary"><span className="font-semibold">{ordersCount}</span> encomendas a caminho</p>
                  </span>
                </Link>
              )}
            </div>
          )}
          <button onClick={() => setOpen(false)} className="absolute top-2 right-2 p-0.5 text-text-muted hover:text-text-primary">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

interface LayoutProps { children: ReactNode }

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const lowStockCount = useLowStockCount()
  const inTransitCount = useInTransitCount()
  const [mobileOpen, setMobileOpen] = useState(false)

  const avatar = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.full_name ?? user?.email ?? ''

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        {settings.logo_url ? (
          <img src={settings.logo_url} alt={settings.company_name} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <img src="/revtech-logo.png" alt="RevTech" className="h-8 w-8 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div>
          <span className="text-base font-bold text-text-primary tracking-tight">{settings.company_name}</span>
          <p className="text-xs text-text-muted leading-none mt-0.5">{settings.company_subtitle}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            badgeCount={
              item.badge === 'stock' ? lowStockCount :
              item.badge === 'orders' ? inTransitCount :
              undefined
            }
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* User + Settings */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-3 px-2 py-1.5">
          {avatar ? (
            <img src={avatar} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">{name}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
          <NotificationBell stockCount={lowStockCount} ordersCount={inTransitCount} />
        </div>

        {/* Settings link */}
        <Link href="/settings">
          <span
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-text-primary transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-danger transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Terminar sessão
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-[#13151f] shrink-0">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-[#13151f] border-r border-border">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.company_name} className="h-7 w-7 rounded-md object-cover" />
            ) : (
              <img src="/revtech-logo.png" alt="RevTech" className="h-7 w-7 rounded-md object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            <span className="font-bold text-text-primary">{settings.company_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell stockCount={lowStockCount} ordersCount={inTransitCount} />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-text-muted hover:text-text-primary p-1">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export function StockAlert({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-warning mb-4">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span><strong>{count}</strong> {count === 1 ? 'item' : 'itens'} com stock abaixo do mínimo</span>
    </div>
  )
}
