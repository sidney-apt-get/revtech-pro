import { Wand2, Plus, Search, Settings, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'
import { Language } from '@/i18n/translations'

export function Assistant() {
  const { language, changeLanguage, t, availableLanguages } = useLanguage()

  const skills = [
    {
      id: 'criar-projeto',
      titleKey: 'createProjectTitle',
      descKey: 'createProjectDesc',
      icon: Plus,
      commandKey: 'createProjectCmd',
      color: 'bg-blue-500/10 border-blue-500/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      time: '2 min'
    },
    {
      id: 'diagnosticar',
      titleKey: 'diagnosticTitle',
      descKey: 'diagnosticDesc',
      icon: Search,
      commandKey: 'diagnosticCmd',
      color: 'bg-purple-500/10 border-purple-500/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      time: '5 min'
    },
    {
      id: 'guia-reparacao',
      titleKey: 'repairGuideTitle',
      descKey: 'repairGuideDesc',
      icon: Settings,
      commandKey: 'repairGuideCmd',
      color: 'bg-orange-500/10 border-orange-500/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      time: '3 min'
    },
    {
      id: 'historico-equip',
      titleKey: 'historyTitle',
      descKey: 'historyDesc',
      icon: Clock,
      commandKey: 'historyCmd',
      color: 'bg-green-500/10 border-green-500/20',
      textColor: 'text-green-600 dark:text-green-400',
      time: '2 min'
    }
  ]

  const handleOpenCowork = (skillCommand: string) => {
    const message = language === 'pt-BR'
      ? `Para usar esta skill, abra o Cowork e digite:\n\n${skillCommand}\n\nEspere, vamos integração melhor em breve!`
      : `To use this skill, open Cowork and type:\n\n${skillCommand}\n\nWait, better integration coming soon!`
    alert(message)
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 p-2 rounded-lg border border-accent/20">
            <Wand2 className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t.assistantTitle}</h1>
            <p className="text-sm text-text-muted">{t.assistantSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-accent mb-1">{t.howToUseTitle}</h3>
            <p className="text-sm text-text-muted">
              {language === 'pt-BR' ? (
                <>
                  Abra o <strong>Cowork</strong> e digite o comando da skill que deseja usar.
                  Cada skill funciona de forma independente e integra automaticamente com RevTech PRO.
                </>
              ) : (
                <>
                  Open <strong>Cowork</strong> and type the skill command you want to use.
                  Each skill works independently and integrates automatically with RevTech PRO.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => {
          const Icon = skill.icon
          const title = t[skill.titleKey as keyof typeof t] as string
          const desc = t[skill.descKey as keyof typeof t] as string
          const command = t[skill.commandKey as keyof typeof t] as string

          return (
            <Card
              key={skill.id}
              className={`p-5 border cursor-pointer transition-all hover:shadow-lg hover:border-accent/50 ${skill.color}`}
              onClick={() => handleOpenCowork(command)}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary text-lg">{title}</h3>
                    <p className="text-sm text-text-muted mt-1">{desc}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${skill.textColor} flex-shrink-0`} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <code className="text-xs bg-background px-2 py-1 rounded font-mono text-text-primary">
                      {command}
                    </code>
                  </div>
                  <div className="text-xs text-text-muted">
                    ⏱️ {skill.time}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card className="p-5 bg-blue-500/5 border-blue-500/20">
          <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">{t.documentationTitle}</h3>
          <p className="text-sm text-text-muted mb-3">
            {t.documentationDesc}
          </p>
          <a
            href="https://drive.google.com/drive/folders/1lAQc0WzV1aKvXZU-579_Dzuou-Dhj6KU"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t.viewDocumentation}
          </a>
        </Card>

        <Card className="p-5 bg-purple-500/5 border-purple-500/20">
          <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">{t.nextStepsTitle}</h3>
          <p className="text-sm text-text-muted mb-3">
            {t.nextStepsDesc}
          </p>
          <button
            onClick={() => {
              const msg = language === 'pt-BR'
                ? 'Integração visual em desenvolvimento!'
                : 'Visual integration in development!'
              alert(msg)
            }}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            {t.openFeedback}
          </button>
        </Card>
      </div>

      {/* Benefits */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="font-semibold text-text-primary mb-4">{t.benefitsTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-accent">{t.savedHours}</div>
            <p className="text-sm text-text-muted">{t.savedHoursDesc}</p>
            <p className="text-xs text-text-muted mt-1">{t.savedHoursDetail}</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">{t.accuracy}</div>
            <p className="text-sm text-text-muted">{t.accuracyDesc}</p>
            <p className="text-xs text-text-muted mt-1">{t.accuracyDetail}</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">{t.control}</div>
            <p className="text-sm text-text-muted">{t.controlDesc}</p>
            <p className="text-xs text-text-muted mt-1">{t.controlDetail}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
