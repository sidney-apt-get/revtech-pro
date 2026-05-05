import { supabase } from '@/lib/supabase'

export async function translateText(text: string, targetLang: 'pt' | 'en'): Promise<string | null> {
  try {
    const targetLanguage = targetLang === 'en' ? 'English' : 'Portuguese'
    const { data, error } = await supabase.functions.invoke('ai-analyze', {
      body: { type: 'translate', text, targetLanguage },
    })
    if (error || !data?.result) return null
    return data.result as string
  } catch {
    return null
  }
}
