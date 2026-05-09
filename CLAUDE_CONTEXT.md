# RevTech PRO — Contexto Completo para Claude
# Última actualização: Maio 2026

## NEGÓCIO
- Oficina familiar em Livingston, Scotland
- Compra electrónicos com defeito no eBay UK
- Repara e revende via CeX, Back Market, eBay UK
- Trabalha com: portáteis, telemóveis, consolas, áudio vintage,
  componentes PC, tablets, iPads, e-readers, periféricos
- Dono: Sidney Nogueira (sidneycomvoce@gmail.com) — admin

## SISTEMA ACTUAL
- App: https://revtech-new.vercel.app
- GitHub: https://github.com/sidney-apt-get/revtech-pro
- Supabase Project ID: yurtqojjrwlnxpvykvti
- Supabase URL: https://yurtqojjrwlnxpvykvti.supabase.co
- Stack: React 19 + Vite + TypeScript + TailwindCSS + Supabase + Vercel
- Auth: Google OAuth via Supabase
- i18n: PT-BR e EN-GB (react-i18next)

## COMO TRABALHAR NO SISTEMA
cd C:\RevTech\revtech-new
claude (abre Claude Code)

NUNCA tocar em:
- C:\RevTech\revtech-pro (sistema antigo abandonado)
- C:\RevTech\revtech-pro-temp (sistema antigo abandonado)

## DEPLOY
git add . && git commit -m "mensagem" && git push && vercel --prod --yes

## CREDENCIAIS (onde estão — não os valores)
- Google OAuth Client ID/Secret: Google Cloud Console > My Project 7384
- Supabase anon key: .env.local
- eBay App ID: .env.local (SIDNEYNO-RevTechS-PRD-b6c2e06b1-7cb91251)
- Back Market API Key: .env.local
- Telegram Token: Supabase Edge Function secrets
- Gemini API Key: Supabase Edge Function secrets (GEMINI_API_KEY)
- ⚠️ REVOGAR URGENTE: Google Client Secret foi partilhado publicamente
  → console.cloud.google.com > My Project 7384 > OAuth 2.0 > revogar e gerar novo

## TABELAS SUPABASE (todas existentes)
- projects — projectos de reparação
- inventory — peças e equipamentos em stock
- contacts — fornecedores e clientes
- transactions — transacções financeiras
- checklists — listas de verificação recepção/entrega
- defect_database — base de defeitos (alimentada automaticamente)
- parts_orders — encomendas de peças
- app_settings — configurações da empresa
- user_roles — roles dos utilizadores (admin/technician/viewer)
- time_entries — registo de tempo por projecto
- warranties — garantias pós-venda
- project_photos — fotos por fase do projecto
- lots — lotes de compra
- categories — taxonomia de categorias de equipamentos
- category_fields — campos específicos por categoria
- item_field_values — valores dos campos dinâmicos
- item_history — histórico universal de todos os items
- expenses — despesas operacionais
- financial_goals — metas financeiras mensais
- scanner_sessions — sessões de pareamento (não usado actualmente)

## MIGRATIONS EXECUTADAS (001-022)
001 tickets, 002 checklists, 003 defects, 004 orders,
005 settings, 006 roles, 007 fix_admin, 008 security,
009 time_tracking, 010 warranties, 011 photos,
012 device_fields, 013 finances, 014 taxonomy,
015 camera_sessions, 016 pairing, 017 purchase_ref,
018 defect_auto, 019 purchase_ref, 020 inventory_fields,
021 telegram_settings, 022 scanner_sessions

## EDGE FUNCTIONS SUPABASE
- ai-analyze: análise de imagem com Gemini 2.5-flash
  + tradução de texto via Gemini
  Status: deployada, modelo gemini-2.5-flash
- telegram-notify: notificações Telegram
  Status: deployada, secrets configurados

