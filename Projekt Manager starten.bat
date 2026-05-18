@echo off
title Taskmanager

set "SCRIPT_DIR=%~dp0"
set "OFFICE_DIR=C:\Users\r.rose\repos\Projekt Manager"
set "HOME_DIR=C:\Users\schro\source\repos\Projekt Manager"
set "APP_DIR="

if exist "%SCRIPT_DIR%package.json" set "APP_DIR=%SCRIPT_DIR%"
if not defined APP_DIR if exist "%OFFICE_DIR%\package.json" set "APP_DIR=%OFFICE_DIR%"
if not defined APP_DIR if exist "%HOME_DIR%\package.json" set "APP_DIR=%HOME_DIR%"

if not defined APP_DIR (
  echo Projekt Manager wurde in keinem bekannten Pfad gefunden.
  pause
  exit /b 1
)

cd /d "%APP_DIR%"
echo Starte Taskmanager aus: %CD%
echo Beende laufende Instanzen...
taskkill /f /im node.exe > nul 2>&1
timeout /t 1 /nobreak > nul
start "" /b cmd /c "timeout /t 8 /nobreak > nul & start http://localhost:5173"
npm run dev
