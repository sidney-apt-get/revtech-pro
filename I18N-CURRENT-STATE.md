# 📍 Estado Atual da Internacionalização (i18n)

**Data:** 09/05/2026  
**Status:** ✅ Otimizado para caso de uso atual  
**Próxima revisão:** Quando múltiplos usuários EN entrarem no sistema

---

## 👤 Contexto Atual

### Usuários do Sistema
- **Primário:** Sidney (PT-BR) — Técnico de manutenção
  - Entrada de dados em português
  - Navega todo o sistema
  - Usa Assistante em português e inglês (testes)
  
- **Secundário:** Usuário EN (futuro)
  - Apenas parte de Finanças (análises)
  - Não navega formulários de entrada
  - Usará quando sistema expandir

---

## 🏗️ Arquitetura i18n Atual (Não Sincronizada)

### Sistema 1: Assistante (✅ Completo)
```
Hook: useLanguage() — Custom
Storage: localStorage['revtech-language']
Suporte: pt-BR, en-GB
Cobertura: Apenas src/pages/Assistant.tsx
Status: ✅ Pronto para produção
```

### Sistema 2: Resto do App (⚠️ Não Sincronizado)
```
Hook: useTranslation() — react-i18next
Storage: Configuração interna de i18next
Suporte: Múltiplos idiomas (config não visível)
Cobertura: Dashboard, Projects, Inventory, Finances, etc.
Status: ✅ Funciona, mas não sincroniza com Assistante
```

---

## ⚠️ Por Que NÃO Sincronizar Agora?

### 1. Caso de Uso Atual
```
Sidney (PT-BR) é o ÚNICO usuário ativo
├─ Usa Dashboard em PT-BR ✅
├─ Usa Projects em PT-BR ✅
├─ Usa Inventory em PT-BR ✅
└─ Usa Assistante em PT-BR ✅

Resultado: Zero impacto — tudo funciona perfeitamente
```

### 2. Custo-Benefício
```
Sincronizar agora:
- Tempo: 5-6 horas
- Risco: Possíveis bugs em refatoração
- Benefício: ZERO (usuário único PT)

Sincronizar quando necessário:
- Tempo: 5-6 horas (mesmo tempo, mas depois)
- Risco: ZERO (não toca agora)
- Benefício: 100% (múltiplos usuários EN existem)
```

### 3. Prioridades Atuais
```
🔴 CRÍTICO AGORA:
  - Tradução automática de campos do usuário (Google API)
  - Garantir dados PT traduzidos para EN

🟢 IMPORTANTE MAS NÃO-URGENTE:
  - Sincronização global de idioma
  - Seletor de idioma em Dashboard
  - Pode esperar 3-6 meses
```

---

## 🎯 Plano Atual (Próximas 2 Semanas)

### ✅ FAZER AGORA
- [ ] Implementar Google Translator API
- [ ] Criar tabela `translated_fields` em Supabase
- [ ] Traduzir campos críticos:
  - `equipment` (Projects)
  - `defect_description` (Projects)
  - `diagnosis` (Projects)
  - `item_name` (Inventory)
  - `supplier_name` (Projects)

### ⏸️ DEIXAR PRONTO (Não executar)
- [ ] Documentação em `I18N-FUTURE-MIGRATION.md`
- [ ] Checklist passo-a-passo para sincronização
- [ ] Estimativa de esforço
- [ ] Pontos de integração identificados

---

## 🔮 Situação Futura (3-6 Meses)

### Quando Sincronizar?

**SINAL 1:** Usuário EN começa a usar Finanças regularmente
```
Comportamento:
- Acessa Dashboard em inglês
- Vê textos em português (confuso)
- Reclama: "Tudo está em português!"

Ação: Sincronizar i18n (Fase 1-6 de I18N-FUTURE-MIGRATION.md)
```

**SINAL 2:** Usuário EN navega Projects/Inventory
```
Comportamento:
- Quer ver equipamentos que comprou
- Vê descrições em português
- Quer exibição em inglês

Ação: Implementar sincronização + Google Translator API (Fase 7)
```

**SINAL 3:** Múltiplos usuários EN simultâneos
```
Comportamento:
- 2+ pessoas em EN navegando app
- UI inconsistente (algumas em PT, algumas em EN)
- Experiência ruim

Ação: Executar I18N-FUTURE-MIGRATION.md completamente
```

---

## 📊 Comparação: Hoje vs Futuro

| Aspecto | Hoje (Caso Atual) | Futuro (Multi-usuário) |
|---------|------------------|----------------------|
| **Usuários PT** | 1 (Sidney) | 1 (Sidney) |
| **Usuários EN** | 0 | 2+ |
| **Sincronização i18n** | ❌ Não precisa | ✅ Crítico |
| **Tradução de campos** | ⚠️ Planejada | ✅ Implementada |
| **UI consistente** | ✅ PT em tudo | ✅ Respeta escolha |
| **Tempo de implementação** | 0h (não faz) | 5-6h (quando chegar) |

---

## 🚀 Próximas Ações

### Esta Semana
1. Implementar Google Translator API (3-4 horas)
2. Criar tabela `translated_fields`
3. Testar tradução com 2-3 campos
4. Deploy

### Próximas 2-4 Semanas
1. Expandir tradução para todos os campos críticos
2. QA completo em produção
3. Documentar casos edge (textos longos, emojis, etc.)

### Quando Usuário EN Ativar
1. Consultar `I18N-FUTURE-MIGRATION.md`
2. Seguir passo-a-passo
3. Executar em ~1 dia de trabalho

---

## 📝 Notas Técnicas

### Estrutura de Idiomas (Não Sincronizada = OK Agora)

```
App.tsx
├─ Assistante.tsx
│  └─ useLanguage() ← Seletor local PT/EN
│
├─ Dashboard.tsx
│  └─ useTranslation() ← Sempre PT
│
├─ Projects.tsx
│  └─ useTranslation() ← Sempre PT
│
└─ Inventory.tsx
   └─ useTranslation() ← Sempre PT
```

**Problema:** Dois hooks, dois storages, sem comunicação
**Solução quando necessário:** Criar LanguageContext global (veja I18N-FUTURE-MIGRATION.md)

---

## ✅ Checklist: Quando Expandir

Sincronizar i18n quando **TODOS** os seguintes forem verdadeiros:

- [ ] Usuário EN acessando Dashboard regularmente
- [ ] Reclamações sobre UI em português
- [ ] 2+ usuários EN simultâneos esperado
- [ ] Tempo disponível: 5-6 horas contínuas
- [ ] Ambiente de teste configurado
- [ ] Backup de dados feito

---

## 📞 Pontos de Contato Futuros

Se precisar sincronizar no futuro:

1. **Leia:** `I18N-FUTURE-MIGRATION.md` (tudo documentado)
2. **Estime:** 5-6 horas de trabalho
3. **Testes:** Testar com usuários PT e EN em paralelo
4. **Deploy:** Depois de validado em staging

---

**Última revisão:** 2026-05-09  
**Próxima revisão recomendada:** Quando usuário EN começar a usar Dashboard  
**Proprietário:** Sidney (você)  
**Status:** ✅ Congelado até necessário sincronizar
