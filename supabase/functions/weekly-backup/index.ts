// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_BACKUPS = 8

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const { data: settings } = await admin.from('app_settings').select('user_id')
    if (!settings?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No users to back up' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const results = []

    for (const { user_id } of settings) {
      try {
        const [projects, inventory, contacts, orders] = await Promise.all([
          admin.from('projects').select('*').eq('user_id', user_id),
          admin.from('inventory_items').select('*').eq('user_id', user_id),
          admin.from('contacts').select('*').eq('user_id', user_id),
          admin.from('parts_orders').select('*').eq('user_id', user_id),
        ])

        const backup = {
          version: '1.0',
          createdAt: new Date().toISOString(),
          userId: user_id,
          data: {
            projects: projects.data ?? [],
            inventory: inventory.data ?? [],
            contacts: contacts.data ?? [],
            orders: orders.data ?? [],
          },
        }

        const dateStr = new Date().toISOString().split('T')[0]
        const path = `${user_id}/backup-${dateStr}.json`

        await admin.storage
          .from('revtech-backups')
          .upload(path, JSON.stringify(backup), {
            contentType: 'application/json',
            upsert: true,
          })

        // Prune old backups — keep last MAX_BACKUPS
        const { data: files } = await admin.storage
          .from('revtech-backups')
          .list(user_id, { sortBy: { column: 'created_at', order: 'desc' } })

        if (files && files.length > MAX_BACKUPS) {
          const toRemove = files.slice(MAX_BACKUPS).map((f: any) => `${user_id}/${f.name}`)
          await admin.storage.from('revtech-backups').remove(toRemove)
        }

        // Update last_backup_at in app_settings
        await admin.from('app_settings')
          .update({ last_backup_at: new Date().toISOString() })
          .eq('user_id', user_id)

        results.push({ userId: user_id, ok: true })
      } catch (err: any) {
        results.push({ userId: user_id, ok: false, error: err.message })
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