## FUNCIONALIDADES ACTIVAS
✅ Login Google OAuth com roles (admin/technician/viewer)
✅ PIN de protecção nas configurações
✅ Dashboard com métricas reais e gráficos
✅ Projectos com Kanban + lista + ficha completa (/projects/:id)
✅ Formulário dinâmico por categoria de equipamento
✅ Auto-preenchimento por IA (Gemini Vision) via foto
✅ Inventário com lista densa + ficha completa (/inventory/:id)
✅ Dar baixa de stock com motivo e ligação a projecto
✅ Encomendas de peças → ligação automática a inventário/projecto
✅ Quando todas as peças entregues → projecto muda para Em Manutenção
✅ Lotes de compra ligados a projectos (custo por item auto)
✅ Checklists de recepção e entrega com fotos
✅ Galeria de fotos por fase da reparação
✅ Tickets com QR Code imprimíveis
✅ Etiquetas de preço imprimíveis (100x60mm)
✅ Base de defeitos alimentada automaticamente por projectos concluídos
✅ Histórico de reparações por equipamento (na ficha do projecto)
✅ Garantias pós-venda
✅ Time tracking por técnico
✅ Finanças com balanço diário/semanal/mensal/anual
✅ Relatórios PDF/CSV
✅ Analytics com gráficos
✅ Notificações Telegram (novo projecto, venda, stock baixo)
✅ Alertas de stock baixo dispensáveis (8 horas)
✅ Tradução de conteúdo inserido pelo utilizador (botão 🌐)
✅ i18n completo PT-BR e EN-GB
✅ PWA instalável no telemóvel
✅ Sidebar recolhível
✅ Histórico universal por item (item_history)
✅ Campos dinâmicos por categoria (category_fields)
✅ Subcategoria com sugestão automática por nome do item
✅ Comparador de preços CeX/eBay/Back Market
✅ Gestão de utilizadores (admin)
✅ Configurações: logo, cores, PIN, moeda, prefixo tickets
✅ Backup/restauro de dados
✅ Delete com confirmação ELIMINAR/DELETE

## REMOVIDO DO SISTEMA (não reimplementar)
- Mapa de fornecedores (inútil)
- eBay/Back Market search (demo sem dados reais)
- Sistema de scanner/pareamento QR (não funcionou)
- Chat IA flutuante (TechMasterChat)
- Diagnósticos por IA (página separada)
- Assistente de Bancada (removido em 09/05/2026 — commit 73b19f9b)
  Nav entry removida de Layout.tsx; rota /assistant removida de App.tsx
  Chaves "nav.assistant" ainda em pt.json e en.json (orphans inofensivos)
  Chaves assistantTitle/assistantSubtitle ainda em translations.ts (orphan)

## DEPLOY
- git add . && git commit -m "mensagem" && git push origin master && vercel --prod --yes
- Webhook Vercel estava partido em 09/05/2026 — resolvido forçando push manual
- GitHub repo: sidney-apt-get/revtech-pro (branch: master)
- Vercel project ID: prj_EyYiSap5kknzB6qDcu7zZUAf5CBn
- Vercel team ID: team_G8yhDWDyXmrOLSWfNccwDvxV

## PROBLEMAS CONHECIDOS ACTUAIS
1. Categorias com encoding incorrecto no selector de
   novo projecto — emojis aparecem como ðŸŽµ
   Ficheiro: src/pages/Projects.tsx
   Solução aplicada: categoryIcons.ts com ASCII

2. Google Client Secret foi partilhado publicamente —
   REVOGAR em console.cloud.google.com

## IDENTIFICAÇÃO POR IA — ESTADO ACTUAL (09/05/2026)
- Modelo: gemini-2.5-pro (upgrade de gemini-2.5-flash)
- JSON schema obrigatório com responseMimeType: application/json
- Novos campos: estimated_value_gbp, repair_complexity
- Timeout: 55s (era 25s) com thinkingBudget: 1024
- Retry automático no frontend em caso de timeout
- Resolução da imagem: 1280px (era 1024px)
- Edge function: v13 deployada via Supabase MCP
- Commit: 5ae91de — deploy Vercel: dpl_536gCMctoFuginmE2jnvocJtGNFv

## TAXONOMIA DE CATEGORIAS (slugs principais)
audio, audio-amplifier, audio-turntable, audio-speakers,
audio-tubes, laptops, laptop-windows, laptop-macbook-pro,
laptop-macbook-air, laptop-screen, laptop-battery,
laptop-ram, laptop-ssd, laptop-charger,
desktop, desktop-imac, desktop-windows-tower,
desktop-cpu, desktop-gpu, desktop-motherboard, desktop-psu,
consoles, console-playstation, console-xbox,
console-nintendo-home, console-nintendo-portable,
console-c