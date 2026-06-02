# scripts/deploy.ps1
# Baut den Projekt Manager und kopiert ihn in das Deployment-Verzeichnis.
# Standardziel: %APPDATA%\Projekt Manager
#
# Verwendung:
#   .\scripts\deploy.ps1
#   .\scripts\deploy.ps1 -Target "C:\MeinPfad\Projekt Manager"

param(
    [string]$Target = "$env:APPDATA\Projekt Manager"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "   Projekt Manager Deployment  " -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Quelle : $repoRoot"
Write-Host "  Ziel   : $Target"
Write-Host ""

# --- Voraussetzungen pruefen ---

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "node.exe nicht gefunden. Bitte Node.js installieren (https://nodejs.org)."
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm nicht gefunden. Bitte Node.js installieren (https://nodejs.org)."
    exit 1
}

# --- Schritt 1: Build ---

Write-Host "[1/5] Projekt wird kompiliert..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build fehlgeschlagen (Exit code: $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# --- Schritt 2: Zielstruktur anlegen ---

Write-Host "[2/5] Zielverzeichnisse werden angelegt..." -ForegroundColor Yellow

$subdirs = @(
    "apps\api\dist",
    "apps\web\dist",
    "apps\mcp-server\dist",
    "packages\shared-types\dist"
)
foreach ($sub in $subdirs) {
    New-Item -ItemType Directory -Force -Path "$Target\$sub" | Out-Null
}

# --- Hilfsfunktion: Verzeichnis spiegeln mit robocopy ---

function Sync-Dir([string]$From, [string]$To) {
    if (-not (Test-Path $From)) {
        Write-Warning "Quellordner nicht gefunden, wird uebersprungen: $From"
        return
    }
    # robocopy gibt 0-7 bei Erfolg zurueck, 8+ bei Fehler
    robocopy $From $To /MIR /NJH /NJS /NFL /NDL /NP 2>&1 | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy fehlgeschlagen (Exit code: $LASTEXITCODE) beim Kopieren von '$From' nach '$To'"
    }
}

# --- Schritt 3: Dateien synchronisieren ---

Write-Host "[3/5] Dateien werden synchronisiert..." -ForegroundColor Yellow

# Root-Workspace-Dateien
Copy-Item -Force "$repoRoot\package.json"      "$Target\package.json"
Copy-Item -Force "$repoRoot\package-lock.json" "$Target\package-lock.json"
if (Test-Path "$repoRoot\tsconfig.base.json") {
    Copy-Item -Force "$repoRoot\tsconfig.base.json" "$Target\tsconfig.base.json"
}

# API: kompiliertes dist + package.json
Sync-Dir "$repoRoot\apps\api\dist"         "$Target\apps\api\dist"
Copy-Item -Force "$repoRoot\apps\api\package.json" "$Target\apps\api\package.json"

# Web: vite-Build (statische Dateien) + package.json
Sync-Dir "$repoRoot\apps\web\dist"         "$Target\apps\web\dist"
Copy-Item -Force "$repoRoot\apps\web\package.json" "$Target\apps\web\package.json"

# MCP-Server: kompiliertes dist + package.json
Sync-Dir "$repoRoot\apps\mcp-server\dist"  "$Target\apps\mcp-server\dist"
Copy-Item -Force "$repoRoot\apps\mcp-server\package.json" "$Target\apps\mcp-server\package.json"

# Shared Types: kompiliertes dist + package.json
Sync-Dir "$repoRoot\packages\shared-types\dist" "$Target\packages\shared-types\dist"
Copy-Item -Force "$repoRoot\packages\shared-types\package.json" "$Target\packages\shared-types\package.json"

# --- Schritt 4: Produktions-Abhaengigkeiten installieren ---

Write-Host "[4/5] Node-Abhaengigkeiten werden installiert (nur Produktion)..." -ForegroundColor Yellow
Push-Location $Target
try {
    npm ci --omit=dev
    if ($LASTEXITCODE -ne 0) { throw "npm ci fehlgeschlagen (Exit code: $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# --- Schritt 5: .env und Startscript einrichten ---

Write-Host "[5/5] Konfiguration und Startscript werden eingerichtet..." -ForegroundColor Yellow

# .env fuer die API: nur anlegen wenn noch nicht vorhanden
$envTarget = "$Target\apps\api\.env"
if (-not (Test-Path $envTarget)) {
    if (Test-Path "$repoRoot\apps\api\.env") {
        Copy-Item "$repoRoot\apps\api\.env" $envTarget
        Write-Host "  .env aus Quell-Repo kopiert." -ForegroundColor Gray
    } elseif (Test-Path "$repoRoot\apps\api\.env.example") {
        Copy-Item "$repoRoot\apps\api\.env.example" $envTarget
        Write-Host "  .env.example als .env kopiert. Bitte Konfiguration pruefen!" -ForegroundColor Magenta
    }
} else {
    Write-Host "  .env bereits vorhanden, wird nicht ueberschrieben." -ForegroundColor Gray
}

# Startscript erstellen
$batPath = "$Target\Projekt Manager.bat"
$batContent = @'
@echo off
setlocal
cd /d "%~dp0"

echo.
echo  ================================
echo   Projekt Manager wird gestartet
echo  ================================
echo.
echo  API  -^>  http://localhost:3001
echo  Web  -^>  http://localhost:5173
echo.
echo  Fenster schliessen beendet alle Dienste.
echo  -----------------------------------------
echo.

:: Beide Dienste im Hintergrund dieses Fensters starten (/B = kein neues Fenster)
:: /D setzt das Arbeitsverzeichnis, damit dotenv die .env-Datei findet
start /B /D "%~dp0apps\api" node dist\index.js
start /B /D "%~dp0" npx --yes serve@14 apps\web\dist -l 5173 -s

:: Warten bis Server bereit, dann Browser oeffnen
timeout /t 5 /nobreak > nul
start "" "http://localhost:5173"

:: Fenster offen halten – Ausgabe beider Dienste erscheint hier
pause > nul
'@

Set-Content -Path $batPath -Value $batContent -Encoding ASCII

$shell = New-Object -ComObject WScript.Shell

# Desktop-Verknuepfung anlegen / aktualisieren
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = "$desktopPath\Projekt Manager.lnk"
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath      = $batPath
$shortcut.WorkingDirectory = $Target
$shortcut.WindowStyle     = 1
$shortcut.Description     = "Projekt Manager starten"
$shortcut.Save()
Write-Host "  Desktop-Verknuepfung : $shortcutPath" -ForegroundColor Gray

# Autostart-Verknuepfung anlegen / aktualisieren
$startupDir  = [Environment]::GetFolderPath('Startup')
$startupPath = "$startupDir\Projekt Manager.lnk"
$shortcut2 = $shell.CreateShortcut($startupPath)
$shortcut2.TargetPath      = $batPath
$shortcut2.WorkingDirectory = $Target
$shortcut2.WindowStyle     = 1
$shortcut2.Description     = "Projekt Manager starten"
$shortcut2.Save()
Write-Host "  Autostart-Verknuepfung: $startupPath" -ForegroundColor Gray

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "   Deployment abgeschlossen!    " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Startscript            : $batPath"
Write-Host "  Desktop-Verknuepfung  : $shortcutPath"
Write-Host "  Autostart-Verknuepfung: $startupPath"
Write-Host ""
