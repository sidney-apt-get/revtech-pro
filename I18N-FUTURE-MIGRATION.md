# 🚀 Plano de Migração i18n — Versão Futura

**Status:** 📋 Planejado (não executar agora)  
**Trigger:** Quando múltiplos usuários EN navegarem Dashboard/Projects  
**Tempo estimado:** 5-6 horas  
**Data criação:** 09/05/2026

---

## 🎯 Objetivo

Sincronizar o sistema de idiomas (i18n) para que **múltiplos usuários com preferências de idioma diferentes** vejam a UI no idioma escolhido em **qualquer página do app**.

---

## ⚠️ Pré-requisitos para Começar

Antes de executar este plano, verifique:

```typescript
✅ Usuário EN está usando Dashboard regularmente
✅ Existem 2+ usuários EN simultâneos ou esperados
✅ Tempo disponível: 5-6 horas contínuas
✅ Ambiente de teste/staging disponível
✅ Backup de dados feito
✅ Ninguém mais editando código (evitar conflitos)
```

Se algum ✅ for ❌, **ESPERE** — não é a hora ainda.

---

## 📋 Fases de Execução

### **FASE 0: Análise Rápida (15 min)**

Confirmar que ainda está viável:

```bash
# Verificar estrutura atual
ls -la src/hooks/useLanguage.ts
ls -la src/pages/Dashboard.tsx
grep -r "useTranslation" src/pages/ | wc -l
```

**Output esperado:**
- `useLanguage.ts` existe ✅
- Dashboard.tsx existe ✅
- ~10+ arquivos usando useTranslation ✅

---

### **FASE 1: Criar Context Global (30 min)**

**Arquivo:** `src/context/LanguageContext.tsx` (NOVO)

```typescript
import { createContext, useContext, ReactNode } from 'react'
import { useLanguage } from '@/hooks/useLanguage'

export const LanguageContext = createContext<ReturnType<typeof useLanguage> | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useLanguage()
  
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useGlobalLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useGlobalLanguage deve estar dentro de <LanguageProvider>')
  }
  return context
}
```

**Testes:**
```bash
npm run build # Deve compilar sem erros
```

---

### **FASE 2: Integrar Provider no App (15 min)**

**Arquivo:** `src/App.tsx`

```typescript
// ANTES:
import { Router } from 'wouter'
import { AppLayout } from './components/AppLayout'

export function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

// DEPOIS:
import { Router } from 'wouter'
import { AppLayout } from './components/AppLayout'
import { LanguageProvider } from '@/context/LanguageContext'

export function App() {
  return (
    <LanguageProvider>
      <Router>
        <AppLayout />
      </Router>
    </LanguageProvider>
  )
}
```

**Testes:**
```bash
npm run dev # App inicia sem erros
```

---

### **FASE 3: Refatorar Dashboard (1 hora)**

**Arquivo:** `src/pages/Dashboard.tsx`

```typescript
// ANTES:
import { useTranslation } from 'react-i18next'
export function Dashboard() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'pt' ? pt : enGB
  // ... resto do código

// DEPOIS:
import { useGlobalLanguage } from '@/context/LanguageContext'
export function Dashboard() {
  const { t, language } = useGlobalLanguage()
  const locale = language === 'pt-BR' ? pt : enGB
  // ... resto do código
```

**Mudanças específicas:**
```typescript
// Linha 85 (antes):
const { t, i18n } = useTranslation()

// Linha 85 (depois):
const { t, language } = useGlobalLanguage()

// Linha 87 (antes):
const locale = i18n.language === 'pt' ? pt : enGB

// Linha 87 (depois):
const locale = language === 'pt-BR' ? pt : enGB

// Linha 86 (antes):
useEffect(() => { document.title = 'Dashboard — RevTech PRO' }, [])

// Linha 86 (depois):
useEffect(() => { document.title = t.dashboard.title + ' — RevTech PRO' }, [language])
```

**Testes:**
```bash
npm run dev
# 1. Ir para /dashboard
# 2. Verificar se carrega sem erros
# 3. Mudar idioma no Assistante
# 4. Dashboard deve atualizar idioma
```

---

### **FASE 4: Refatorar Projects (1 hora)**

**Arquivos:** 
- `src/pages/Projects.tsx`
- `src/components/ProjectModal.tsx`
- `src/components/ProjectCard.tsx`

**Mudança padrão:**
```typescript
// ANTES:
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()

// DEPOIS:
import { useGlobalLanguage } from '@/context/LanguageContext'
const { t } = useGlobalLanguage()
```

**Checklist:**
- [ ] Projects.tsx refatorado
- [ ] ProjectModal.tsx refatorado
- [ ] ProjectCard.tsx refatorado
- [ ] Compilação OK
- [ ] Testes em navegador OK

---

### **FASE 5: Refatorar Inventory (1 hora)**

**Arquivos:**
- `src/pages/Inventory.tsx`
- `src/pages/InventoryDetail.tsx`
- `src/components/DynamicFields.tsx`

**Mudança padrão:** (mesmo que Fase 4)

---

### **FASE 6: Refatorar Finances (1 hora)**

**Arquivos:**
- `src/pages/Finances.tsx`

**Mudança padrão:** (mesmo que Fase 4)

---

### **FASE 7: Adicionar Seletor Global (30 min)**

Adicionar botões de idioma em **local visível** (ex: navbar/header)

**Arquivo:** `src/components/Layout.tsx` ou equivalente

