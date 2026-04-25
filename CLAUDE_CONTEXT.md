# RevTech PRO — Contexto para Claude

## Negócio
Oficina familiar em Livingston, Scotland. Compra electrónicos 
com defeito no eBay UK, repara e revende via CeX, Back Market, eBay.
Dono: Sidney Nogueira (sidneycomvoce@gmail.com) — admin do sistema.

## Sistema Actual
- App: https://revtech-new.vercel.app
- GitHub: https://github.com/sidney-apt-get/revtech-pro
- Supabase: yurtqojjrwlnxpvykvti
- Stack: React + Vite + Supabase + Vercel (sem servidor local)
- Deploy: automático via git push + vercel --prod

## Trabalhar no sistema
cd C:\RevTech\revtech-new
claude  (abre Claude Code)
NUNCA tocar em revtech-pro ou revtech-pro-temp (sistemas antigos)

## Funcionalidades activas
- Login Google OAuth com roles (admin/technician/viewer)
- PIN de protecção nas configurações
- Projectos com Kanban + cards + ROI + timeline de fases
- Galeria de fotos por fase (recepcao/diagnostico/reparacao/concluido/entrega)
- Scanner de código de barras com preenchimento automático (UPCitemdb)
- Tickets com QR Code impressíveis
- Checklists de recepção e entrega com fotos
- Inventário com alertas de stock baixo
- Base de defeitos comuns (22 pré-carregados)
- Encomendas de peças (eBay UK / Amazon / AliExpress)
- Garantias pós-venda
- Time tracking por técnico
- Relatórios PDF/CSV mensais e anuais
- Analytics com gráficos recharts
- eBay UK + Back Market integração
- CeX preços em tempo real
- Mapa de fornecedores (Livingston)
- i18n PT/EN
- PWA instalável no telemóvel
- Sidebar recolhível
- Histórico por número de série
- Configurações: logo, cores, PIN, moeda, prefixo tickets

## Tabelas Supabase
projects, inventory, contacts, transactions, checklists, 
defect_database, parts_orders, app_settings, user_roles,
time_entries, warranties, project_photos

## APIs integradas
- eBay UK: SIDNEYNO-RevTechS-PRD-b6c2e06b1-7cb91251
- Back Market: chave em .env.local
- CeX: API pública sem key
- UPCitemdb: API pública sem key
- Google OAuth: Client ID configurado no Supabase

## Migrations executadas
001 tickets, 002 checklists, 003 defects, 004 orders, 
005 settings, 006 roles, 007 fix_admin, 008 security,
009 time_tracking, 010 warranties, 011 photos
