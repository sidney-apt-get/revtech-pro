import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CategoryField } from '@/lib/supabase'

export function useCategoryFields(categorySlug: string | null) {
  const [fields, setFields] = useState<CategoryField[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!categorySlug) { setFields([]); return }
    setLoading(true)
    supabase
      .from('category_fields')
      .select('*')
      .eq('category_slug', categorySlug)
      .order('sort_order')
      .then(({ data }) => {
        setFields((data as CategoryField[]) || [])
        setLoading(false)
      })
  }, [categorySlug])

  return { fields, loading }
}
