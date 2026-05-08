---
name: guia-reparacao
description: |
  Obter um guia passo-a-passo detalhado de como reparar um equipamento específico. 
  Use durante o reparo na bancada — diga qual é o equipamento (iPhone 13, Nintendo Switch, etc) 
  e qual é o defeito (bateria, tela, cartucho não reconhece), e a skill fornecerá: lista de ferramentas necessárias, 
  peças exatas, passos numerados com avisos de segurança, vídeos de referência, e dicas baseadas 
  em reparos similares que você já fez. Atualiza em tempo real conforme você progride.
---

# /guia-reparacao - Guia Passo-a-Passo de Reparo

## Objetivo

Fornecer um guia de reparo detalhado e prático, baseado em:
- 📚 Seu histórico de reparos (o que funcionou para você)
- 🔧 Ferramentas que você já tem
- 📋 Documentação técnica (iFixit, fabricante, etc)
- ⚠️ Riscos e avisos de segurança

## Fluxo

### 1. Receber Solicitação

Usuário fornece:
```
/guia-reparacao
Equipamento: iPhone 13 Pro
Defeito: Trocar bateria
```

Ou:
```
/guia-reparacao
Nintendo Switch Joy-Con à esquerda não responde
```

### 2. Procurar em Seu Histórico

Query na tabela `projects`:
```sql
SELECT * FROM projects
WHERE equipment = '<tipo>'
  AND defect_description ILIKE '%<defeito>%'
  AND status = 'Vendido'
ORDER BY updated_at DESC
LIMIT 5
```

Isso mostra:
- ✅ Quantas vezes você fez este reparo
- ✅ Tempo que levou
- ✅ Se foi bem-sucedido
- ✅ Observações que você registrou

### 3. Montar Guia Estruturado

