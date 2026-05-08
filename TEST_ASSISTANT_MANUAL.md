# 🧪 TESTE MANUAL - ASSISTENTE DE BANCADA

**Data:** 08/05/2026  
**Objetivo:** Validar que todos os componentes estão funcionando

---

## ✅ CHECKLIST DE VERIFICAÇÃO NO PAINEL

### **1. Navegar até a aba Assistente**
- [ ] Menu esquerdo tem ícone Wand2 (✨)
- [ ] Label mostra "Assistente" (PT-BR) ou "Assistant" (EN-GB)
- [ ] Clickável e abre página sem erro

### **2. Verificar Componentes da Página**
- [ ] Header: "Assistente de Bancada - 4 super-poderes para sua oficina"
- [ ] Alert banner: "Abra o Cowork e digite o comando..."
- [ ] 4 Cards em grid (2 colunas no desktop, 1 no mobile)

### **3. Validar Card 1: Criar Projeto**
- [ ] Título: "📝 Criar Projeto"
- [ ] Descrição: "Registrar novo equipamento + gerar ticket automático"
- [ ] Comando exibido: `/criar-projeto`
- [ ] Tempo: "2 min"
- [ ] Cor: Azul
- [ ] Ícone: Plus (+)

### **4. Validar Card 2: Diagnosticar**
- [ ] Título: "🔍 Diagnosticar"
- [ ] Descrição: "Analisar foto + defeito + sugerir solução (Gemini Pro)"
- [ ] Comando exibido: `/diagnosticar`
- [ ] Tempo: "5 min"
- [ ] Cor: Roxo
- [ ] Ícone: Search (lupa)

### **5. Validar Card 3: Guia de Reparo**
- [ ] Título: "🔧 Guia de Reparo"
- [ ] Descrição: "Passos passo-a-passo + lucro estimado"
- [ ] Comando exibido: `/guia-reparacao`
- [ ] Tempo: "3 min"
- [ ] Cor: Laranja
- [ ] Ícone: Settings (engrenagem)

### **6. Validar Card 4: Histórico**
- [ ] Título: "📊 Histórico"
- [ ] Descrição: "Ver tudo que foi feito antes + garantias"
- [ ] Comando exibido: `/historico-equip`
- [ ] Tempo: "2 min"
- [ ] Cor: Verde
- [ ] Ícone: Clock (relógio)

### **7. Verificar Cards de Informação**
- [ ] Card 1: "📚 Documentação" com link para Google Drive
- [ ] Card 2: "💡 Próximos Passos" com botão de feedback

### **8. Verificar Benefícios**
- [ ] Exibe "-10h economizadas por mês"
- [ ] Exibe "+30% maior taxa de acerto"
- [ ] Exibe "100% controle financeiro"

### **9. Verificar Responsividade**
- [ ] Desktop: 2 colunas
- [ ] Tablet: 2 colunas (reduzido)
- [ ] Mobile: 1 coluna (full width)

### **10. Verificar Dark Mode**
- [ ] Fundo responde ao tema (dark/light)
- [ ] Cores legíveis em ambos modos
- [ ] Textos contrastam bem

---

## 🔧 TESTES DE CLIQUE

### **Ao clicar em um card:**
- [ ] Exibe alerta: "Para usar esta skill, abra o Cowork e digite: /comando"
- [ ] Não causa erro na console
- [ ] Não redireciona ou faz reload

### **Ao clicar no link de documentação:**
- [ ] Abre Google Drive em aba nova
- [ ] Mostra arquivos de skill

### **Ao clicar em "Próximos Passos":**
- [ ] Mostra alerta: "Integração visual em desenvolvimento!"

---

## 💻 TESTES DE CONSOLE (F12)

Abra DevTools (F12) → Console e verifique:

- [ ] Nenhum erro (❌ vermelho)
- [ ] Nenhum warning crítico (⚠️ amarelo)
- [ ] Componente renderiza sem problema

**Comandos para testar:**
```javascript
// Deve retornar o elemento da página
document.querySelector('[class*="Assistente"]')

// Deve retornar 4 cards
document.querySelectorAll('[class*="Card"]').length
```

---

## 🌍 TESTES DE IDIOMA

### **PT-BR (Português Brasileiro)**
- [ ] Menu mostra "Assistente"
- [ ] Todos labels em português
- [ ] Emojis aparecem corretamente

### **EN-GB (Inglês)**
- [ ] Menu mostra "Assistant"
- [ ] Todos labels em inglês
- [ ] Emojis aparecem corretamente

**Como testar:**
1. Abra Configurações
2. Mude idioma para EN-GB
3. Recarregue página
4. Volte para PT-BR

---

## 📱 TESTES DE NAVEGAÇÃO

- [ ] Acessar via URL direto: `https://seu-site.com/assistant`
- [ ] Voltar ao Dashboard funciona
- [ ] Links internos funcionam
- [ ] Sem erro 404

---

## ⚡ TESTES DE PERFORMANCE

**Esperado:**
- Carregamento: < 1 segundo
- Clique em card: < 100ms
- Resposta da página: suave

---

## 🎯 RESULTADO ESPERADO

✅ **PASS** - Tudo funciona, todos os elementos visíveis  
❌ **FAIL** - Algo não aparece ou está quebrado  
⚠️ **WARN** - Funciona mas com pequenos problemas

---

## 📝 NOTAS ADICIONAIS

Se algo falhar:
1. Verifique console (F12)
2. Verifique se está logado
3. Verifique cache (hard refresh)
4. Verifique se está em `/assistant` (URL correta)
5. Aguarde Vercel completar deploy (3-5 min)

---

**Próxima ação:** Executar este checklist após hard refresh do painel 🎉
