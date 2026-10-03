@echo off
title Asymmetric War - Lancement...
cd /d "%~dp0"

REM --- garde-fou de port (voir PORTS.md a la racine) ---
call "%~dp0..\_tools\portguard.bat" 8083 "Asymmetric War"
if errorlevel 1 (
  echo  Demarrage annule. Lis le message ci-dessus.
  pause
  exit /b 1
)


echo.
echo  ====================================
echo    ASYMMETRIC WAR - Demarrage...
echo  ====================================
echo.
echo  Lancement du serveur de jeu...
echo  Le navigateur va s'ouvrir automatiquement.
echo  Fermez cette fenetre pour arreter le jeu.
echo.

:: Ouvre le navigateur apres 3 secondes
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8083"

:: Lance le serveur Vite
npx vite

pause
