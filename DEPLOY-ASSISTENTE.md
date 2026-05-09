# 🚀 Deploy do Agente Técnico de Bancada

## Status: Código Pronto para Deploy ✅

O arquivo `src/pages/Assistant.tsx` foi completamente refatorado com:
- ✅ Diagnóstico integrado com Gemini Pro Vision
- ✅ Geração automática de guia de reparo
- ✅ Workflow completo dentro do painel (sem deixar RevTech)
- ✅ Interface responsiva em português (Brasil)

---

## 📋 Passos para Deploy

### **Opção 1: Script Automático (Recomendado)**

Abra PowerShell na pasta `C:\RevTech\revtech-new` e execute:

```powershell
# Primeiro, configure o token Vercel como variável de ambiente
$env:VERCEL_TOKEN = "vcp_33QJee9t0QnU06QeJajTyRYADG1iEE1W6HRePd8D1KUnzrQpF71ffzC5"

# Depois execute o script de deploy
.\deploy-assistente.ps1
```

Este script fará automaticamente:
1. ✅ Criar `.env.local` com chave Gemini
2. ✅ Fazer commit do `Assistant.tsx`
3. ✅ Fazer push para GitHub
4. ✅ Configurar variáveis no Vercel
5. ✅ Fazer deploy em produção

---

### **Opção 2: Passos Manuais**

#### **Passo 1: Configurar .env.local**
```bash
# Criar arquivo .env.local na raiz do projeto
echo 'VITE_GEMINI_API_KEY=AIzaSyDmeYxWC4F7VulP6F9hy2pgWix-f_yqb2I' > .env.local
```

#### **Passo 2: Fazer Commit**
```bash
cd C:\RevTech\revtech-new
git add src/pages/Assistant.tsx
git commit -m "feat: agente técnico de bancada com diagnóstico e guia de reparo com Gemini"
git push origin master
```

#### **Passo 3: Configurar no Vercel**
```bash
# Adicionar variável de ambiente no Vercel
npx vercel env add VITE_GEMINI_API_KEY
# Cole a chave: AIzaSyDmeYxWC4F7VulP6F9hy2pgWix-f_yqb2I
# Selecione: production
```

#### **Passo 4: Deploy**
```bash
npx vercel --prod --token vcp_33QJee9t0QnU06QeJajTyRYADG1iEE1W6HRePd8D1KUnzrQpF71ffzC5
```

---

## 🔐 Variáveis de Ambiente

**Gemini API Key:**
```
AIzaSyDmeYxWC4F7VulP6F9hy2pgWix-f_yqb2I
```

**Vercel Token:**
```
vcp_33QJee9t0QnU06QeJajTyRYADG1iEE1W6HRePd8D1KUnzrQpF71ffzC5
```

---

## 🎯 O que foi Refatorado

### **Home Screen**
- Apresentação do Agente Técnico de Bancada
- 2 ferramentas integradas (Diagnosticar + Guia de Reparo)
- Tutorial em 4 passos

### **Diagnosticar**
- Upload de foto (câmera ou galeria)
- Compressão automática da imagem
- Análise com Gemini Pro Vision
- Exibe: marca, modelo, ano, categoria, condição, danos visíveis, defeito sugerido

### **Guia de Reparo**
- Geração automática baseada no diagnóstico
- Prompt otimizado em português
- Retorna:
  - Diagnóstico confirmado
  - Pré-requisitos (ferramentas/peças)
  - Passos detalhados
  - Verificação final
  - Estimativa de lucro

### **Funcionalidades Extras**
- ✅ Copiar/Compartilhar guia
- ✅ Voltar e refazer diagnóstico
- ✅ Tratamento de erros com mensagens amigáveis
- ✅ Interface responsiva (mobile + desktop)
- ✅ Dark mode suportado

---

## ✨ Próximos Passos Após Deploy

1. **Testar no painel:** Vá para aba "Assistente"
2. **Fazer diagnóstico:** Tire uma foto de um equipamento
3. **Gerar guia:** Clique em "Gerar Guia de Reparo"
4. **Compartilhar:** Copie/compartilhe o resultado com a equipe

---

## 📞 Suporte

Se encontrar problemas:

1. **Vercel deployment não funciona?**
   - Verifique se `VITE_GEMINI_API_KEY` está em Production
   - Verifique se o commit foi feito corretamente

2. **Imagem não analisa?**
   - Certifique-se que a chave Gemini está configurada
   - Tente com uma imagem mais clara
   - Verifique os logs do Vercel

3. **Erro "404 Assistente"?**
   - Faça um hard refresh: `Ctrl+Shift+R`
   - Limpe cache: dev tools > Network > Desabilite cache > Refresh

---

**Status:** Pronto para produção ✅
**Arquivo Principal:** `src/pages/Assistant.tsx`
**Ambiente:** Production Vercel
**Chave Gemini:** Configurada ✅
