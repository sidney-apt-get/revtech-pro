@echo off
cd /d "C:\RevTech\revtech-new"
echo === Git Status ===
git status
echo.
echo === Adicionando alteracoes ===
git add -A
echo.
echo === Commit ===
git commit -m "fix: remove Assistente tab from sidebar, clean up orphan locale keys"
echo.
echo === Push para GitHub ===
git push origin master
echo.
echo === Deploy Vercel ===
vercel --prod --yes
echo.
echo === CONCLUIDO ===
pause
