import { Wand2, Plus, Search, Settings, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function Assistant() {

  const skills = [
    {
      id: 'criar-projeto',
      title: '📝 Criar Projeto',
      description: 'Registrar novo equipamento + gerar ticket automático',
      icon: Plus,
      command: '/criar-projeto',
      color: 'bg-blue-500/10 border-blue-500/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      time: '2 min'
    },
    {
      id: 'diagnosticar',
      title: '🔍 Diagnosticar',
      description: 'Analisar foto + defeito + sugerir solução (Gemini Pro)',
      icon: Search,
      command: '/diagnosticar',
      color: 'bg-purple-500/10 border-purple-500/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      time: '5 min'
    },
    {
      id: 'guia-reparacao',
      title: '🔧 Guia de Reparo',
      description: 'Passos passo-a-passo + lucro estimado',
      icon: Settings,
      command: '/guia-reparacao',
      color: 'bg-orange-500/10 border-orange-500/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      time: '3 min'
    },
    {
      id: 'historico-equip',
      title: '📊 Histórico',
      description: 'Ver tudo que foi feito antes + garantias',
      icon: Clock,
      command: '/historico-equip',
      color: 'bg-green-500/10 border-green-500/20',
      textColor: 'text-green-600 dark:text-green-400',
      time: '2 min'
    }
  ]

  const handleOpenCowork = (skillCommand: string) => {
    // Instruções para o usuário abrir o Cowork
    alert(`Para usar esta skill, abra o Cowork e digite:\n\n${skillCommand}\n\nEspere, vamos integração melhor em breve!`)
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
            <h1 className="text-2xl font-bold text-text-primary">Assistente de Bancada</h1>
            <p className="text-sm text-text-muted">4 super-poderes para sua oficina</p>
          </div>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-accent mb-1">🚀 Como usar</h3>
            <p className="text-sm text-text-muted">
              Abra o <strong>Cowork</strong> e digite o comando da skill que deseja usar.
              Cada skill funciona de forma independente e integra automaticamente com RevTech PRO.
            </p>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => {
          const Icon = skill.icon
          return (
            <Card
              key={skill.id}
              className={`p-5 border cursor-pointer transition-all hover:shadow-lg hover:border-accent/50 ${skill.color}`}
              onClick={() => handleOpenCowork(skill.command)}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary text-lg">{skill.title}</h3>
                    <p className="text-sm text-text-muted mt-1">{skill.description}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${skill.textColor} flex-shrink-0`} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <code className="text-xs bg-background px-2 py-1 rounded font-mono text-text-primary">
                      {skill.command}
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
          <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">📚 Documentação</h3>
          <p className="text-sm text-text-muted mb-3">
            Todos os detalhes sobre como usar cada skill estão documentados.
          </p>
          <a
            href="https://drive.google.com/drive/folders/1lAQc0WzV1aKvXZU-579_Dzuou-Dhj6KU"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver documentação no Google Drive →
          </a>
        </Card>

        <Card className="p-5 bg-purple-500/5 border-purple-500/20">
          <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">💡 Próximos Passos</h3>
          <p className="text-sm text-text-muted mb-3">
            Teste as skills e dê feedback para otimizarmos a integração.
          </p>
          <button
            onClick={() => alert('Integração visual em desenvolvimento!')}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Abrir formulário de feedback →
          </button>
        </Card>
      </div>

      {/* Benefits */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        <h3 className="font-semibold text-text-primary mb-4">✨ Benefícios Quantificados</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-accent">-10h</div>
            <p className="text-sm text-text-muted">economizadas por mês</p>
            <p className="text-xs text-text-muted mt-1">criar projeto em 2 min, não 15</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">+30%</div>
            <p className="text-sm text-text-muted">maior taxa de acerto</p>
            <p className="text-xs text-text-muted mt-1">diagnóstico com IA + histórico</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">100%</div>
            <p className="text-sm text-text-muted">controle financeiro</p>
            <p className="text-xs text-text-muted mt-1">saber lucro por equipamento</p>
          </div>
        </div>
      </div>
    </div>
  )
}
