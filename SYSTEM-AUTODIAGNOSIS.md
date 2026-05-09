# 🔍 Autodiagnóstico Completo do Sistema RevTech
**Data:** 09/05/2026  
**Status:** Análise Concluída ✅

---

## 📊 Resumo Executivo

O sistema RevTech possui **2 implementações de i18n conflitantes**, **múltiplos formulários de entrada de usuário em português** que carecem de tradução automática, e **limitações na cobertura multilíngue** além da página do Assistente.

**Crítico:** O usuário tem campos de dados em português que não são traduzidos para inglês/outros idiomas quando exibidos para usuários de outras línguas.

---

## 🏗️ ARQUITETURA I18N — PROBLEMA CRÍTICO

### Sistema 1: Custom Hook (Assistante ✅)
```
- Hook: useLanguage() em src/hooks/useLanguage.ts
- Storage: localStorage['revtech-language']
- Suporte: pt-BR, en-GB
- Status: ✅ Totalmente Implementado
- Cobertura: SÓ página Assistant.tsx
```

### Sistema 2: react-i18next (Dashboard, Projects, etc.)
```
- Hook: useTranslation() de 'react-i18next'
- Storage: Provavelmente localStorage ou sessão i18n
- Suporte: Múltiplos idiomas (config em arquivo i18n não visto)
- Status: ⚠️ Existente mas Não Alinhado
- Cobertura: Dashboard, Projects, Inventory, Finances, Reports, etc.
```

### 🔴 Problema: 
**Dois sistemas i18n completamente isolados, sem sincronização de idioma entre eles.**
- Usuário seleciona idioma no Assistante → muda apenas o Assistante
- Dashboard continua em idioma padrão (provavelmente pt ou detectado pelo navegador)
- Nenhuma opção global de idioma para todo o app

---

## 👥 CAMPOS DE ENTRADA DE USUÁRIO IDENTIFICADOS

### 1️⃣ ProjectModal (`src/components/ProjectModal.tsx`) — CRÍTICO

```typescript
// Campos que armazenam dados em português (sem tradução):
- equipment: "iPhone 12 Pro" 
- defect_description: "Tela quebrada, não liga"
- diagnosis: "Display danificado, possível placa-mãe"
- supplier_name: "Apple Importação"
- buyer_name: "João da Silva"
- notes: "Chegou com caixa original"
- sale_platform: "eBay UK"
```

**Impacto:** Quando exibido para usuários EN-GB, veem descrições em português.

---

### 2️⃣ Inventory (`src/pages/Inventory.tsx`)

```typescript
- item_name: "Parafuso M5 inox"
- location: "Prateleira 3, seção ferramentas"
- supplier: "Makita Brasil"
- notes: "Encomendado em Fevereiro"
- cannibalization_reason: "Display defeituoso"
```

**Impacto:** Catálogo inteiro pode estar em português, inacessível para usuários EN-GB.

---

### 3️⃣ Finances (`src/pages/Finances.tsx`)

```typescript
- EXPENSE_CATEGORIES: ['Ferramentas', 'Consumíveis', 'Envios', 'Subscrições', 'Electricidade', 'Internet', 'Outros']
- Expense descriptions (user-entered)
- Goal notes
```

**Impacto:** Relatórios financeiros misturados em português/inglês.

---

### 4️⃣ DynamicFields (`src/components/DynamicFields.tsx`)

```typescript
// Campos dinâmicos baseados em categoria/tipo
// Exemplo: "Capacidade da Bateria", "Saúde da Bateria", etc.
// Estes SÃO traduzidos, mas:
// - Os VALORES preenchidos pelo usuário não são traduzidos
// - Ex: "Tipo de defeito customizado" → usuário escreve em português
```

---

### 5️⃣ Outras Páginas com Entrada de Dados

