---
name: diagnosticar
description: |
  Diagnosticar problemas de equipamento eletrônico rapidamente na bancada usando IA e seu banco de defeitos. 
  Use quando receber um novo equipamento e precisar entender o que está errado — envie uma foto do 
  equipamento (ou descreva os sintomas) e a skill analisará com Gemini Pro, consultará seu banco de defeitos 
  históricos, e fornecerá: possíveis causas, ferramentas necessárias, dificuldade de reparo, tempo estimado, 
  e próximos passos. Funciona com qualquer tipo de equipamento (notebooks, telemóveis, consolas, áudio, etc).
---

# /diagnosticar - Diagnóstico Rápido de Equipamento

## Objetivo

Fornecer um diagnóstico rápido e confiável de um equipamento na bancada usando:
- 📸 Análise visual com Gemini Pro (se foto enviada)
- 📊 Consulta ao banco de defeitos históricos do RevTech
- 🧠 Padrões de seus próprios reparos anteriores

## Fluxo

### 1. Receber Entrada

Aceite:
- **Com foto:** Foto do equipamento + descrição dos sintomas
- **Sem foto:** Apenas descrição textual dos sintomas

Exemplo 1 (com foto):
```
/diagnosticar
[Foto de iPhone com tela preta]
"Não liga, não carrega, tentei forçar reset"
```

Exemplo 2 (sem foto):
```
/diagnosticar
"Notebook Dell faz barulho na ventoinha, trava frequentemente, esquenta muito"
```

### 2. Análise com Gemini Pro (se houver foto)

Use Gemini 2.0 Pro Vision para:
- ✅ Identificar marca, modelo, geração
- ✅ Detectar defeitos visuais (danos, corrosão, bateria inflada, etc)
- ✅ Avaliar condição geral (A/B/C/D)
- ✅ Identificar componentes visíveis danificados

**Retorno esperado da análise:**
```json
{
  "brand": "Apple",
  "model": "iPhone 13 Pro",
  "visual_defects": ["Tela preta", "Possível dano em IC power"],
  "condition": "C",
  "notes": "Sem sinais de queda, corrosão mínima"
}
```

### 3. Consultar Banco de Defeitos

Query na tabela `defect_database` do RevTech:
```sql
SELECT * FROM defect_database
WHERE equipment_type = '<tipo>'
  AND (common_defect ILIKE '%<sintoma>%' 
       OR brand = '<marca>')
ORDER BY success_rate DESC
LIMIT 10
```

Isso retorna:
- Defeitos comuns para esse tipo/marca
- Causa provável
- Peças necessárias
- Tempo médio de reparo
- Taxa de sucesso nos seus reparos anteriores

### 4. Compilar Diagnóstico

Estruture a resposta assim:

```markdown
## 🔍 Diagnóstico: iPhone 13 Pro

### Sintomas Relatados
- Não liga
- Não carrega
- Travamentos frequentes

### Análise Visual (Gemini Pro)
- Marca/Modelo: Apple iPhone 13 Pro (confirmado)
- Condição: C (sinais de uso normal)
- Possíveis danos: Nenhum visível externamente

### 3 Possíveis Causas (por probabilidade)

#### 1️⃣ Bateria Degradada (45% de probabilidade)
- **Sintoma:** Não liga nem carrega
- **Como confirmar:** Conectar ao carregador Lightning por 30 min
- **Ferramentas:** Multímetro, Power Supply
- **Peça:** Bateria iPhone 13 Pro (~£15)
- **Dificuldade:** Média
- **Tempo:** 1.5 horas
- **Seu histórico:** 8 sucessos em 9 tentativas (89%)

#### 2️⃣ IC Power Danificado (30% de probabilidade)
- **Sintoma:** Não responde a carregamento, sem sinais de vida
- **Como confirmar:** Multímetro no conector Lightning
- **Ferramentas:** Stencil U2, BGA rework station
- **Peça:** IC Power U2 (£5-10)
- **Dificuldade:** Difícil (micro-soldagem)
- **Tempo:** 3-4 horas
- **Seu histórico:** 3 sucessos em 7 tentativas (43%)

#### 3️⃣ Problema de Software/DFU (25% de probabilidade)
- **Sintoma:** Tela preta mas pode estar em DFU
- **Como confirmar:** Tentar Force Reset (Volume +, Volume -, depois botão Power 15 seg)
- **Ferramentas:** Computador com iTunes
- **Peça:** Nenhuma
- **Dificuldade:** Fácil
- **Tempo:** 15 minutos
- **Seu histórico:** Sempre funciona (100%)

### 📋 Próximos Passos Recomendados

1. **PRIMEIRO:** Tentar Force Reset (rápido, 100% de sucesso dos seus casos)
2. **SE NÃO FUNCIONAR:** Testar com multímetro (identifica IC Power vs Bateria)
3. **DEPOIS:** Pedir para cliente autorizar reparo de bateria (mais comum, mais barato)

### 📦 Material que você PODE precisar
- Bateria iPhone 13 Pro: £15
- Ferramenta de abertura: já tem
- Parafusos: já tem

### ⏱️ Timing
- **Se for bateria:** 1.5h + tempo de espera de peça
- **Se for IC Power:** 3-4h (mais caro, mais demorado)
- **Se for software:** 15 minutos ✨
```

### 5. Retornar com Confiança

Inclua sempre:
- 📊 Score de confiança (baseado em seu histórico)
- ✅ Qual teste fazer PRIMEIRO (quick win)
- 💰 Custo estimado da peça
- ⏱️ Tempo de reparo
- 📞 Se deve avisar cliente antes

---

## Casos Especiais

### Equipamento novo (sem histórico)
Se não há defeitos similares no banco:
```
Não encontrei casos similares no seu histórico, mas baseado em 
documentação técnica (iFixit, etc):
- Provável causa: [baseado em padrão geral]
- Teste recomendado: [passo seguro]
```

### Múltiplos defeitos
Se há vários sintomas:
```
Este equipamento pode ter múltiplos problemas:
1. Problema A (95% certeza) → fix primeiro
2. Problema B (50% certeza) → fix depois
3. Problema C (20% certeza) → ignore por enquanto
```

---

## Dependências

- **Supabase:** Database revtech-pro (tabelas: defect_database, projects)
- **Gemini Pro:** Para análise visual quando há foto
- **Banco de Defeitos:** Precisa estar populado (vai crescer conforme você repara)

## Exemplo de Uso Real

```
User: /diagnosticar
       [Foto de Nintendo Switch]
       Não liga, não reconhece cartuchos

Claude: [Análise Gemini Pro]
        [Query ao defect_database]
        
Retorna: 3 diagnósticos com seu histórico de sucesso,
         recomenda PRIMEIRO testar os contatos do cartucho
         (seu histórico: 95% sucesso, 5 minutos)
```
