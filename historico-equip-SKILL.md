---
name: historico-equip
description: |
  Consultar histórico completo de reparações de um equipamento específico no RevTech PRO. 
  Use quando receber um equipamento repetido e quiser saber o que foi feito antes — 
  digite o serial, IMEI, ou ticket antigo, e a skill mostrará: todas as reparações anteriores, 
  datas, defeitos, soluções que funcionaram, problemas encontrados, e rentabilidade. 
  Evita repetir erros e ajuda na garantia. Funciona com qualquer tipo de equipamento.
---

# /historico-equip - Histórico Completo de Equipamento

## Objetivo

Mostrar todo o histórico de um equipamento que você já reparou, ajudando a:
- ✅ Evitar repetir erros (se algo não funcionou antes)
- ✅ Reutilizar soluções que já deram certo
- ✅ Gerenciar garantia pós-venda
- ✅ Entender padrões de falha
- ✅ Calcular rentabilidade total do equipamento

## Fluxo

### 1. Receber Identificador

Aceite qualquer um:
```
/historico-equip
Serial: ABC123XYZ

ou

/historico-equip
IMEI: 123456789012345

ou

/historico-equip
Ticket antigo: RT-20250401-0005

ou

/historico-equip
iPhone 13 Pro que reparei em março
```

### 2. Buscar no Banco de Dados

Query na tabela `projects`:
```sql
SELECT * FROM projects
WHERE serial_number = '<serial>'
   OR imei = '<imei>'
   OR imei2 = '<imei>'
   OR ticket_number = '<ticket>'
   OR id = '<project_id>'
ORDER BY created_at DESC
```

Também query relacionadas:
- `item_history` - histórico de mudanças
- `warranties` - garantias ativas
- `transactions` - receitas/despesas associadas
- `project_photos` - fotos do antes/depois

### 3. Compilar Relatório

```markdown
# 📋 Histórico: iPhone 13 Pro (Serial: ABC123XYZ)

## 🎯 Resumo Geral
- **Primeira reparação:** 15 de março de 2025
- **Última reparação:** 8 de maio de 2025
- **Total de reparações:** 2
- **Status atual:** Vendido
- **Rentabilidade total:** £76 lucro em £280 investimento

## 📊 Reparação #1: 15 Março 2025

**Ticket:** RT-20250315-0042  
**Defeito inicial:** Não liga  
**Diagnóstico:** Bateria + IC Power danificado

| Campo | Valor |
|-------|-------|
| Data | 15/03/2025 |
| Compra | £85 (eBay UK) |
| Custo peças | £45 (bateria + IC) |
| Tempo (h) | 4.5 |
| Status final | Pronto para Venda |
| Preço venda | £150 |
| Lucro | £20 |

**Observações técnicas:**
- Problema inicial muito grave (não respondia a carregador)
- IC Power em mau estado, precisou micro-soldagem
- Bateria original estava totalmente morta (0% saúde)
- Após reparo: 100% funcional, testado 24h

**Fotos:**
- Recepção: [foto_recepcao_1.jpg] - Tela preta, nenhum sinal
- Diagnóstico: [foto_diagnostico_1.jpg] - IC danificado visível
- Conclusão: [foto_conclusao_1.jpg] - Funcionando perfeitamente

---

## 📊 Reparação #2: 8 Maio 2025

**Ticket:** RT-20250508-0087  
**Defeito initial:** Tela fraca, problemas de toque em canto inferior  
**Diagnóstico:** Conector de tela solto (não era necessário trocar)

| Campo | Valor |
|-------|-------|
| Data | 08/05/2025 |
| Compra (de volta) | £150 (Back Market) |
| Custo peças | £0 (só reconectou) |
| Tempo (h) | 0.5 |
| Status final | Vendido |
| Preço venda | £180 |
| Lucro | £30 |

**Observações técnicas:**
- Cliente disse que tela tinha problemas
- Descoberto: apenas conector solto (fácil fix!)
- Reconectou e testou 24h - sem mais problemas
- Excelente margem nesta reparação

**Fotos:**
- Recepção: [foto_recepcao_2.jpg]
- Conclusão: [foto_conclusao_2.jpg]

---

## 💰 Análise Financeira

| Métrica | Valor |
|---------|-------|
| Investimento total | £235 (85+150) |
| Custo peças total | £45 |
| Tempo total | 5 horas |
| Receita total | £330 (150+180) |
| **Lucro total** | **£95** |
| **Margem** | **40%** |
| **Custo/hora** | £9/h |
| **Lucro/hora** | £19/h |

**Conclusão:** Este equipamento foi muito rentável!

---

## ⚠️ Padrões & Avisos

### ✅ O que deu certo:
- Diagnóstico rápido na primeira reparação
- Solução duradoura (cliente voltou para segunda reparação)
- Bom cliente (aceita preço justo)

### ⚠️ O que foi desafiador:
- Primeira reparação exigiu micro-soldagem (complexo)
- Risco de não conseguir IC Power (peça cara)

### 💡 Próxima vez:
- Se retornar novamente, verificar PRIMEIRO conector de tela
- Este cliente parece ter cuidado razoável (não é abuso de garantia)

---

## 🛡️ Garantias Ativas

| Reparação | Garantia | Expira | Status |
|-----------|----------|--------|--------|
| Reparação #1 | 3 meses | 15/06/2025 | Expirou (cliente voltou em 05/2025) |
| Reparação #2 | 3 meses | 08/08/2025 | **ATIVA** ⏰ |

**Risco de reclamação:** Baixo (cliente satisfeito em ambos casos)

---

## 📞 Informações de Contato (se houver)

- **Comprador:** John Smith
- **Email:** john@example.com
- **Plataforma original:** Back Market (para reparação #2)

---

## 🔄 Timeline Visual

```
15 Mar 2025        08 May 2025
├─ Compra (£85)    ├─ Recompra (£150)
│  └─ Reparo       │  └─ Pequeno fix
│     Venda (£150) │     Venda (£180)
│                  │
└─ Garantia        └─ Garantia ativa
   (expirou)          até 08/08/2025
```

---

## 📈 Insights

**Para sua bancada:**
- Este é um equipamento recorrente → bom sinal
- Primeira reparação foi complexa → experiência valiosa
- Margens boas em ambos os casos

**Ao receber novamente:**
1. Verificar conector de tela PRIMEIRO
2. Preparar IC Power (peça cara) se não for conector
3. Cliente é confiável → negocie bem

---

## ✅ Ações Recomendadas

Se ele retornar de novo:
- [ ] Ofereça "reparação prioritária" (3 dias)
- [ ] Desconto de fidelidade: -5% no preço
- [ ] Considere este um "cliente VIP"
```

---

## Dependências

- **Supabase:** Tabelas projects, item_history, warranties, transactions
- **Storage:** Fotos anexadas em project_photos
- **Cálculos:** Automáticos baseados em timestamps e valores

## Casos Especiais

### Equipamento nunca reparado
```
Nenhum histórico encontrado para [serial]
Este é o primeiro registro para este equipamento.
```

### Múltiplos seriais (lotes)
```
Se for lote, mostrar:
- Este é um item de lote [LOT_ID]
- Outros itens do lote: [lista]
- Padrão de defeitos no lote: [análise]
```

### Equipamento com defeito recorrente
```
⚠️ AVISO: Este equipamento voltou 3x com o mesmo defeito
Possível problema:
- Solução anterior não foi adequada
- Novo defeito aparecer (design flaw)
- Recomendação: Ofereça reparo gratuito ou devolva ao cliente
```