| Página | Campos de Entrada | Status |
|--------|------------------|--------|
| **Contacts** | Nome, Email, Telefone, Notas | ⚠️ Não verificado |
| **DefectDatabase** | Descrição de defeito, Solução | ⚠️ Não verificado |
| **Labels** | Nomes de etiqueta | ⚠️ Não verificado |
| **PartsOrders** | Descrição de peça, Notas | ⚠️ Não verificado |
| **UserManagement** | Nomes de usuário, Roles | ⚠️ Parcialmente traduzido |
| **Warranties** | Termos, Condições | ⚠️ Dinâmico |

---

## 🎯 TRÊS PROBLEMAS SOLICITADOS — ANÁLISE DETALHADA

### ⚠️ PROBLEMA 1: Dashboard Bilíngue

**Status:** ❌ Não Implementado  
**Razão:** Dashboard usa `react-i18next`, não sincroniza com seletor do Assistente

**Verificação:**
```typescript
// Dashboard.tsx linha 85
const { t, i18n } = useTranslation()
const locale = i18n.language === 'pt' ? pt : enGB
```

**O que falta:**
- [ ] Vincular `i18n.language` ao estado global do idioma
- [ ] Sincronizar localStorage entre sistemas
- [ ] Implementar botões de idioma no Dashboard

**Escopo:** Moderar — Requer refactoring de i18n global

---

### ⚠️ PROBLEMA 2: Internacionalizar Cowork

**Status:** ❌ Não Aplicável  
**Razão:** Cowork é interface externa de CLI, não é página React

**Análise:**
- Cowork é executado via `npx cowork` no terminal do usuário
- As skills/comandos são invocados via CLI
- Não há UI bilíngue em Cowork — é baseado em prompts de texto

**O que seria necessário (se fosse aplicável):**
- [ ] Prompts em português/inglês no skill
- [ ] Respostas traduzidas do skill
- [ ] Mas: Isso sairia do escopo da UI React

**Status Final:** ✅ Sem ação necessária — Cowork é CLI, não UI.

---

### ⚠️ PROBLEMA 3: I18n para Textos Dinâmicos

**Status:** ⚠️ Parcialmente Implementado  
**Razão:** Valores preenchidos pelo usuário NÃO são traduzidos automaticamente

**Exemplo:**
```
Português (usuário preenche):
- defect_description: "Tela quebrada, não carrega bateria"

Inglês (exibição):
- Mesmo texto em português (sem tradução!)
```

**O que falta:**
- [ ] API de tradução automática para valores de formulário
- [ ] Mecanismo para armazenar/sincronizar traduções
- [ ] Detecção de idioma do conteúdo

**Escopo:** Crítico — Requer integração Google Translator

---

## 🌐 IMPLEMENTAÇÃO: GOOGLE TRANSLATOR API

### Proposta: Tradução Automática de Campos do Usuário

**Fluxo Proposto:**
```
1. Usuário preenche campo em português
2. Ao salvar:
   - Detecta idioma do conteúdo (Google Detect API)
   - Se português → traduz para en-GB
   - Armazena ambas as versões no banco
   
3. Na exibição:
   - Se usuário está em pt-BR → mostra original português
   - Se usuário está em en-GB → mostra versão traduzida em inglês
```

### 🔧 Arquitetura Técnica

