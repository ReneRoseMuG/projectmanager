@echo off
chcp 65001 > nul
setlocal
title Projekt Manager

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
set "APP_DIR=%CD%"
set "API_DIR=%APP_DIR%\apps\api"
set "DATABASE_PATH=%API_DIR%\data\taskmanager.sqlite"
set "UPLOAD_DIR=%API_DIR%\uploads"
set "PREVIEW_CACHE_DIR=%API_DIR%\previews"
set "CONTENT_DIR=%API_DIR%\content"
set "BACKUP_WORK_DIR=%API_DIR%\backups"
set "PORT=3001"
set "CORS_ORIGIN=http://localhost:5173"
set "VITE_API_URL=http://localhost:3001/api"
set "NODE_ENV=production"
set "TASKMANAGER_TEST_MODE="
set "AUTH_BYPASS_ADMIN=true"

echo Starte Projekt Manager im lokalen Produktionsmodus.
echo Projektordner: %APP_DIR%
echo Geschützte Datenbank: %DATABASE_PATH%
echo Stoppe laufende Projekt Manager-Ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3001,5173,3010 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak > nul

echo Baue Production-Bundle...
call npm run build
if errorlevel 1 (
  echo Build fehlgeschlagen.
  pause
  exit /b 1
)

echo Aktualisiere Datenbankschema ohne Datenlöschung...
call npm run db:migrate
if errorlevel 1 (
  echo Datenbankmigration fehlgeschlagen.
  pause
  exit /b 1
)

echo Starte API und Web im selben Terminal...
start "" /B powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:5173'"

echo Projekt Manager läuft unter http://localhost:5173
echo Dieses Fenster offen lassen; Strg+C beendet API, Web, MCP und Tunnel.
call node apps\mcp-server\dist\start-project-manager.js --production

echo Projekt Manager wurde beendet.
pause
