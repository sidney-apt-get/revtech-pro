// Translations for Assistant and other components
export const translations = {
  'pt-BR': {
    // Assistant Page
    assistantTitle: 'Assistente de Bancada',
    assistantSubtitle: '4 super-poderes para sua oficina',

    // How to use
    howToUseTitle: '🚀 Como usar',
    howToUseDescription: 'Abra o Cowork e digite o comando da skill que deseja usar. Cada skill funciona de forma independente e integra automaticamente com RevTech PRO.',

    // Skills
    createProjectTitle: '📝 Criar Projeto',
    createProjectDesc: 'Registrar novo equipamento + gerar ticket automático',

    diagnosticTitle: '🔍 Diagnosticar',
    diagnosticDesc: 'Analisar foto + defeito + sugerir solução (Gemini Pro)',

    repairGuideTitle: '🔧 Guia de Reparo',
    repairGuideDesc: 'Passos passo-a-passo + lucro estimado',

    historyTitle: '📊 Histórico',
    historyDesc: 'Ver tudo que foi feito antes + garantias',

    // Commands
    createProjectCmd: '/criar-projeto',
    diagnosticCmd: '/diagnosticar',
    repairGuideCmd: '/guia-reparacao',
    historyCmd: '/historico-equip',

    // Times
    timeMin: 'min',

    // Documentation
    documentationTitle: '📚 Documentação',
    documentationDesc: 'Todos os detalhes sobre como usar cada skill estão documentados.',
    viewDocumentation: 'Ver documentação no Google Drive →',

    // Next Steps
    nextStepsTitle: '💡 Próximos Passos',
    nextStepsDesc: 'Teste as skills e dê feedback para otimizarmos a integração.',
    openFeedback: 'Abrir formulário de feedback →',

    // Benefits
    benefitsTitle: '✨ Benefícios Quantificados',
    savedHours: '-10h',
    savedHoursDesc: 'economizadas por mês',
    savedHoursDetail: 'criar projeto em 2 min, não 15',

    accuracy: '+30%',
    accuracyDesc: 'maior taxa de acerto',
    accuracyDetail: 'diagnóstico com IA + histórico',

    control: '100%',
    controlDesc: 'controle financeiro',
    controlDetail: 'saber lucro por equipamento',

    // Alert
    languageSelect: 'Selecionar idioma',
  },

  'en-GB': {
    // Assistant Page
    assistantTitle: 'Workbench Assistant',
    assistantSubtitle: '4 superpowers for your workshop',

    // How to use
    howToUseTitle: '🚀 How to use',
    howToUseDescription: 'Open Cowork and type the skill command you want to use. Each skill works independently and integrates automatically with RevTech PRO.',

    // Skills
    createProjectTitle: '📝 Create Project',
    createProjectDesc: 'Register new equipment + auto-generate ticket',

    diagnosticTitle: '🔍 Diagnose',
    diagnosticDesc: 'Analyse photo + defect + suggest solution (Gemini Pro)',

    repairGuideTitle: '🔧 Repair Guide',
    repairGuideDesc: 'Step-by-step instructions + estimated profit',

    historyTitle: '📊 History',
    historyDesc: 'See everything done before + warranties',

    // Commands
    createProjectCmd: '/create-project',
    diagnosticCmd: '/diagnose',
    repairGuideCmd: '/repair-guide',
    historyCmd: '/equipment-history',

    // Times
    timeMin: 'min',

    // Documentation
    documentationTitle: '📚 Documentation',
    documentationDesc: 'All details about how to use each skill are documented.',
    viewDocumentation: 'View documentation on Google Drive →',

    // Next Steps
    nextStepsTitle: '💡 Next Steps',
    nextStepsDesc: 'Test the skills and provide feedback to optimise integration.',
    openFeedback: 'Open feedback form →',

    // Benefits
    benefitsTitle: '✨ Quantified Benefits',
    savedHours: '-10h',
    savedHoursDesc: 'saved per month',
    savedHoursDetail: 'create project in 2 min, not 15',

    accuracy: '+30%',
    accuracyDesc: 'higher accuracy rate',
    accuracyDetail: 'AI diagnosis + history',

    control: '100%',
    controlDesc: 'financial control',
    controlDetail: 'know profit per equipment',

    // Alert
    languageSelect: 'Select language',
  }
};

export type Language = 'pt-BR' | 'en-GB';
