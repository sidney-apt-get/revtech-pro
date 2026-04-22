import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const [, setLocation] = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setLocation('/')
      } else {
        setLocation('/login')
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
      <p className="text-white">A autenticar...</p>
    </div>
  )
}
