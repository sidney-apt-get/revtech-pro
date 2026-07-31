# RevTech PRO — Contexto Completo para Claude
# Última actualização: 2026-06-03

## NEGÓCIO
- Oficina familiar em Livingston, Scotland
- Compra electrónicos com defeito no eBay UK, repara e revende via CeX, Back Market, eBay UK
- Equipamentos: portáteis, telemóveis, consolas, áudio vintage, PCs, tablets, periféricos
- Dono: Sidney Nogueira (sidneycomvoce@gmail.com) — admin

## SISTEMA
- App: https://revtech-new.vercel.app
- GitHub: https://github.com/sidney-apt-get/revtech-pro (branch: master)
- Supabase Project ID: yurtqojjrwlnxpvykvti
- Stack: React 19 + Vite + TypeScript + TailwindCSS + Supabase + Vercel
- Auth: Google OAuth via Supabase

## DEPLOY
```
cd C:\RevTech\revtech-new
git add . && git commit -m "mensagem" && git push origin master && vercel --prod --yes
```
Ou duplo clique num dos scripts .cmd na raiz do projecto.

**IMPORTANTE**: Se o user vê código antigo → Ctrl+Shift+R (limpa cache do service worker)

NUNCA tocar em: C:\RevTech\revtech-pro / C:\RevTech\revtech-pro-temp (sistemas antigos)

## ESTADO ACTUAL (2026-06-03)

### ✅ EM PRODUÇÃO (tudo deployado)
- AI foto: preenche 6+ campos automáticos (nome, categoria, sub-categoria, notes, banner)
- Gemini: gemini-3.1-flash-lite v21 — FUNCIONA com responseSchema
  ⚠️ NUNCA usar gemini-3.5-flash com responseSchema via REST (incompatível)
- parts_cost: actualizado automaticamente ao adicionar/remover materiais na OS
- RMA: controlo de estoque com defeito (7 estados, KPIs, Telegram)
- PIN + Audit Log (/admin/audit) + PDF (4 templates com logo) — DEPLOYADO
- LEDGER financeiro (tabela transactions) = fonte única de receita/COGS
  - Dashboard/Finances/Reports lêem via useLedger()/computePnL — NÃO somar sale_price directo
  - Vender projeto → SaleModal captura preço/plataforma/sold_at → escreve no ledger
  - Vender inventário (stock-out 'sold') → escreve no ledger
- Ficha do projeto: menu ⋮ com "Enviar para RMA" e "Tombar como Património"

### DEPLOY: só git push (webhook Vercel auto-deploya; token CLI expirou, vercel --prod não é preciso)

## REGRAS CRÍTICAS DE IA

### Edge Function ai-analyze (v21, gemini-3.1-flash-lite)
- NUNCA mudar para gemini-3.5-flash sem resolver a incompatibilidade com responseSchema
- thinkingConfig + responseSchema = INCOMPATÍVEL no REST v1beta (causa 502/504)
- gemini-3.1-flash-lite funciona porque usa thinkingLevel 'minimal' por defeito

### Supabase
- Faz pausa após 1 semana sem actividade (plano free)
- Ao retomar: restore_project via Supabase MCP antes de qualquer operação
- admin_pin armazenado em app_settings (plain text, defeito "1234")
- Categorias encoding: ficheiros SQL devem ser guardados em UTF-8

## ARQUITECTURA DO SISTEMA

### Contextos
- SettingsProvider (cores, logo, moeda, ticket prefix)
- RoleProvider (admin/technician/viewer)
- PinGuardProvider — NOVO: modal PIN para acções protegidas

### Hooks principais
- useProjects, useOrders, useInventory, useRMA, useFinances
- useProjectItems — materiais da OS (actualiza parts_cost)
- useAuditLog — NOVO: log de auditoria

### Ficheiros lib/
- pdf.ts — NOVO: geração de PDF por impressão (4 templates)
- printLabel.ts — etiquetas de preço existentes

### Páginas admin (ProtectedAdmin + PinProtection)
- /settings, /admin/users, /admin/audit (NOVO)

## PROBLEMAS CONHECIDOS
1. Google Client Secret comprometido — REVOGAR urgente em console.cloud.google.com
2. Encoding das categorias: corrigido em DB, mas migrações futuras devem usar UTF-8