#### A) Nova Tabela: `translated_fields`
```sql
CREATE TABLE translated_fields (
  id UUID PRIMARY KEY,
  source_table TEXT,        -- 'projects', 'inventory', etc.
  source_record_id UUID,    -- ID do projeto/item
  field_name TEXT,          -- 'equipment', 'defect_description', etc.
  original_text TEXT,       -- Texto original (português)
  detected_lang TEXT,       -- 'pt' (detectado)
  translated_en_gb TEXT,    -- Tradução em inglês britânico
  api_used TEXT,            -- 'google' | 'manual'
  is_verified BOOLEAN,      -- Se foi revisado manualmente
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### B) Novo Hook: `useFieldTranslator.ts`
```typescript
export function useFieldTranslator() {
  // translateText(text: string, targetLang: string)
  // - Chama Google Translator API
  // - Cria cache local (localStorage)
  // - Retorna tradução com loading state
  
  // getTranslated(sourceTable, recordId, fieldName, language)
  // - Busca em translated_fields
  // - Retorna texto correto para idioma
  
  // saveTranslation(sourceTable, recordId, fieldName, originalText)
  // - Detecta idioma
  // - Traduz para en-GB
  // - Salva em translated_fields
}
```

#### C) Integração em ProjectModal
```typescript
// Ao salvar projeto:
const { saveTranslation } = useFieldTranslator()

await project.save()

// Então traduz campos-chave:
await saveTranslation('projects', project.id, 'equipment', formData.equipment)
await saveTranslation('projects', project.id, 'defect_description', formData.defect_description)
// ... outros campos
```

#### D) Exibição com Tradução
```typescript
// Em ProjectDetails.tsx ou em qualquer lugar que exibe
const { t } = useTranslation()
const { getTranslated } = useFieldTranslator()

const equipment = language === 'en-GB' 
  ? await getTranslated('projects', projectId, 'equipment')
  : project.equipment // português original
```

---

## 📋 CAMPOS CRÍTICOS PARA TRADUÇÃO (Prioridade)

| Campo | Tabela | Frequência | Prioridade |
|-------|--------|-----------|-----------|
| `equipment` | projects | Alto | 🔴 Crítica |
| `defect_description` | projects | Alto | 🔴 Crítica |
| `diagnosis` | projects | Médio | 🔴 Crítica |
| `item_name` | inventory | Alto | 🟡 Alta |
| `item_context` (custom) | inventory | Médio | 🟡 Alta |
| `supplier_name` | projects | Médio | 🟡 Alta |
| `buyer_name` | projects | Baixo | 🟢 Média |
| `notes` | projects | Baixo | 🟢 Média |

---

## 🔐 CONSIDERAÇÕES DE SEGURANÇA & PERFORMANCE

### Google Translator API
- **Custo:** ~$0.0001 per 100 caracteres
- **Rate Limit:** 500 requisições/segundo (tier gratuito: limitado)
- **Privacidade:** Texto enviado ao Google — verificar GDPR/LGPD

### Cache Estratégia
```typescript
// Cache local (localStorage) para textos já traduzidos
// TTL: 24 horas
// Fallback: se API falhar, usar cache ou original

