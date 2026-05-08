# 📚 RevTech PRO - Contexto Completo do Sistema
**Para manutenção e desenvolvimento futuro**

**Última atualização:** 8 de maio de 2026  
**Proprietário:** Sidney Nogueira (sidneycomvoce@gmail.com)  
**Localização do projeto:** `C:\RevTech\revtech-new`  

---

## 🎯 O QUE É O REVTECH PRO

Sistema completo de gestão para oficina de reparação de eletrônicos:
- **Compra:** Eletrônicos com defeito (eBay UK, lotes)
- **Reparação:** Diagnóstico, conserto e testes
- **Revenda:** CeX, Back Market, eBay UK
- **Análise:** Margens, histórico, padrões de defeitos

**Modelo de negócio:** Arbitragem + Reparo = Lucro

---

## 🗄️ STACK TÉCNICO

### Frontend
- **Framework:** React 19 + Vite + TypeScript
- **Estilo:** TailwindCSS
- **Deploy:** Vercel
- **URL:** https://revtech-new.vercel.app

### Backend
- **Database:** Supabase (PostgreSQL)
- **Project ID:** `yurtqojjrwlnxpvykvti`
- **Region:** EU-West-1
- **Auth:** Google OAuth via Supabase
- **Compute:** Supabase Edge Functions

### Repositório
- **GitHub:** github.com/sidney-apt-get/revtech-pro
- **Deploy CLI:** `git add . && git commit -m "msg" && git push && vercel --prod --yes`

---

## 📊 ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais

#### 1. `projects` (Projetos de reparação)
**7 projetos ativos/histórico**
```
Campos essenciais:
- id (UUID, PK)
- user_id (FK → auth.users)
- equipment (Notebook, Telemóvel, Consola, etc)
- brand, model, serial_number
- defect_description (o que está errado)
- diagnosis (análise feita)
- status (Recebido, Em Diagnóstico, Aguardando Peças, Em Manutenção, Pronto para Venda, Vendido, Cancelado)
- purchase_price, parts_cost, shipping_in, shipping_out
- sale_price, sale_platform (eBay, CeX, Back Market)
- ticket_number (RT-YYYYMMDD-XXXX) - ÚNICO
- notes, received_at, sold_at, created_at, updated_at

Status permitidos (constraint):
'Recebido', 'Em Diagnóstico', 'Aguardando Peças', 'Em Manutenção', 'Pronto para Venda', 'Vendido', 'Cancelado'
```

#### 2. `inventory` (Peças e componentes)
**14 itens ativos**
```
Campos essenciais:
- id (UUID, PK)
- item_name (nome da peça)
- category (Peças, Consumíveis, Ferramentas, Patrimônio)
- quantity, min_stock
- unit_cost, location
- supplier, notes
```

#### 3. `transactions` (Financeiro)
**0 registros (pronto para usar)**
```
Campos:
- id, user_id, project_id
- type (income, expense)
- amount, description, category, date
```

#### 4. `defect_database` (Base de defeitos)
**Auto-preenchida conforme você repara**
```
Campos:
- equipment_type, brand, model
- common_defect, likely_cause
- required_parts, avg_repair_time_hours, avg_parts_cost
- difficulty (Fácil, Médio, Difícil)
- success_rate, notes
- auto_created (boolean)
```

#### 5. `parts_orders` (Encomendas de peças)
**3 encomendas ativas**
```
Campos:
- id, project_id, supplier, part_name, quantity
- unit_cost, total_cost, order_number, tracking_number
- status (Encomendado, Em Trânsito, Entregue, Cancelado)
- ordered_at, expected_at, delivered_at
```

#### 6. `warranties` (Garantias pós-venda)
```
Campos:
- project_id, warranty_months (padrão: 3)
- starts_at, expires_at
- status (active, expired, claimed)
- claim_description, claimed_at
```

#### 7. `app_settings` (Configurações gerais)
**1 registro**
```
- company_name: "RevTech"
- company_location: "Livingston, Scotland"
- currency: "GBP" (£)
- vat_rate: 20
- ticket_prefix: "RT"
- telegram_enabled: true
```

---

## 🚀 AS 4 SKILLS DO ASSISTENTE DE BANCADA

### 1. `/criar-projeto` (Registrar novo equipamento)

**Quando usar:**
- Você recebe um novo equipamento na bancada
- Precisa registrar rapidamente sem sair do local

**Como funciona:**
```
User: /criar-projeto
Input: Editor de texto com dados
       "iPhone 13 Pro, não liga, comprei por £150, eBay UK"
       
Claude:
1. Extrai: marca, modelo, defeito, preço, fornecedor
2. Gera ticket: RT-20260508-0001
3. Salva no banco
4. Retorna: confirmação + link para o projeto
```

