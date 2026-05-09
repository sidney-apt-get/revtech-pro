# 🌐 Guia Rápido: Internacionalização (i18n) do RevTech

**Última atualização:** 09/05/2026  
**Versão:** 1.0

---

## ⚡ RESUMO EXECUTIVO

```
┌─────────────────────────────────────────────────────┐
│ SITUAÇÃO ATUAL (09/05/2026)                         │
├─────────────────────────────────────────────────────┤
│ Assistante:       ✅ Bilíngue (PT-BR / EN-GB)      │
│ Dashboard:        ⚠️ Português apenas               │
│ Projects/Inv:     ⚠️ Português apenas               │
│ Tradução Campos:  ❌ Não existe                     │
│ Sincronização:    ❌ 2 sistemas isolados             │
│                                                       │
│ USUÁRIOS:         1 PT-BR (Sidney)                  │
│                   0 EN-GB (para futuro)             │
└─────────────────────────────────────────────────────┘
```

---

## 📋 FAZER AGORA (Próximas 2-3 Semanas)

### ✅ PRIORIDADE #1: Google Translator API

**O quê?** Traduzir automaticamente campos preenchidos pelo usuário

**Exemplo:**
```
Sidney em português preenche:
  Equipment: "iPhone 13 Pro"
  Defect: "Bateria não carrega, tela com pixels mortos"

Sistema traduz automaticamente para:
  Equipment: "iPhone 13 Pro"
  Defect: "Battery won't charge, screen with dead pixels"

Armazena ambas as versões no banco
```

**Quando será usado?**
- Quando usuário EN começar a usar Dashboard (futuro)
- Quando quiser ver dados em inglês
- Para relatórios em inglês

**Esforço:** 3-4 horas  
**Prioridade:** 🔴 CRÍTICA

---

### ⏸️ NÃO FAZER AGORA: Sincronização i18n Global

**O quê?** Sincronizar seletor de idioma em todo o app

**Por quê não AGORA?**
```
Benefício hoje:     ZERO (usuário único PT-BR)
Benefício futuro:   100% (múltiplos usuários EN)
Custo:              5-6 horas
Risco:              Bugs em refatoração
Melhor fazer:       Quando necessário (Ago/2026)
```

**Documentação pronta para quando for necessário:**
- `I18N-CURRENT-STATE.md` — Sinais de quando fazer
- `I18N-FUTURE-MIGRATION.md` — Passo-a-passo completo

---

## 🗓️ TIMELINE

### MAIO-JUN 2026 (Agora)
```
[ Google Translator API ]
├─ Criar tabela translated_fields
├─ Implementar useFieldTranslator hook
├─ Testar com campos críticos
├─ Deploy em produção
└─ Expandir para todos os campos
```

### JULHO 2026
```
[ QA e Otimização ]
├─ Testes com dados reais
├─ Performance tunning
├─ Cache de traduções
└─ Documentação final
```

### AGOSTO 2026 (Quando Usuário EN Chegar)
```
[ Sincronizar i18n Global ]
├─ Criar LanguageContext
├─ Refatorar Dashboard/Projects/Inv/Finances
├─ Adicionar seletor global
└─ Deploy
```

---

## 🔗 ARQUIVOS DE REFERÊNCIA

### Se quer entender a SITUAÇÃO ATUAL
```
→ I18N-CURRENT-STATE.md
  Por que NÃO fazer agora
  Quando fazer
  Sinais de necessidade
```

### Se quer o PLANO DETALHADO para depois
```
→ I18N-FUTURE-MIGRATION.md
  Passo-a-passo: Fases 1-9
  Código para copiar/colar
  Testes para validar
  Timeline: 5-6 horas
```

### Se quer entender a DECISÃO tomada
```
→ DECISION-LOG.md
  Por que NÃO sincronizar agora
  Análise de ROI
  Aprovação de Sidney
  Data de revisão
```

### Se quer detalhes TÉCNICOS completos
```
→ SYSTEM-AUTODIAGNOSIS.md
  Toda a análise do sistema
  Arquitetura atual
  Problemas identificados
  Soluções propostas
```

---

## 🚀 PRÓXIMAS AÇÕES

### Esta Semana
- [ ] Obter chave API do Google Translator
- [ ] Criar conta em Google Cloud
- [ ] Gerar `VITE_GOOGLE_TRANSLATE_API_KEY`
- [ ] Autorizar envio de dados ao Google

### Próximas 2-3 Semanas
- [ ] Implementar Google Translator API
- [ ] Criar tabela `translated_fields`
- [ ] Testar tradução de campos
- [ ] Deploy em produção

### Quando Usuário EN Entrar (Ago/2026)
- [ ] Consultar `I18N-FUTURE-MIGRATION.md`
- [ ] Seguir Fases 1-9
- [ ] Sincronizar i18n global
- [ ] Deploy

---

## ❓ FAQ

### P: Por que não fazer tudo agora?
**R:** Usuário único (você) em português. Sincronização beneficiaria zero pessoas hoje. Melhor gastar tempo agora em Google Translator API (que você vai usar já).

### P: Isso vai quebrar o app?
**R:** Não. Google Translator API é aditivo (não toca no código existente). Sincronização i18n está documentada para fazer depois.

### P: Como sei quando sincronizar?
**R:** Quando usuário EN começar a usar Dashboard e reclamar que tudo está em português. Estará em `I18N-CURRENT-STATE.md` os sinais.

### P: Quanto tempo leva?
**R:** Google API: 3-4h  
Sincronização i18n: 5-6h  
Total para depois: ~10h

### P: Vai aumentar custo do servidor?
**R:** Google Translator: ~$0.0001 por 100 caracteres. Se traduzir 1000 equipamentos = ~$1.00

### P: Preciso autorizar algo agora?
**R:** Sim, 2 coisas:
1. Google Cloud API (criar conta)
2. GDPR/LGPD: enviar dados do usuário ao Google

---

## ✅ Checklist: Está Tudo Pronto?

```
Documentação:
- [x] I18N-CURRENT-STATE.md ✅
- [x] I18N-FUTURE-MIGRATION.md ✅
- [x] DECISION-LOG.md ✅
- [x] README-I18N.md (este arquivo) ✅

Planejamento:
- [x] Decisão tomada ✅
- [x] Prioridades definidas ✅
- [x] Timeline clara ✅

Próximos Passos:
- [ ] Implementar Google Translator API
- [ ] Deploy em produção
```

---

## 📞 Contato & Suporte

**Se surgir dúvida:**
1. Leia `I18N-CURRENT-STATE.md` (situação atual)
2. Leia `I18N-FUTURE-MIGRATION.md` (plano detalhado)
3. Leia `DECISION-LOG.md` (por que essa decisão)

**Se precisar sincronizar agora (antes de Ago/2026):**
1. Consulte `I18N-FUTURE-MIGRATION.md`
2. Siga Fases 1-9
3. Tempo: 5-6 horas

---

**Criado em:** 2026-05-09  
**Próxima Revisão:** Quando usuário EN entrar no sistema  
**Proprietário:** Sidney  
**Status:** ✅ Documentação Completa

---

> 🎯 **Foco agora:** Google Translator API  
> 🎯 **Foco depois:** Sincronizar i18n global (quando necessário)  
> 🎯 **Tudo documentado:** Pronto para quando for hora