const getCached = (key) => {
  const cached = localStorage.getItem(`trans_${key}`)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < 86400000) return data // 24h
  }
  return null
}
```

---

## 📈 PLANO DE IMPLEMENTAÇÃO PROPOSTO

### Fase 1: Sincronizar I18n (1-2 horas)
- [ ] Refatorar para usar um único sistema i18n global
- [ ] Opção A: Mover tudo para `react-i18next`
- [ ] Opção B: Estender `useLanguage` para todo o app
- [ ] Sincronizar localStorage entre páginas
- [ ] Adicionar seletor de idioma em nav global (não só Assistante)

### Fase 2: Integração Google Translator (3-4 horas)
- [ ] Criar variável de ambiente: `VITE_GOOGLE_TRANSLATE_API_KEY`
- [ ] Implementar `useFieldTranslator` hook
- [ ] Criar tabela `translated_fields` em Supabase
- [ ] Testar com campos críticos (equipment, defect_description)

### Fase 3: Rollout por Página (6-8 horas)
- [ ] ProjectModal: adicionar tradução ao salvar
- [ ] ProjectDetails: exibir com tradução baseada em idioma
- [ ] Inventory: traduzir item_name
- [ ] Finances: traduzir categorias de despesa

### Fase 4: QA & Limpeza (2-3 horas)
- [ ] Testar cada campo com textos longos/especiais
- [ ] Verificar performance (não travar ao salvar)
- [ ] Remover dados de teste

**Total Estimado:** 12-17 horas de trabalho

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

### ⚠️ DECISÃO IMPORTANTE (09/05/2026)

**❌ NÃO fazer Sincronização i18n Global AGORA**

**Por quê?**
- Usuário único (Sidney em PT-BR)
- Sincronização beneficiaria zero pessoas hoje
- Tempo melhor gasto em Google Translator API
- Documentação pronta para quando for necessário

**Leia:** `DECISION-LOG.md` e `I18N-CURRENT-STATE.md`

---

### Imediato (Esta Semana) — PRIORIDADE REAL
1. ✅ **Obter:** Chave API do Google Translator
2. ✅ **Autorizar:** Dados do usuário ao Google (GDPR/LGPD)
3. ✅ **Implementar:** Google Translator API (nova Fase 1)
4. ✅ **Criar:** Tabela `translated_fields` em Supabase
5. ✅ **Testar:** Tradução de campos críticos

### Curto Prazo (Próximas 2-3 Semanas)
6. Expandir tradução para todos os campos importantes
7. Cache de traduções (performance)
8. QA em produção com dados reais

### Médio Prazo (Quando Usuário EN Ativar — Estimado Ago/2026)
9. Sincronização global de idioma (veja `I18N-FUTURE-MIGRATION.md`)
10. Dashboard bilíngue completo
11. Seletor de idioma visível em navbar

---

## ✅ STATUS FINAL DE IMPLEMENTAÇÃO (ATUALIZADO)

| Componente | Status | Notas |
|------------|--------|-------|
| **Assistente (Seletor + Tradução)** | ✅ Completo | Deploy em produção |
| **Dashboard Bilíngue** | 📋 Planejado | Para quando usuário EN entrar (veja `I18N-FUTURE-MIGRATION.md`) |
| **Tradutor de Campos (Google API)** | 🔜 Próximo | Implementar imediatamente (Prioridade #1) |
| **Cowork I18n** | ✅ N/A | CLI, sem UI para traduzir |
| **Sincronização Global de Idioma** | 📋 Planejado | Para quando necessário (ago/2026 estimado) |

---

## 📝 Decisão Tomada (09/05/2026)

> *"Eu não quero expandir idiomas, outra situação, eu tinha solicitado que tivesse tradução nos campos que foram preenchidos em português pelo usuário, ter tradução de tudo literalmente para ambas os idiomas"*

**Entendimento:**
- ✅ Tradução de campos de entrada do usuário = **PRIORIDADE #1 AGORA**
- ❌ Não adicionar novos idiomas (manter pt-BR + en-GB apenas)
- ✅ Tradução "literal" de conteúdo do usuário
- ✅ Disposição de usar Google Translator API se necessário
- ❌ NÃO sincronizar i18n global AGORA (usuário único PT-BR)
- ✅ Documentação pronta para sincronizar quando for necessário

**Decisão:** Focar em Google Translator API (Fases 2-4 do plano), deixar documentado para sincronização i18n (veja `DECISION-LOG.md`).

---

## 📚 Documentação Criada (09/05/2026)

- ✅ `I18N-CURRENT-STATE.md` — Situação atual e por que NÃO fazer agora
- ✅ `I18N-FUTURE-MIGRATION.md` — Passo-a-passo para quando for necessário (Ago/2026)
- ✅ `DECISION-LOG.md` — Registro da decisão e análise de ROI
- ✅ `SYSTEM-AUTODIAGNOSIS.md` — Este arquivo (atualizado com decisão)

**Próxima Ação:** Implementar Google Translator API

---

**Autodiagnóstico Completado em:** 2026-05-09  
**Decisão Aprovada em:** 2026-05-09  
**Próxima Ação:** Google Translator API (Fase 2-4)  
**Data de Revisão:** 2026-08-09 (ou quando usuário EN entrar)
