@echo off
setlocal enabledelayedexpansion

cd /d "C:\RevTech\revtech-new"

echo.
echo ====================================
echo   GIT PUSH VIA SSH
echo ====================================
echo.

REM Set git path
set GIT_PATH=C:\Program Files\Git\bin\git.exe

REM Configure SSH remote
echo [1/4] Configurando remote para SSH...
"!GIT_PATH!" remote set-url origin git@github.com:sidney-apt-get/revtech-pro.git

REM Show remote
echo [2/4] Remote:
"!GIT_PATH!" remote -v

REM Show commits to push
echo.
echo [3/4] Commits a enviar:
"!GIT_PATH!" log --oneline -2

REM Attempt push
echo.
echo [4/4] Enviando commits para GitHub (via SSH)...
echo.
"!GIT_PATH!" push -v origin master

if errorlevel 1 (
    echo.
    echo ====================================
    echo   ERRO: Push falhou
    echo ====================================
    echo.
    echo Possíveis causas:
    echo - Sem chaves SSH configuradas no GitHub
    echo - Permissoes de arquivo incorretas
    echo.
    echo Solucao:
    echo 1. Abra SSH settings em GitHub
    echo 2. Verifique se a chave SSH esta configurada
    echo 3. Tente novamente
    echo.
    pause
    exit /b 1
)

echo.
echo ====================================
echo   SUCESSO!
echo ====================================
echo.
echo Commits enviados para GitHub com sucesso!
echo Vercel iniciara a implantacao em 2-5 minutos.
echo.
echo Visite: https://revtech-new.vercel.app/assistant
echo Para verificar as mudancas em producao.
echo.
pause