```typescript
import { useGlobalLanguage } from '@/context/LanguageContext'

export function Layout() {
  const { language, changeLanguage } = useGlobalLanguage()
  
  return (
    <header className="flex items-center justify-between">
      {/* Seu navbar... */}
      
      {/* Seletor de idioma (NOVO) */}
      <div className="flex gap-2">
        <button
          onClick={() => changeLanguage('pt-BR')}
          className={`px-3 py-1 rounded ${
            language === 'pt-BR' 
              ? 'bg-accent text-white' 
              : 'bg-surface text-text-muted'
          }`}
        >
          🇧🇷 Português
        </button>
        <button
          onClick={() => changeLanguage('en-GB')}
          className={`px-3 py-1 rounded ${
            language === 'en-GB' 
              ? 'bg-accent text-white' 
              : 'bg-surface text-text-muted'
          }`}
        >
          🇬🇧 English
        </button>
      </div>
    </header>
  )
}
```

---

### **FASE 8: Testes Completos (30 min)**

```
✅ Teste 1: Iniciar app em PT
  1. Abrir app
  2. Assistante mostra PT ✅
  3. Dashboard mostra PT ✅
  4. Projects mostra PT ✅
  
✅ Teste 2: Mudar para EN no Assistante
  1. Clicar em 🇬🇧 no Assistante
  2. Assistante muda para EN ✅
  3. Navegar para Dashboard
  4. Dashboard também em EN ✅
  5. Navegar para Projects
  6. Projects também em EN ✅
  
✅ Teste 3: Persistência
  1. Mudar para EN
  2. Recarregar página
  3. Deve estar em EN ✅
  4. Fechar aba e abrir novamente
  5. Deve estar em EN ✅
  
✅ Teste 4: Edge cases
  1. Abrir 2 abas do app
  2. Mudar uma para EN
  3. Outra aba deve mudar automaticamente ✅
  4. Verificar console (sem erros)
```

---

### **FASE 9: Deploy (30 min)**

```bash
# 1. Commit de todas as mudanças
git add -A
git commit -m "refactor: unified global i18n context for all pages

- Created LanguageContext for global language state
- Refactored Dashboard, Projects, Inventory, Finances
- Added language selector to navbar
- Synchronized all pages with global language preference
- Tests passed for PT-BR and EN-GB"

# 2. Push para GitHub
git push origin master

# 3. Vercel deploy automático
# (ou manual via dashboard)

# 4. Teste em produção
# Abrir https://revtech-new.vercel.app
# Validar tudo funciona
```

---

## 🛠️ Troubleshooting Durante Execução

### Problema: "useGlobalLanguage está undefined"
```typescript
Causa: Componente não está dentro de <LanguageProvider>
Solução: Verificar se App.tsx está wrappado corretamente
```

### Problema: "Module not found: src/context/LanguageContext"
```typescript
Causa: Arquivo não foi criado ou caminho errado
Solução: Verificar se arquivo existe em src/context/LanguageContext.tsx
```

### Problema: Idioma não persiste ao recarregar
```typescript
Causa: localStorage não está funcionando
Solução: Verificar console (F12) → Application → localStorage
        Deve haver chave "revtech-language"
```

### Problema: Erro "Context is null"
```typescript
Causa: useGlobalLanguage() usado fora de <LanguageProvider>
Solução: Mover Provider mais para cima (App.tsx)
```

---

## ⏱️ Timeline Esperada

```
FASE 0 (Análise):       15 min
FASE 1 (Context):       30 min
FASE 2 (Provider):      15 min
FASE 3 (Dashboard):     1 hora
FASE 4 (Projects):      1 hora
FASE 5 (Inventory):     1 hora
FASE 6 (Finances):      1 hora
FASE 7 (Seletor):       30 min
FASE 8 (Testes):        30 min
FASE 9 (Deploy):        30 min
─────────────────────────────────
TOTAL:                  5.5 horas
```

**Com pauses para café:** 6-7 horas

---

## 📝 Antes de Começar

Faça **3 coisas:**

1. **Backup:**
   ```bash
   git tag -a "backup-before-i18n-migration" -m "Backup antes de sincronizar i18n"
   git push origin "backup-before-i18n-migration"
   ```

2. **Branch:**
   ```bash
   git checkout -b feature/global-i18n-sync
   # Todas as mudanças aqui, depois merge
   ```

3. **Comunicação:**
   - Avise usuários que o app pode ter downtime
   - Estimativa: 2-3 horas máximo
   - Melhor hora: fora do horário de pico

---

## ✅ Checklist Final

Antes de commitar:

```
CÓDIGO:
- [ ] Compilação OK (npm run build)
- [ ] Sem warnings no console
- [ ] Sem erros TypeScript
- [ ] Formatação OK (prettier/eslint)

TESTES:
- [ ] Teste 1 (PT inicial) ✅
- [ ] Teste 2 (Mudar para EN) ✅
- [ ] Teste 3 (Persistência) ✅
- [ ] Teste 4 (Edge cases) ✅

DOCUMENTAÇÃO:
- [ ] Código comentado se necessário
- [ ] Este arquivo atualizado
- [ ] Commit message clara

PERFORMANCE:
- [ ] Nenhuma regressão de velocidade
- [ ] localStorage working OK
- [ ] Context não re-renderiza desnecessariamente
```

---

## 🎉 Ao Terminar

Parabéns! Você acabou de:

✅ Sincronizar i18n globalmente  
✅ Permitir múltiplos usuários EN  
✅ Manter compatibilidade com usuários PT  
✅ Preparar app para crescimento  

**Próximo passo:** Implementar Google Translator API para tradução automática de campos.

---

**Documento criado:** 2026-05-09  
**Próxima leitura recomendada:** Quando usuário EN começar a reclamar sobre UI em português  
**Proprietário:** Sidney (você)  
**Status:** 📋 Pronto para executar quando necessário
