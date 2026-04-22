#!/bin/bash
# RevTech PRO v2 - Deploy para Vercel
# Executa este script: bash deploy.sh

set -e

echo "=== RevTech PRO v2 - Deploy ==="
echo ""

# 1. Build
echo "[1/4] A construir o projecto..."
npm run build
echo "Build concluído!"

# 2. GitHub
echo ""
echo "[2/4] A fazer push para GitHub..."
export PATH="$PATH:/c/Program Files/GitHub CLI"
gh repo create sidney-apt-get/revtech-pro --public --source=. --push 2>/dev/null || git push -u origin main
echo "GitHub: OK"

# 3. Vercel deploy
echo ""
echo "[3/4] A fazer deploy no Vercel..."
vercel --prod --yes

# 4. Variáveis de ambiente
echo ""
echo "[4/4] A definir variáveis de ambiente..."
vercel env add VITE_SUPABASE_URL production <<< "https://yurtqojjrwlnxpvykvti.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cnRxb2pqcndsbnhwdnlrdnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTI5NjEsImV4cCI6MjA5MjQyODk2MX0.yzD2zR7XQLXu9FXAXTkkpZaQdjWcL4LWGtg0CJ2b_hY"
vercel env add VITE_GOOGLE_CLIENT_ID production <<< "1069162624520-mfsoohl6ropun65ermpoq9qmqsnonols.apps.googleusercontent.com"

echo ""
echo "=== Deploy concluído! ==="
vercel --prod --yes
