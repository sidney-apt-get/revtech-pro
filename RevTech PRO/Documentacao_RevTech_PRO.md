# RevTech PRO - Documentação Técnica Completa

**Última atualização:** Maio 2026  
**Proprietário:** Sidney Nogueira (sidneycomvoce@gmail.com)

## 1. VISÃO GERAL DO NEGÓCIO

### Modelo de Negócio
- **Compra:** Eletrónicos com defeito no eBay UK
- **Reparação:** Diagnóstico, reparação e testes
- **Revenda:** CeX, Back Market, eBay UK

### Categorias de Produtos
Portáteis, Telemóveis, Consolas, Áudio Vintage, Componentes PC, Tablets, e-Readers, Periféricos

---

## 2. STACK TÉCNICO

### Aplicação Web
| Tecnologia | Detalhes |
|-----------|----------|
| Frontend | React 19 + Vite + TypeScript |
| Estilo | TailwindCSS |
| Backend | Supabase (PostgreSQL) |
| Deploy | Vercel + Supabase Edge Functions |
| Autenticação | Google OAuth via Supabase |
| Localização | PT-BR e EN-GB (react-i18next) |

### Repositórios
- **GitHub:** github.com/sidney-apt-get/revtech-pro
- **App:** https://revtech-new.vercel.app
- **Supabase Project ID:** yurtqojjrwlnxpvykvti

---

## 3. ESTRUTURA DA BASE DE DADOS

### Tabelas Principais
- `projects` - Projetos de reparação
- `inventory` - Peças e equipamentos em stock
- `defect_database` - Base de defeitos (auto-alimentada)
- `transactions` - Transações financeiras
- `parts_orders` - Encomendas de peças
- `project_photos` - Galeria de fotos por fase
- `warranties` - Garantias pós-venda
- `item_history` - Histórico universal de itens

### Tabelas Adicionais
contacts, checklists, time_entries, expenses, financial_goals, user_roles, categories, category_fields, item_field_values, lots, app_settings, scanner_sessions

### Migrações
Executadas 22 migrações (001-022)

---

## 4. FUNCIONALIDADES ATIVAS

### Gestão de Projetos
✅ Kanban, lista e ficha completa (/projects/:id)
✅ Formulário dinâmico por categoria
✅ Auto-preenchimento por IA (Gemini Vision)
✅ QR Code imprimível
✅ Histórico de reparações por equipamento

### Inventário e Encomendas
✅ Ficha completa de stock (/inventory/:id)
✅ Dar baixa com motivo e ligação a projeto
✅ Encomendas com rastreamento automático
✅ Lotes de compra com custo automático

### Finanças e Relatórios
✅ Balanço diário/semanal/mensal/anual
✅ Relatórios PDF/CSV
✅ Analytics com gráficos
✅ Metas financeiras mensais

### Notificações e Integrações
✅ Telegram (novo projeto, venda, stock baixo)
✅ Comparador CeX/eBay/Back Market
✅ Tradução de conteúdo inserido (botão 🌐)

### Suporte Multiplatforma
✅ PWA instalável no telemóvel
✅ i18n completo PT-BR e EN-GB
✅ Sidebar recolhível

---

## 5. EDGE FUNCTIONS SUPABASE

### ai-analyze
- Análise de imagem com Gemini 2.5-flash
- Tradução de texto via Gemini
- Status: Deployada

### telegram-notify
- Notificações Telegram
- Status: Deployada, secrets configurados

---

## 6. PROBLEMAS CONHECIDOS

### Auto-preenchimento por Foto
- Status: Em teste
- Ficheiro: src/components/PhotoAnalyzeButton.tsx
- Problema: Edge function retorna 200 mas resposta pode não estar a processar corretamente

### Categorias com Emojis
- Status: Corrigido
- Solução: categoryIcons.ts com ASCII

### Segurança - Google OAuth
- ⚠️ **URGENTE:** Google Client Secret foi partilhado publicamente
- **Ação:** Revogar em console.cloud.google.com > My Project 7384 > OAuth 2.0

---

## 7. PROCESSO DE DEPLOY

**Comando:**
```
git add . && git commit -m "mensagem" && git push && vercel --prod --yes
```

**Ambiente de desenvolvimento:**
```
cd C:\RevTech\revtech-new && claude
```

---

## 8. GESTÃO DE CREDENCIAIS

### Localização das Credenciais
- **Google OAuth:** Google Cloud Console > My Project 7384
- **Supabase Anon Key:** .env.local
- **eBay App ID:** .env.local (SIDNEYNO-RevTechS-PRD-b6c2e06b1-7cb91251)
- **Back Market API Key:** .env.local
- **Secrets de Edge Function:** Supabase (Telegram Token, Gemini API Key)

---

## 9. PRÓXIMOS PASSOS SUGERIDOS

1. Revogar Google Client Secret comprometido
2. Corrigir encoding de categorias definitivamente
3. Confirmar que auto-preenchimento por foto funciona
4. Criar 2-3 projetos reais para testar o sistema
5. Testar fluxo completo: compra → reparação → venda

---

**DOCUMENTO CONFIDENCIAL - Uso interno apenas**
