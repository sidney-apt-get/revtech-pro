import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useItemFieldValues(itemId: string | null, itemType: 'project' | 'inventory') {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!itemId) { setValues({}); return }
    supabase
      .from('item_field_values')
      .select('field_key, value')
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        for (const row of data) {
          if (row.field_key && row.value != null) map[row.field_key] = row.value
        }
        setValues(map)
      })
  }, [itemId, itemType])

  return values
}

export async function saveItemFieldValues(
  itemId: string,
  itemType: 'project' | 'inventory',
  values: Record<string, string>,
) {
  const entries = Object.entries(values).filter(([, v]) => v !== '' && v != null)
  if (entries.length === 0) return
  await supabase.from('item_field_values').delete().eq('item_id', itemId).eq('item_type', itemType)
  await supabase.from('item_field_values').insert(
    entries.map(([field_key, value]) => ({ item_id: itemId, item_type: itemType, field_key, value: String(value) }))
  )
}
