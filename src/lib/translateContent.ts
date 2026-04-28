import { supabase } from './supabase'

export async function translateText(text: string, targetLang: 'pt' | 'en'): Promise<string> {
  if (!text || text.trim().length < 3) return text
  const { data, error } = await supabase.functions.invoke('ai-analyze', {
    body: {
      type: 'translate',
      text,
      targetLanguage: targetLang === 'en' ? 'British English' : 'Portuguese (European)',
    },
  })
  if (error || !data?.result) return text
  return data.result
}
