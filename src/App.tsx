import { Switch, Route, Redirect } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { Inventory } from '@/pages/Inventory'
import { Contacts } from '@/pages/Contacts'
import { Analytics } from '@/pages/Analytics'
import { Map } from '@/pages/Map'
import AuthCallback from '@/pages/AuthCallback'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
        <p className="text-text-muted text-sm">A carregar...</p>
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

function Public({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Redirect to="/dashboard" />
  return <>{children}</>
}

export default function App() {
  return (
    <Switch>
      <Route path="/"><Redirect to="/dashboard" /></Route>
      <Route path="/login">
        <Public><Login /></Public>
      </Route>
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/dashboard">
        <Protected><Dashboard /></Protected>
      </Route>
      <Route path="/projects">
        <Protected><Projects /></Protected>
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
      <Route><Redirect to="/dashboard" /></Route>
    </Switch>
  )
}
