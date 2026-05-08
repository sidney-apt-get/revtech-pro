---
name: criar-projeto
description: |
  Criar um novo projeto de reparação no RevTech PRO diretamente do Cowork. 
  Use esta skill quando você estiver na bancada e precisar registrar um novo equipamento 
  para reparação — Digite um editor de texto com os detalhes (tipo, marca, modelo, serial, defeito), 
  inclua uma foto se disponível, e a skill automaticamente salvará no seu banco de dados Supabase, 
  gerará um número de ticket único, e confirmará a criação. Funciona com qualquer tipo de equipamento 
  (notebooks, consoles, celulares, áudio vintage, etc). Use sempre que precisar criar um novo projeto 
  sem deixar a bancada.
---

# /criar-projeto - Criar Novo Projeto de Reparação

## Visão Geral

Cria um novo projeto de reparação no RevTech PRO rapidamente, direto do Cowork. 
Você fornece os dados em texto livre (e opcionalmente uma foto), a skill extrai as informações, 
gera um ticket número único, e salva tudo no seu banco de dados.

## Como Funciona

### 1. Solicitar Dados do Usuário

Peça ao usuário para descrever o equipamento em um editor de texto livre. Aceite:
- Informações estruturadas ("Brand: Apple, Model: iPhone 13, Serial: ABC123...")
- Informações desestruturadas ("tenho um iphone que não liga, comprei no ebay")
- Mistura de português e inglês
- Abreviaturas ("nb" = notebook, "tel" = telemóvel)

**Exemplo de entrada aceitável:**
```
Notebook Dell XPS 13 
Serial: 4B3C2D1A
Comprado: eBay UK
Defeito: Não liga, faz barulho na ventoinha
Preço: £120
Fornecedor: seller_ebay_uk_2024
```

### 2. Extrair Dados com IA

Use as seguintes regras:

**Campos obrigatórios (pergunte se faltar):**
- `equipment` - tipo (Notebook, Telemóvel, Consola, etc)
- `defect_description` - o que está errado
- `purchase_price` - quanto pagou

**Campos opcionais (extraia se houver):**
- `brand` - fabricante
- `model` - modelo específico
- `serial_number` - número de série (pode ser IMEI para telefones)
- `supplier_name` - de onde comprou
- `buyer_name` - seu nome (se não for você)
- `notes` - observações adicionais

**Se há foto anexada:**
- Analise com visão de IA para confirmar/adicionar informações
- Procure por: marca, modelo, defeitos visíveis, condição física
- Adicione aos `notes`: "Foto analisada: [observações]"

### 3. Processar Foto (Opcional)

Se o usuário anexar uma foto:
1. Analise a imagem com Gemini Vision 2.5 (use a Edge Function do RevTech)
2. Extraia: marca, modelo, defeitos visíveis, condição (A/B/C/D)
3. Combine com texto fornecido (priorize confirmação explícita do texto)

### 4. Gerar Ticket Número

Crie um número de ticket único no formato: `RT-YYYYMMDD-XXXX`
- `RT` = prefixo (configurável no app_settings)
- `YYYYMMDD` = data de hoje
- `XXXX` = sequência incremental (query database para o último e +1)

Exemplo: `RT-20260508-0001`, `RT-20260508-0002`

### 5. Salvar no Banco de Dados

Insira na tabela `projects` do Supabase com os dados extraídos. Status inicial é sempre "Recebido".

### 6. Confirmar ao Usuário

Mostre uma mensagem clara com:
- ✅ Ticket número criado
- 📋 Resumo dos dados salvos
- 🔗 Link direto para o projeto no RevTech PRO
- ⏰ Timestamp de criação

## Exemplo de Resposta

```
✅ Projeto criado com sucesso!

📌 Ticket: RT-20250508-0001
📱 Equipamento: iPhone 13 (Apple)
🔴 Defeito: Não liga
💰 Valor: £120
👤 Fornecedor: eBay UK

🔗 Ver projeto: https://revtech-new.vercel.app/projects/[project-id]
⏰ Criado em: 8 de maio de 2025, 14:30
```

## Dependências

- **Banco:** Supabase PostgreSQL (yurtqojjrwlnxpvykvti)
- **Auth:** User ID do auth.users do Supabase
- **IA (opcional):** Gemini Vision 2.5 para análise de fotos
- **API:** Acesso à database com permissões INSERT em `projects`
