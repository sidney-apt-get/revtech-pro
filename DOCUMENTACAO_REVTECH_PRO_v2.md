# RevTech PRO v2 — Documentação Completa

## 1. Visão Geral do Sistema

**RevTech PRO** é uma aplicação web de gestão profissional para oficinas de restauro de electrónicos. Permite gerir todo o ciclo de vida de um projecto: recepção, diagnóstico, reparação, venda e pós-venda (garantias).

**Para quem é:** Sidney Alves Nogueira, operador de oficina familiar em Livingston, Scotland. Compra electrónicos com defeito (via eBay UK, Back Market, fornecedores), repara e revende via CeX, Back Market, eBay UK.

### Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estilo | Tailwind CSS + shadcn/ui |
| Routing | Wouter |
| Estado servidor | TanStack Query |
| Base de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Edge Functions | Supabase Edge Functions (Deno) |
| Hosting | Vercel |
| i18n | i18next (EN/PT) |
| Gráficos | Recharts |
| PDF | jsPDF + html2canvas |
| Scanner | @zxing/library |
| QR Code | qrcode |

---

## 2. URLs e Acessos

| Serviço | URL |
|---------|-----|
| App (produção) | https://revtech-new.vercel.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/yurtqojjrwlnxpvykvti |
| GitHub | https://github.com/sidney-apt-get/revtech-pro |
| Vercel Dashboard | https://vercel.com/sidney-apt-gets-projects/revtech-new |
| Google Cloud Console | https://console.cloud.google.com → "My Project 7384" |

---

## 3. Credenciais e Configurações

### Variáveis de Ambiente (.env.local)

```
VITE_SUPABASE_URL=https://yurtqojjrwlnxpvykvti.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key do Supabase>
VITE_EBAY_APP_ID=<eBay App ID>
VITE_EBAY_CERT_ID=<eBay Cert ID>
VITE_BACKMARKET_API_KEY=<Back Market API Key>
VITE_XERO_CLIENT_ID=<Xero Client ID> (opcional)
```

### Como actualizar chaves

1. Aceder ao Vercel Dashboard → Project → Settings → Environment Variables
2. Editar a variável pretendida
3. Fazer novo deploy: `vercel --prod --yes`

### Como renovar Google Client Secret

1. Google Cloud Console → APIs & Services → Credentials
2. Editar o OAuth 2.0 Client "RevTech PRO"
3. Regenerar Client Secret
4. Actualizar em Supabase Dashboard → Authentication → Providers → Google

---

## 4. Funcionalidades Completas

### Páginas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/dashboard` | Dashboard | KPIs financeiros e operacionais, pipeline, gráficos, alertas |
| `/projects` | Projectos | Lista/kanban de projectos com filtros por estado |
| `/orders` | Encomendas de Peças | Gestão de encomendas a fornecedores |
| `/inventory` | Inventário | Stock de peças, ferramentas, consumíveis |
| `/defects` | Base de Defeitos | Biblioteca de defeitos conhecidos por equipamento |
| `/contacts` | Contactos | CRM de fornecedores, clientes e parceiros |
| `/reports` | Relatórios | Relatórios mensais/anuais com exportação PDF/CSV |
| `/analytics` | Analytics | Gráficos avançados, top equipamentos, time tracking |
| `/map` | Mapa | Localização da oficina e plataformas de venda |
| `/ebay` | eBay / Back Market | Pesquisa de equipamentos para comprar e calcular ROI |
| `/labels` | Etiquetas de Preço | Impressão de etiquetas para items prontos a vender |
| `/serial-history` | Histórico Serial | Timeline de um equipamento por nº de série/IMEI |
| `/warranties` | Garantias | Gestão de garantias pós-venda e reclamações |
| `/settings` | Configurações | Empresa, aparência, conta, segurança, dados, integrações |
| `/admin/users` | Utilizadores | Gestão de roles (admin/technician/viewer) |

### Funcionalidades por Componente

- **BarcodeScanner**: Lê códigos de barras/QR em tempo real via câmara
- **PriceLabel**: Gera etiquetas 100×60mm com QR code para impressão
- **CexPriceWidget**: Pesquisa preços no CeX via edge function proxy
- **TimeTracker**: Timer por projecto com registo automático na DB
- **WarrantyModal**: Criação de garantia ao marcar projecto como Vendido
- **ChecklistModal**: Checklists de recepção e entrega com fotos
- **KanbanBoard**: Vista kanban com drag-and-drop dos projectos

---

## 5. Base de Dados

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `projects` | Projectos de reparação (principal) |
| `inventory` | Stock de inventário |
| `parts_orders` | Encomendas de peças a fornecedores |
| `contacts` | CRM de contactos |
| `defect_entries` | Base de defeitos conhecidos |
| `checklists` | Checklists de recepção/entrega |
| `app_settings` | Configurações por utilizador |
| `user_roles` | Roles dos utilizadores (admin/technician/viewer) |
| `time_entries` | Registo de tempo por projecto (FASE 3) |
| `warranties` | Garantias pós-venda (FASE 5) |

