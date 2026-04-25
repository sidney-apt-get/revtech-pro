# Banco de Memória — RevTech PRO

## Contexto do Projecto

- **Utilizador**: Sidney Alves Nogueira (`sidneycomvoce@gmail.com`)
- **Negócio**: Oficina familiar de restauro de electrónicos em **Livingston, Scotland, UK**
- **Modelo de negócio**: Compra equipamentos com defeito → repara → revende via CeX, Back Market, eBay UK
- **Moeda principal**: GBP (£)
- **Idiomas da app**: Português (padrão) + English

---

## Decisões Arquitecturais Tomadas

| Decisão | Razão |
|---------|-------|
| Migração de Node.js + SQLite local → React + Supabase + Vercel | Acesso multi-dispositivo, mobile-first, sem servidor local |
| Supabase como BaaS | Auth + PostgreSQL + Edge Functions num só serviço, generoso plano gratuito |
| Vercel para hosting | Deploy automático por git push, integração perfeita com Vite/React |
| Google OAuth como único login | Sidney usa Google; sem gestão de passwords |
| Wouter em vez de React Router | Bundle menor, API mais simples para SPA |
| TanStack Query para servidor | Cache automático, invalidação granular, optimistic updates |
| i18next para i18n | Maturidade, detector de idioma automático, suporte a plurais |
| DB guarda valores em Português | Evita migrations de dados; tradução feita na UI com `statusMap` |

---

## Chaves e Configurações Importantes

> **Nota**: Sem valores reais — apenas referências de onde encontrar

| Variável | Onde encontrar |
|----------|---------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `VITE_EBAY_APP_ID` + `VITE_EBAY_CERT_ID` | developer.ebay.com → Apps → RevTech |
| `VITE_BACKMARKET_API_KEY` | Back Market Partner Portal |
| `VITE_XERO_CLIENT_ID` | developer.xero.com → App → RevTech PRO |
| Google OAuth Client ID/Secret | Google Cloud Console → "My Project 7384" → OAuth 2.0 |

- **Supabase Project ID**: `yurtqojjrwlnxpvykvti`
- **GitHub repo**: `https://github.com/sidney-apt-get/revtech-pro`

---

## Histórico de Funcionalidades Implementadas

### Sessão 1 — Sistema Base
- Schema Supabase completo (projects, inventory, parts_orders, contacts, defect_entries, checklists, app_settings, user_roles)
- Auth com Google OAuth
- CRUD de Projectos com estados: Recebido → Em Diagnóstico → Aguardando Peças → Em Manutenção → Pronto para Venda → Vendido
- Dashboard básico com KPIs
- Inventário com categorias (Peças, Consumíveis, Ferramentas, Patrimônio)
- Encomendas de Peças com rastreio de estado
- Relatórios mensais/anuais com PDF e CSV
- Analytics com gráficos recharts
- Vista Kanban drag-and-drop
- Checklists de recepção/entrega com fotos
- Ticket de recepção imprimível
- CRM de contactos
- Base de defeitos conhecidos
- Mapa de plataformas de venda
- PWA configurada (vite-plugin-pwa + Workbox)
- Backup para Google Drive

### Sessão 2 — i18n Completo
- i18next + react-i18next configurados
- `en.json` e `pt.json` completos com todas as strings
- Pattern `statusMap`, `orderStatusMap`, `categoryMap`, `contactTypeMap`, `difficultyMap` para valores DB em PT
- Selector de idioma (EN/PT) na sidebar

### Sessão 3 — Bug i18n + Deploy
- **PROBLEMA CRÍTICO resolvido**: i18next v26 + react-i18next v17 requer `react: { useSuspense: false }`
- **PROBLEMA 2 resolvido**: i18next-browser-languagedetector v8 não persiste automaticamente → `localStorage.setItem()` manual
- **PROBLEMA 3 resolvido**: `import './lib/i18n'` deve ser o PRIMEIRO import em `main.tsx`
- Deploy em Vercel: https://revtech-new.vercel.app

### Sessão 4 — FASE 1-4 (Scanner, Labels, CeX, PWA)
- **@zxing/library** instalado para scanner de câmara
- `BarcodeScanner.tsx` — lê barcodes/QR em tempo real
- `PriceLabel.tsx` — etiqueta 100×60mm com QR code
- `Labels.tsx` — página de impressão em lote
- `CexPriceWidget.tsx` + edge function `cex-search` (proxy CORS para CeX API)
- Botões 📷 (scanner), 🏷️ (etiqueta) e 🛍️ (CeX) nos ProjectCards
- `manifest.json` atualizado com shortcuts PWA
- Workbox `maximumFileSizeToCacheInBytes: 4MB` (necessário por causa do @zxing bundle)

### Sessão 5 — FASE 1-8 (Sidebar, Dashboard v2, Time Tracking, Serial History, Garantias, Xero)
- **Sidebar recolhível**: secção inferior colapsa para avatar + idioma + notificações; estado em localStorage
- **Dashboard v2**: 8 KPIs em 2 linhas, Pipeline mini-kanban, Alertas, Actividade recente, 2 gráficos, tabelas Ready/Overdue
- **Time Tracking**: `time_entries` DB, `TimeTracker.tsx` com ▶/⏹, secção no Analytics
- **Serial History**: página `/serial-history` com timeline por nº série, badge ⚠ no ProjectCard
- **Garantias**: `warranties` DB, `WarrantyModal.tsx` (automático ao vender), página `/warranties`
- **Xero**: `src/lib/xero.ts` com OAuth + exportSaleToXero/exportExpenseToXero/syncMonthlyReport, aba Integrações em Settings

---

## Problemas Resolvidos e Como

| Problema | Causa | Solução |
|---------|-------|---------|
| i18n não muda idioma | 3 causas combinadas (ver acima) | useSuspense:false + localStorage manual + ordem de imports |
| Build falha workbox | Bundle @zxing > 2MB | maximumFileSizeToCacheInBytes: 4MB |
| ProjectCard.tsx corrompido | Edição parcial deixou código HTML no TS | Limpeza manual do bloco corrupto |
| TS6133 vars não usadas | Imports não utilizados | Remoção de CheckCircle, format, idx |

---

## Para Sessões Futuras

```bash
# Sempre começar assim:
cd C:\RevTech\revtech-new
git pull

# Nunca tocar em:
# - C:\RevTech\revtech-pro (sistema antigo abandonado, Node.js + SQLite)

# Verificar antes de qualquer deploy:
pnpm tsc --noEmit
pnpm build

# Deploy:
git add . && git commit -m "feat: ..." && git push && vercel --prod --yes
```

### Migrations pendentes de executar no Supabase

Executar **manualmente** no SQL Editor do Supabase Dashboard:
1. `supabase/migrations/009_time_tracking.sql` — tabela `time_entries`
2. `supabase/migrations/010_warranties.sql` — tabela `warranties`

### Edge Functions pendentes de deploy

```bash
supabase functions deploy cex-search
```

### Contexto de desenvolvimento

- **IDE**: VS Code / Cursor no Windows 11
- **Gestor de pacotes**: pnpm
- **Node**: via PATH Windows
- **Shell**: bash (Git Bash) ou PowerShell
- **Caminhos**: sempre `C:\RevTech\revtech-new\` (com barras invertidas no Windows, `/` no bash)
