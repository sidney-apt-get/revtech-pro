import { supabase } from './supabase'

const FOLDER_NAME = 'RevTech PRO Backups'
const MAX_BACKUPS = 8

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.provider_token ?? null
}

async function driveRequest(path: string, options: RequestInit, token: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (res.status === 403) throw new Error('drive_scope_missing')
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

async function findOrCreateFolder(token: string): Promise<string> {
  const query = encodeURIComponent(
    `name="${FOLDER_NAME}" and mimeType="application/vnd.google-apps.folder" and trashed=false`
  )
  const data = await driveRequest(
    `/files?q=${query}&fields=files(id,name)`,
    {},
    token,
  )
  if (data?.files?.length > 0) return data.files[0].id

  const created = await driveRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  }, token)
  return created.id
}

async function pruneOldBackups(token: string, folderId: string) {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const data = await driveRequest(
    `/files?q=${query}&orderBy=createdTime+desc&fields=files(id,createdTime)`,
    {},
    token,
  )
  const files: Array<{ id: string }> = data?.files ?? []
  if (files.length > MAX_BACKUPS) {
    await Promise.all(
      files.slice(MAX_BACKUPS).map(f =>
        driveRequest(`/files/${f.id}`, { method: 'DELETE' }, token).catch(() => null)
      )
    )
  }
}

async function collectBackupData(userId: string) {
  const [projects, inventory, contacts, orders] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', userId),
    supabase.from('inventory_items').select('*').eq('user_id', userId),
    supabase.from('contacts').select('*').eq('user_id', userId),
    supabase.from('parts_orders').select('*').eq('user_id', userId),
  ])
  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    userId,
    data: {
      projects: projects.data ?? [],
      inventory: inventory.data ?? [],
      contacts: contacts.data ?? [],
      orders: orders.data ?? [],
    },
  }
}

export async function backupToGoogleDrive(): Promise<{ success: boolean; message: string }> {
  const token = await getToken()
  if (!token) return { success: false, message: 'no_token' }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'not_authenticated' }

    const backup = await collectBackupData(user.id)
    const content = JSON.stringify(backup, null, 2)
    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`

    const folderId = await findOrCreateFolder(token)
    const metadata = { name: filename, parents: [folderId] }

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([content], { type: 'application/json' }))

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)

    await pruneOldBackups(token, folderId)
    localStorage.setItem('revtech_last_backup', new Date().toISOString())

    return { success: true, message: 'drive_success' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { success: false, message: msg }
  }
}

export async function downloadBackupLocally(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const backup = await collectBackupData(user.id)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `revtech-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  localStorage.setItem('revtech_last_backup', new Date().toISOString())
}

export async function listDriveBackups(): Promise<Array<{ id: string; name: string; createdTime: string }>> {
  const token = await getToken()
  if (!token) return []
  try {
    const folderId = await findOrCreateFolder(token)
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
    const data = await driveRequest(
      `/files?q=${query}&orderBy=createdTime+desc&fields=files(id,name,createdTime)`,
      {},
      token,
    )
    return data?.files ?? []
  } catch {
    return []
  }
}

export async function restoreFromDriveBackup(fileId: string): Promise<{ success: boolean }> {
  const token = await getToken()
  if (!token) return { success: false }
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { success: false }
    const backup = await res.json()

    if (backup.data.projects?.length) await supabase.from('projects').upsert(backup.data.projects)
    if (backup.data.inventory?.length) await supabase.from('inventory_items').upsert(backup.data.inventory)
    if (backup.data.contacts?.length) await supabase.from('contacts').upsert(backup.data.contacts)
    if (backup.data.orders?.length) await supabase.from('parts_orders').upsert(backup.data.orders)

    return { success: true }
  } catch {
    return { success: false }
  }
}
