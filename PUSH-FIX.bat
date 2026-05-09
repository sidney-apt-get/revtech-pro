@echo off
setlocal enabledelayedexpansion
cd /d "C:\RevTech\revtech-new"

echo.
echo ====================================
echo   PUSH DA CORRECAO DEFINITIVA
echo   Commit: fix Assistente removal completo
echo ====================================
echo.

set GIT_PATH=C:\Program Files\Git\bin\git.exe
if not exist "!GIT_PATH!" set GIT_PATH=git

echo [1/3] Estado atual do repositorio:
"!GIT_PATH!" log --oneline -3
echo.

echo [2/3] Remote configurado:
"!GIT_PATH!" remote -v
echo.

echo [3/3] Enviando para GitHub...
echo.
"!GIT_PATH!" push origin master
set PUSH_RESULT=%errorlevel%

echo.
if %PUSH_RESULT%==0 (
    echo ====================================
    echo   SUCESSO!
    echo ====================================
    echo.
    echo Commits enviados para GitHub.
    echo Vercel ira detectar e iniciar o build automaticamente.
    echo.
    echo Aguarde 2-5 minutos e verifique:
    echo   https://revtech-new.vercel.app/dashboard
    echo.
    echo O menu nao deve mais conter "Assistente".
) else (
    echo ====================================
    echo   ERRO: Push falhou
    echo ====================================
    echo.
    echo Verifique:
    echo  1. Conexao com a Internet
    echo  2. Chave SSH configurada no GitHub
    echo  3. Permissoes do repositorio
)

echo.
pause
