import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/supabase'

export function useCategories(context?: 'project' | 'inventory') {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        let result = (data as Category[]) || []
        if (context === 'project') result = result.filter(c => c.context === 'project' || c.context === 'both')
        if (context === 'inventory') result = result.filter(c => c.context === 'inventory' || c.context === 'both')
        setCategories(result)
        setLoading(false)
      })
  }, [context])

  return { categories, loading }
}