### Migrations

Localização: `supabase/migrations/`

| Ficheiro | Descrição |
|----------|-----------|
| `001_*.sql` a `008_*.sql` | Schema inicial + segurança |
| `009_time_tracking.sql` | Tabela time_entries |
| `010_warranties.sql` | Tabela warranties |

### Como executar migrations

```sql
-- No Supabase Dashboard → SQL Editor, executar cada ficheiro por ordem
-- OU via CLI:
supabase db push
```

### Relações principais

```
projects (1) → (N) time_entries
projects (1) → (1) warranties
projects (1) → (N) checklists
projects (1) → (N) parts_orders
auth.users (1) → (N) projects, time_entries, warranties
```

---

## 6. Deploy e Manutenção

### Como fazer deploy

```bash
cd C:\RevTech\revtech-new
git add .
git commit -m "descrição"
git push
vercel --prod --yes
```

### Como ver logs de erros

```bash
vercel logs revtech-new --prod
```

Ou no Vercel Dashboard → Deployments → View Logs.

### Como fazer backup manual

1. Entrar na app → Settings → aba "Dados"
2. Clicar "Backup para Google Drive" OU "Download Local"
3. Ficheiro JSON com todos os dados exportado

### Edge Functions (Supabase)

```bash
# Deploy individual
supabase functions deploy cex-search
supabase functions deploy ebay-search
supabase functions deploy backmarket-search

# Ver logs
supabase functions logs cex-search
```

---

## 7. Integrações Externas

### Google OAuth
- Provider: Supabase Auth → Google
- Console: Google Cloud Console → "My Project 7384" → OAuth 2.0 Credentials
- Redirect URI: `https://yurtqojjrwlnxpvykvti.supabase.co/auth/v1/callback`

### eBay UK API
- Tipo: Browse API (pesquisa pública)
- Variáveis: `VITE_EBAY_APP_ID`, `VITE_EBAY_CERT_ID`
- Edge function: `supabase/functions/ebay-search/`
- Registo: developer.ebay.com

### Back Market API
- Variável: `VITE_BACKMARKET_API_KEY`
- Edge function: `supabase/functions/backmarket-search/`
- API pública com rate limiting

### CeX API
- Pública, sem chave necessária
- CORS proxy via: `supabase/functions/cex-search/`
- URL base: `wss2.cex.uk.webuy.io/v3/boxes`

### Xero (Contabilidade UK)
- OAuth 2.0: `VITE_XERO_CLIENT_ID` necessário
- Lib: `src/lib/xero.ts`
- Configurar em Settings → Integrações → Xero
- Trial gratuito 30 dias em xero.com

---

## 8. Problemas Conhecidos e Soluções

### i18n não muda de idioma
- **Causa**: i18next v26 + react-i18next v17 requer `react: { useSuspense: false }` e persistência manual no localStorage
- **Solução**: Já corrigido em `src/lib/i18n.ts` e `src/components/LanguageSelector.tsx`

### Build falha com workbox size limit
- **Causa**: Bundle > 2MB por causa do @zxing/library
- **Solução**: `maximumFileSizeToCacheInBytes: 4 * 1024 * 1024` em `vite.config.ts`

### CeX search não funciona
- **Causa**: Edge function não deployed no Supabase
- **Solução**: `supabase functions deploy cex-search`

### Scanner não abre câmara
- **Causa**: Permissão de câmara negada ou HTTP (não HTTPS)
- **Solução**: Usar sempre HTTPS; aceitar permissão de câmara no browser

### Garantia não aparece depois de vender
- **Causa**: `create.mutateAsync` não retorna o projecto criado com o ID
- **Solução**: Verificar que o hook `useCreateProject` retorna o objecto completo

---

## 9. Roadmap Futuro

### App React Native / PWA melhorada
- A app já é PWA (installable)
- Próximo passo: React Native com Expo para iOS/Android nativo
- Foco: scanner de câmara nativo + notificações push

### Notificações Telegram/WhatsApp
- Webhook no Supabase → notificação quando projecto muda de estado
- Usar n8n.io ou Zapier como ponte

### Portal de Clientes
- Sub-domínio público onde o cliente pode ver o estado do seu equipamento
- Acesso via QR code no ticket de recepção
- Sem login necessário (acesso por token único)

### Relatórios Avançados
- Exportação automática mensal para Xero
- Relatório de impostos (VAT return UK)
- Comparação ano-a-ano

### Multi-oficina
- Suporte para múltiplas localizações
- Relatórios consolidados por oficina