**Resultado:**
- Novo projeto criado com status "Recebido"
- Ticket número único gerado
- Link direto para editar no RevTech PRO

**Arquivo:** `criar-projeto-SKILL.md`

---

### 2. `/diagnosticar` (Com Gemini Pro para fotos)

**Quando usar:**
- Você recebe um equipamento e precisa entender o que está errado
- Quer aproveitar seu histórico para evitar erros

**Como funciona:**
```
User: /diagnosticar
Input: [Foto do equipamento] + "não liga, não carrega"

Claude:
1. Gemini Pro analisa a foto (marca, modelo, defeitos visuais)
2. Consulta seu banco de defeitos históricos
3. Retorna: 3 diagnósticos com probabilidades
4. Mostra seu histórico de sucesso em casos similares
5. Recomenda qual teste fazer PRIMEIRO (quick win)
```

**Resultado:**
- Diagnóstico estruturado com confiança
- Próximos passos prioritários
- Ferramentas necessárias
- Tempo estimado

**Arquivo:** `diagnosticar-SKILL.md`

---

### 3. `/guia-reparacao` (Passos passo-a-passo)

**Quando usar:**
- Você sabe qual é o defeito
- Precisa de instruções detalhadas para consertar
- Quer otimizar seu tempo e evitar erros

**Como funciona:**
```
User: /guia-reparacao
Input: "iPhone 13 Pro - trocar bateria"

Claude:
1. Consulta seu histórico (quantas vezes você fez isso)
2. Lista ferramentas que você tem
3. Retorna: passos numerados com avisos
4. Mostra tempo que VOCÊ leva (não a média)
5. Calcula lucro esperado
```

**Resultado:**
- Guia estruturado com passos
- Avisos de segurança
- Timeline realista baseada em seu histórico
- Análise de lucro/custo

**Arquivo:** `guia-reparacao-SKILL.md`

---

### 4. `/historico-equip` (Buscar histórico de equipamento)

**Quando usar:**
- Um cliente volta com equipamento que você já reparou
- Quer evitar repetir erros do passado
- Precisa gerenciar garantia

**Como funciona:**
```
User: /historico-equip
Input: Serial "ABC123XYZ" ou IMEI ou ticket antigo

Claude:
1. Busca todas as reparações deste equipamento
2. Mostra datas, defeitos, soluções
3. Calcula rentabilidade total
4. Retorna: padrões, avisos, recomendações
```

**Resultado:**
- Timeline completo de reparações
- O que funcionou/não funcionou antes
- Garantias ativas
- Análise financeira completa

**Arquivo:** `historico-equip-SKILL.md`

---

## 🔄 FLUXO DE USO NA BANCADA

```
┌─────────────────────────────────────────────────────┐
│ 1. RECEBE EQUIPAMENTO NOVO NA BANCADA               │
│    └─ /criar-projeto (registra + gera ticket)       │
│                                                      │
│ 2. PRECISA ENTENDER O PROBLEMA                      │
│    └─ /diagnosticar [foto + sintomas]               │
│       └─ Retorna: 3 causas possíveis + testes       │
│                                                      │
│ 3. SABE QUAL É O DEFEITO, QUER CONSERTAR             │
│    └─ /guia-reparacao [tipo + defeito]              │
│       └─ Retorna: passos + tempo + lucro            │
│                                                      │
│ 4. EQUIPAMENTO VOLTA (GARANTIA OU NOVO DEFEITO)     │
│    └─ /historico-equip [serial]                     │
│       └─ Retorna: tudo que já foi feito             │
│                                                      │
│ 5. DURANTE O REPARO: /log-progresso (futuro)        │
│    └─ Registra atualizações em tempo real           │
│                                                      │
│ 6. VENDA: /relatorio-vendas (futuro)                │
│    └─ Análise de rentabilidade                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 SEGURANÇA & CREDENCIAIS

### ⚠️ PROBLEMA CONHECIDO

**Google Client Secret foi compartilhado publicamente!**
- Status: PENDENTE
- Action: Revogar em console.cloud.google.com > My Project 7384
- Lembrete agendado: 10 de maio de 2026, 18h30

### Localização das Credenciais

```
.env.local:
├─ VITE_SUPABASE_URL: https://yurtqojjrwlnxpvykvti.supabase.co
├─ VITE_SUPABASE_ANON_KEY: [public key for browser]
├─ VITE_EBAY_APP_ID: SIDNEYNO-RevTechS-PRD-b6c2e06b1-7cb91251
├─ VITE_BACKMARKET_API_KEY: [private key]
└─ NEXT_PUBLIC_GOOGLE_CLIENT_ID: [compromised - revoke!]

