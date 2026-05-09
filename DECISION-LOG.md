# 📋 Log de Decisões do Sistema RevTech

---

## Decisão #1: Não Sincronizar i18n Global Agora

**Data:** 09/05/2026  
**Decisor:** Sidney (proprietário do sistema)  
**Status:** ✅ APROVADO  
**Revisão:** 2026-08-09 (ou quando usuário EN usar Dashboard regularmente)

---

### 🎯 Contexto

**Situação:**
- Sistema RevTech com 2 idiomas: Português (PT-BR) e Inglês Britânico (EN-GB)
- 2 sistemas de i18n não sincronizados
- Assistante usa `useLanguage` (custom hook)
- Dashboard, Projects, Inventory, Finances usam `react-i18next`

**Pergunta:**
Sincronizar agora para evitar problemas futuros?

**Resposta:**
NÃO. Deixar documentado para fazer quando for necessário.

---

### 📊 Análise

#### Opção A: Sincronizar Agora
```
Tempo: 5-6 horas
Risco: Possíveis bugs em refatoração
Benefício: ZERO (usuário único PT-BR)
Custo-Benefício: Muito ruim ❌
```

#### Opção B: Sincronizar Quando Necessário
```
Tempo: 5-6 horas (mesmo tempo, mas depois)
Risco: ZERO (não toca agora)
Benefício: 100% (múltiplos usuários EN existem)
Custo-Benefício: Perfeito ✅
```

---

### 👤 Análise de Usuários

**Usuário Atual (2026-05-09):**
- Sidney (PT-BR) — técnico de manutenção
- Usa 100% do sistema em português
- Assistante testado em inglês (demonstração)
- **Necessidade de sincronização:** 0%

**Usuário Futuro (2026-08 estimado):**
- Usuário EN — análise de finanças
- Usará principalmente Dashboard/Finances
- Não navegará Projects/Inventory (entrada de dados)
- **Necessidade de sincronização:** CRÍTICA quando entrar

---

### 💰 Análise de ROI

| Item | Investir Agora | Investir Depois |
|------|----------------|-----------------|
| **Tempo gasto** | 5-6h | 5-6h |
| **Quando usado** | Nunca (até ago/2026) | Imediatamente (ago/2026) |
| **Bugs potenciais** | Alto (refactoring big bang) | Baixo (refactoring focado) |
| **Valor gerado** | Zero | Máximo |
| **Oportunidade custo** | 5-6h de outro trabalho perdido | Tempo gasto quando necessário |

**Conclusão:** ROI positivo fazendo DEPOIS, não AGORA.

---

### 🚀 Prioridades Atuais (Maio-Jun 2026)

```
🔴 CRÍTICO:
  [X] Bilingual Assistante
  [ ] Google Translator API (próxima)
  
🟡 IMPORTANTE:
  [ ] Expandir tradução de campos
  [ ] QA em produção
  
🟢 NICE-TO-HAVE:
  [ ] Sincronização i18n global
  [ ] Dashboard bilíngue
```

---

### ✅ Decisão Final

**❌ NÃO fazer agora**
- Caso de uso não justifica
- Tempo melhor gasto em Google Translator API
- Documentação completa para quando necessário

**✅ FAZER quando:**
- Usuário EN usa Dashboard regularmente
- 2+ usuários EN simultâneos
- Reclamações sobre UI em português

**✅ DOCUMENTAÇÃO pronta:**
- `I18N-CURRENT-STATE.md` — situação atual explicada
- `I18N-FUTURE-MIGRATION.md` — passo-a-passo para depois
- Estimativa: 5-6 horas quando chegar

---

### 📞 Pontos de Contato

Se em alguns meses surgir necessidade:

1. **Leia:** `I18N-CURRENT-STATE.md` (sinais de quando fazer)
2. **Leia:** `I18N-FUTURE-MIGRATION.md` (como fazer passo-a-passo)
3. **Estude:** Fases 1-9 (detalhadas, com exemplos de código)
4. **Execute:** Em ~5-6 horas contínuas
5. **Deploy:** Automático após testes

---

## Assinatura Digital

**Decisão aprovada por:** Sidney (proprietário)  
**Data:** 09/05/2026  
**Escopo:** i18n global synchronization  
**Status:** ✅ CONGELADO ATÉ SER NECESSÁRIO  

---

## Próxima Revisão

**Trigger automático:** Quando Sidney relatar:
- "Usuário EN está acessando Dashboard"
- "Preciso que Dashboard mostre em inglês"
- "Múltiplos usuários com idiomas diferentes"

**Data recomendada:** 2026-08-09 (3 meses)

---

**Documento pronto para: Toda a equipe técnica**  
**Responsável por manter atualizado:** Sidney  
**Última atualização:** 2026-05-09
