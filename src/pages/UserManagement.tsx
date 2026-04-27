import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { type Role } from '@/contexts/RoleContext'
import { fmtDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Users, Save, Shield, Wrench, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface UserRow {
  id: string
  user_id: string
  role: Role
  email: string | null
  display_name: string | null
  avatar_url: string | null
  last_seen: string | null
  created_at: string
}

const ROLE_COLORS: Record<Role, { icon: typeof Shield; color: string }> = {
  admin:      { icon: Shield, color: 'text-accent bg-accent/15 border-accent/30' },
  technician: { icon: Wrench, color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' },
  viewer:     { icon: Eye,    color: 'text-text-muted bg-surface border-border' },
}

export function UserManagement() {
  const { t } = useTranslation()

  const ROLE_LABELS: Record<Role, { label: string; icon: typeof Shield; color: string }> = {
    admin:      { label: t('roles.admin'),      ...ROLE_COLORS.admin },
    technician: { label: t('roles.technician'), ...ROLE_COLORS.technician },
    viewer:     { label: t('roles.viewer'),     ...ROLE_COLORS.viewer },
  }
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: true })
      setUsers((data as UserRow[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function setRole(userId: string, role: Role) {
    setPendingRoles(p => ({ ...p, [userId]: role }))
  }

  function getRole(user: UserRow): Role {
    return pendingRoles[user.user_id] ?? user.role
  }

  async function handleSave() {
    if (Object.keys(pendingRoles).length === 0) return
    setSaving(true)
    await Promise.all(
      Object.entries(pendingRoles).map(([userId, role]) =>
        supabase.from('user_roles').update({ role }).eq('user_id', userId)
      )
    )
    setUsers(prev => prev.map(u => ({
      ...u,
      role: pendingRoles[u.user_id] ?? u.role,
    })))
    setPendingRoles({})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasPending = Object.keys(pendingRoles).length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            {t('admin.userManagement')}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {t('admin.userCount', { count: users.length })}
          </p>
        </div>
        {hasPending && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? t('admin.saving') : saved ? t('admin.saved') : t('admin.saveChanges', { count: Object.keys(pendingRoles).length })}
          </button>
        )}
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(ROLE_LABELS) as [Role, typeof ROLE_LABELS[Role]][]).map(([r, { label, icon: Icon, color }]) => (
          <div key={r} className={cn('flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium', color)}>
            <Icon className="h-3.5 w-3.5" />
            {label} — {t(`admin.roleAccess.${r}`)}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">{t('admin.loading')}</div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-text-muted opacity-30 mx-auto mb-3" />
            <p className="text-sm text-text-muted">{t('admin.noUsers')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map(user => {
            const currentRole = getRole(user)
            const changed = pendingRoles[user.user_id] !== undefined
            const { label: roleLabel, icon: RoleIcon, color: roleColor } = ROLE_LABELS[currentRole]

            return (
              <Card key={user.id} className={cn('transition-all', changed && 'border-accent/40 shadow-md shadow-accent/5')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Avatar */}
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name ?? ''} className="h-10 w-10 rounded-full object-cover ring-2 ring-border shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold shrink-0">
                        {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {user.display_name ?? user.email ?? user.user_id}
                      </p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                      <p className="text-xs text-text-muted">
                        {t('admin.lastSeen')}: {user.last_seen ? fmtDate(user.last_seen) : '—'}
                        {' · '}{t('admin.registered')}: {fmtDate(user.created_at)}
                      </p>
                    </div>

                    {/* Current role badge */}
                    <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0', roleColor)}>
                      <RoleIcon className="h-3 w-3" />
                      {roleLabel}
                      {changed && <span className="ml-1 text-accent">*</span>}
                    </div>

                    {/* Role selector */}
                    <select
                      value={currentRole}
                      onChange={e => setRole(user.user_id, e.target.value as Role)}
                      className="rounded-lg bg-surface border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 shrink-0"
                    >
                      <option value="admin">{t('roles.admin')}</option>
                      <option value="technician">{t('roles.technician')}</option>
                      <option value="viewer">{t('roles.viewer')}</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {hasPending && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-2xl hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? t('admin.saving') : t('admin.saveChanges', { count: Object.keys(pendingRoles).length })}
          </button>
        </div>
      )}
    </div>
  )
}