```markdown
# 🔧 Guia: iPhone 13 Pro - Trocar Bateria

## 📊 Seu Histórico
- Reparos similares: 8 (bateria em iPhones)
- Taxa de sucesso: 100% (8/8)
- Tempo médio: 1h30
- Lucro médio: £45

## 🛠️ Ferramentas Necessárias

### Essencial (você tem)
- ✅ Chave P2 (pentalobe) - tem
- ✅ Ventosa - tem
- ✅ Spudger - tem
- ✅ Pinça - tem
- ✅ iFixit toolkit - tem

### Opcional (melhor mas não obrigatório)
- ⭕ Heat gun (vai fazer mais rápido, ~5 min menos)

## 📦 Peças Necessárias

| Item | Modelo | Custo | Fornecedor | Tempo Entrega |
|------|--------|-------|------------|---------------|
| Bateria | A2772 (3240mAh) | £12 | Amazon Prime | Hoje |
| Adesivo | Dupla face Apple | £2 | Temu | 2 semanas |
| **Custo Total** | | £14 | | |

**Lucro esperado:** Você cobra £45 → Lucro £31 ✨

## 📋 Passos (Tempo Total: 1h30)

### ⏰ 0min - Preparação (5 minutos)
1. Desligar o iPhone completamente
2. Remover SIM (se houver)
3. Preparar área de trabalho limpa
4. ⚠️ AVISO: A bateria tem adesivo forte, NÃO puxe com força

### ⏰ 5min - Abrir o Dispositivo (15 minutos)
1. Aplicar POUCO calor na borda (heat gun opcional)
2. Usar ventosa na parte superior
3. Inserir spudger na fenda e girar suavemente
4. ⚠️ RISCO: Tela quebrável, trabalhe pacientemente
5. Abrir lentamente até 90 graus
6. Suportar com small block/book

**Seu histórico:** Você faz isso em ~8 min (mais rápido que a média)

### ⏰ 20min - Remover Conector da Bateria (2 minutos)
1. Localizar conector da bateria (cinza, perto da borda inferior)
2. Usar chave P2 para remover 1 parafuso (tamanho: y000)
3. Desconectar suavemente
4. ✅ Agora bateria está inerte (seguro!)

### ⏰ 22min - Remover Adesivos (10 minutos)
1. A bateria tem 2 adesivos brancos sob ela
2. Puxar lentamente na diagonal (NÃO reto para cima!)
3. Se quebrar: usar fita adesiva + palito para sair
4. ⚠️ Se danificar mais: Heat gun + fio de nylon ajuda
5. Limpar residue adesivo com álcool isopropílico

**Seu histórico:** Você teve 1 bateria teimosa em 8 reparos
Solução: aquecia 30 seg e era logo

### ⏰ 32min - Instalar Nova Bateria (10 minutos)
1. Aplicar novo adesivo dupla-face (vem na bateria nova)
2. Posicionar sobre os contatos originais
3. Pressionar por 20 segundos
4. Reconectar o conector (click deve ser audível)
5. Apertar parafuso (NÃO force!)

### ⏰ 42min - Fechar (20 minutos)
1. Inspecionar tela para danos
2. Limpar câmeras/sensores com ar comprimido
3. Fechar lentamente, alinhando bem
4. Aplicar pressão para selamento adesivo
5. Deixar em repouso 2 horas antes de usar

### ⏰ 62min - Teste Final (5 minutos)
1. Ligar iPhone (deve ligar normalmente)
2. Verificar nível bateria (deve mostrar 0-50%)
3. Testar carregamento (plugar cabo)
4. Verificar se shell está bem fechado
5. Limpar exterior

## ⚠️ Avisos de Segurança

| Risco | Como evitar | O que fazer se acontecer |
|-------|------------|--------------------------|
| Tela quebra | Abrir com calor, pacientemente | Cliente autoriza custo extra de tela (~£50) |
| Bateria infla | Já está removida, seguro | Descarte de bateria adequado |
| Água entra | Secar bem antes de fechar | Deixar secar 24h em sílica gel |
| Parafusos perdem | Manter em prato magnético | iPhone 13 Pro vem com 5, pode sair com 4 |

## 🎥 Referências Visuais

- iFixit: https://ifixit.com/Guide/iPhone+13+Pro+Battery+Replacement
- Seu vídeo anterior: "iPhone 12 battery swap" (processo similar)
- Apple: Specs técnicas disponíveis no seu servidor

## 📝 Dicas Baseadas no Seu Histórico

✅ **Você é bom em:** Remover a bateria com calor (média 8 min vs 15 min de tutoriais)
⚠️ **Cuidado em:** Adesivos teimosos (já aconteceu 1x) — aqueça bem
💡 **Otimização:** Você poderia paralelizar com pré-aquecimento enquanto faz os passos 2-4

## ⏱️ Timeline Realista

| Atividade | Tempo | Seu Tempo | Delta |
|-----------|-------|-----------|-------|
| Preparação | 5 min | 5 min | — |
| Abrir | 15 min | 8 min | -7 min 🚀 |
| Remover adesivos | 10 min | 12 min | +2 min |
| Instalar bateria | 10 min | 9 min | -1 min |
| Fechar | 20 min | 20 min | — |
| Teste | 5 min | 4 min | -1 min |
| **TOTAL** | **65 min** | **58 min** | **-7 min** |

**Estimado para este cliente:** 1h15 (você é rápido!)

## 💰 Lucro Final

- Cliente cobra: £45
- Custo peça: £14
- Tempo seu: 1h15
- Lucro: £31
- Margem: 69%

---

## Caso: Bateria Teimosa (seu histórico)

Se a bateria NÃO sair após puxar normalmente:

1. Parar imediatamente (não forçar)
2. Aplicar heat gun por 30 segundos
3. Deixar esfriar 10 segundos
4. Puxar novamente, desta vez mais lateral
5. Se ainda assim: usar fio de nylon por baixo (último recurso)

Você já fez isso 1x com sucesso → pode repetir!
```

---

## Dependências

- **Supabase:** Database de projects (histórico de reparos)
- **iFixit API:** Referências técnicas (se houver API)
- **App Settings:** Preço padrão cobrado, margem esperada
