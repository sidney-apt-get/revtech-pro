import { Switch, Route, Redirect } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/contexts/RoleContext'
import { Layout } from '@/components/Layout'
import { PinProtection } from '@/components/PinProtection'
import { PWAInstallBanner } from '@/components/PWAInstallBanner'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { Inventory } from '@/pages/Inventory'
import { Contacts } from '@/pages/Contacts'
import { Analytics } from '@/pages/Analytics'
import { Map } from '@/pages/Map'
import { DefectDatabase } from '@/pages/DefectDatabase'
import { PartsOrders } from '@/pages/PartsOrders'
import { Reports } from '@/pages/Reports'
import { Settings } from '@/pages/Settings'
import { UserManagement } from '@/pages/UserManagement'
import { EbaySearch } from '@/pages/EbaySearch'
import { Labels } from '@/pages/Labels'
import { SerialHistory } from '@/pages/SerialHistory'
import { Warranties } from '@/pages/Warranties'
import { ProjectDetails } from '@/pages/ProjectDetails'
import { Finances } from '@/pages/Finances'
import { Lots } from '@/pages/Lots'
import MobileCamera from '@/pages/MobileCamera'
import ScannerPhone from '@/pages/ScannerPhone'
import AuthCallback from '@/pages/AuthCallback'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { RoleProvider } from '@/contexts/RoleContext'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
        <p className="text-text-muted text-sm">Loading…</p>
      </div>
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Redirect to="/login" />
  return <Layout>{children}</Layout>
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: roleLoading } = useRole()
  if (authLoading || roleLoading) return <Spinner />
  if (!user) return <Redirect to="/login" />
  if (!isAdmin) return <Redirect to="/dashboard" />
  return (
    <Layout>
      <PinProtection>
        {children}
      </PinProtection>
    </Layout>
  )
}

function Public({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Redirect to="/dashboard" />
  return <>{children}</>
}

export default function App() {
  return (
    <SettingsProvider>
      <RoleProvider>
        <Switch>
          <Route path="/"><Redirect to="/dashboard" /></Route>
          <Route path="/login">
            <Public><Login /></Public>
          </Route>
          <Route path="/auth/callback" component={AuthCallback} />
          <Route path="/camera/:token" component={MobileCamera} />
          <Route path="/scanner/:token" component={ScannerPhone} />
          <Route path="/dashboard">
            <Protected><Dashboard /></Protected>
          </Route>
          <Route path="/projects">
            <Protected><Projects /></Protected>
          </Route>
          <Route path="/projects/:id">
            <Protected><ProjectDetails /></Protected>
          </Route>
          <Route path="/finances">
            <Protected><Finances /></Protected>
          </Route>
          <Route path="/inventory">
            <Protected><Inventory /></Protected>
          </Route>
          <Route path="/contacts">
            <Protected><Contacts /></Protected>
          </Route>
          <Route path="/analytics">
            <Protected><Analytics /></Protected>
          </Route>
          <Route path="/map">
            <Protected><Map /></Protected>
          </Route>
          <Route path="/defects">
            <Protected><DefectDatabase /></Protected>
          </Route>
          <Route path="/orders">
            <Protected><PartsOrders /></Protected>
          </Route>
          <Route path="/reports">
            <Protected><Reports /></Protected>
          </Route>
          <Route path="/ebay">
            <Protected><EbaySearch /></Protected>
          </Route>
          <Route path="/labels">
            <Protected><Labels /></Protected>
          </Route>
          <Route path="/serial-history">
            <Protected><SerialHistory /></Protected>
          </Route>
          <Route path="/warranties">
            <Protected><Warranties /></Protected>
          </Route>
          <Route path="/lots">
            <Protected><Lots /></Protected>
          </Route>
          {/* Admin-only routes — require isAdmin + PIN */}
          <Route path="/settings">
            <ProtectedAdmin><Settings /></ProtectedAdmin>
          </Route>
          <Route path="/admin/users">
            <ProtectedAdmin><UserManagement /></ProtectedAdmin>
          </Route>
          <Route><Redirect to="/dashboard" /></Route>
        </Switch>
        <PWAInstallBanner />
      </RoleProvider>
    </SettingsProvider>
  )
}
