@echo off
title Taskmanager
cd /d "C:\Users\schro\source\repos\Projekt Manager"
echo Beende laufende Instanzen...
taskkill /f /im node.exe > nul 2>&1
timeout /t 1 /nobreak > nul
start "" /b cmd /c "timeout /t 8 /nobreak > nul & start http://localhost:5173"
npm run dev