import { useState, useEffect } from 'react'
import { Language, translations } from '@/i18n/translations'

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('pt-BR')

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('revtech-language') as Language | null
    if (savedLanguage && (savedLanguage === 'pt-BR' || savedLanguage === 'en-GB')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Save language preference when it changes
  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage)
    localStorage.setItem('revtech-language', newLanguage)
  }

  // Get translations for current language
  const t = translations[language]

  return {
    language,
    changeLanguage,
    t,
    availableLanguages: ['pt-BR', 'en-GB'] as const
  }
}