Supabase Secrets (Edge Functions):
├─ GEMINI_API_KEY: [for Gemini Vision analysis]
└─ TELEGRAM_TOKEN: [for notifications]
```

---

## 🌐 INTEGRAÇÕES EXTERNAS

### 1. Telegram Notificações
- Edge Function: `telegram-notify`
- Dispara quando: novo projeto, venda, stock baixo
- Status: Deployada e funcional

### 2. Gemini Vision AI
- Edge Function: `ai-analyze`
- Analisa fotos para extrair: marca, modelo, defeitos
- Status: Deployada, em teste

### 3. Comparador de Preços
- Integrado no app: CeX vs eBay vs Back Market
- Mostra melhor preço de revenda

### 4. i18n (Tradução)
- Suporta: PT-BR e EN-GB
- Botão 🌐 traduz conteúdo inserido automaticamente

---

## 📱 FUNCIONALIDADES ATIVAS

### Gestão de Projetos
- ✅ Kanban, lista e ficha completa
- ✅ Formulário dinâmico por categoria
- ✅ Auto-preenchimento por IA (Gemini Vision)
- ✅ QR Code imprimível para cada projeto
- ✅ Histórico de reparações por equipamento

### Inventário
- ✅ Ficha completa com custo/quantidade
- ✅ Dar baixa com motivo e ligação a projeto
- ✅ Encomendas com rastreamento automático
- ✅ Lotes de compra com custo automático

### Finanças
- ✅ Balanço diário/semanal/mensal/anual
- ✅ Relatórios PDF/CSV
- ✅ Analytics com gráficos
- ✅ Metas financeiras mensais

### Suporte
- ✅ PWA instalável no telemóvel
- ✅ i18n completo
- ✅ Sidebar recolhível
- ✅ Modo dark/light

---

## 🚀 COMO USAR AS SKILLS

### Opção 1: No Cowork (Recomendado)
```
1. Abra Cowork
2. Digite /criar-projeto
3. Siga as instruções
4. Dados salvos automaticamente no RevTech PRO
```

### Opção 2: No RevTech PRO (Futuro)
```
1. Abra RevTech PRO
2. Clique aba "Assistente"
3. Botões: Criar | Diagnosticar | Guia | Histórico
4. Mesmo resultado, sem deixar o sistema
```

---

## 📈 PRÓXIMOS PASSOS (PRIORIZADO)

### Imediato
1. ✅ Testar as 4 skills (criar-projeto, diagnosticar, guia-reparacao, historico-equip)
2. ✅ Revogar Google Client Secret comprometido
3. ✅ Confirmar Gemini Vision funciona bem

### Curto Prazo (1-2 semanas)
- [ ] Integrar skills no RevTech PRO como aba "Assistente"
- [ ] Criar skill `/log-progresso` (atualizar status durante reparo)
- [ ] Criar skill `/relatorio-vendas` (análise mensal)
- [ ] Dashboard de bancada com KPIs

### Médio Prazo (1-2 meses)
- [ ] Automação de fotografias (QR code → camera)
- [ ] Integração com eBay API (importar anúncios)
- [ ] Previsão de lucro por equipamento (ML)
- [ ] Alertas de peças faltando

---

## 🛠️ MANUTENÇÃO & TROUBLESHOOTING

### Problema: Skills não estão salvando na database
**Solução:**
1. Verificar se Supabase está online
2. Verificar permissões RLS em `projects` table
3. Ver logs em Supabase > Edge Functions > ai-analyze

### Problema: Gemini Vision não funciona
**Solução:**
1. Verificar API key no Supabase secrets
2. Testar manualmente em edge function
3. Verificar quota de Gemini API

### Problema: Telegram não notifica
**Solução:**
1. Verificar token em Supabase secrets
2. Confirmar que telegram_enabled = true em app_settings
3. Testar manualmente em `telegram-notify` edge function

---

## 📞 CONTATO & SUPORTE

**Proprietário:** Sidney Nogueira  
**Email:** sidneycomvoce@gmail.com  
**GitHub:** github.com/sidney-apt-get  

**Para futuras sessões do Claude:**
Leia este arquivo ANTES de qualquer desenvolvimento. Ele contém todo o contexto necessário para:
- Entender a arquitetura
- Adicionar novas features
- Debugar problemas
- Treinar novos assistentes

---

## 📝 HISTÓRICO DE MUDANÇAS

| Data | O que mudou | Por quê |
|------|------------|--------|
| 08/05/2026 | Criadas 4 skills + documentação | Assistente de bancada MVP |
| 08/05/2026 | Descoberto Google Client Secret compromissado | Security audit |
| 22/04/2026 | Projeto RevTech PRO iniciado | MVP launch |

---

**Este documento é a "memória permanente" do projeto RevTech PRO.**  
**Leia-o sempre que retornar para desenvolvimento/manutenção.**

