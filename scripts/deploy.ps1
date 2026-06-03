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

# Zertifikate (benoetigt fuer SSL-Datenbankverbindung)
Sync-Dir "$repoRoot\docs\Zertifikate" "$Target\docs\Zertifikate"

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

# Start.ps1 erzeugen (startet Dienste ohne sichtbares Terminal)
$startPs1Path = "$Target\Start.ps1"
$startPs1Content = @'
# Start.ps1 - Projekt Manager starten (kein Terminal-Fenster)
$root = $PSScriptRoot
$pidFile = "$root\pm-pids.txt"

$api = Start-Process -FilePath "node" `
    -ArgumentList "dist\index.js" `
    -WorkingDirectory "$root\apps\api" `
    -WindowStyle Hidden `
    -PassThru

$web = Start-Process -FilePath "npx.cmd" `
    -ArgumentList "--yes", "serve@14", "apps\web\dist", "-l", "5173", "-s" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

"$($api.Id) $($web.Id)" | Set-Content $pidFile -Encoding UTF8

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
'@
Set-Content -Path $startPs1Path -Value $startPs1Content -Encoding UTF8

# Stop.ps1 erzeugen
$stopPs1Path = "$Target\Stop.ps1"
$stopPs1Content = @'
# Stop.ps1 - Projekt Manager beenden
$root = $PSScriptRoot
$pidFile = "$root\pm-pids.txt"

$targetPids = [System.Collections.Generic.HashSet[int]]::new()

# Schritt 1: gespeicherte PIDs aus pm-pids.txt
if (Test-Path $pidFile) {
    (Get-Content $pidFile -Raw).Trim() -split '\s+' |
        Where-Object { $_ -match '^\d+$' } |
        ForEach-Object { [void]$targetPids.Add([int]$_) }
}

# Schritt 2: Fallback - Prozesse die auf Port 3001 (API) oder 5173 (Web) lauschen
foreach ($port in @(3001, 5173)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) { [void]$targetPids.Add([int]$conn.OwningProcess) }
}

if ($targetPids.Count -eq 0) {
    Write-Host "Keine laufenden Projekt-Manager-Prozesse gefunden." -ForegroundColor Yellow
    if (Test-Path $pidFile) { Remove-Item $pidFile -Force }
    exit 0
}

foreach ($p in $targetPids) {
    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
    if ($proc) {
        Stop-Process -Id $p -Force
        Write-Host "Prozess $p ($($proc.Name)) beendet." -ForegroundColor Green
    }
}

if (Test-Path $pidFile) { Remove-Item $pidFile -Force }
Write-Host "Projekt Manager gestoppt." -ForegroundColor Green
'@
Set-Content -Path $stopPs1Path -Value $stopPs1Content -Encoding UTF8

$psExe      = (Get-Command powershell.exe).Source
$toolbarPs1 = "$repoRoot\scripts\toolbar.ps1"
$shell = New-Object -ComObject WScript.Shell

# Alte Eintraege bereinigen (bat-basierte Shortcuts, veraltete Start.ps1-Shortcuts)
$desktopPath = [Environment]::GetFolderPath('Desktop')
$startupDir  = [Environment]::GetFolderPath('Startup')
@(
    "$desktopPath\Projekt Manager.lnk",
    "$desktopPath\Projekt Manager.bat",
    "$startupDir\Projekt Manager.lnk",
    "$startupDir\Projekt Manager.bat",
    "$Target\Projekt Manager.bat"
) | Where-Object { Test-Path $_ } | ForEach-Object {
    Remove-Item $_ -Force
    Write-Host "  Alten Eintrag entfernt: $_" -ForegroundColor Gray
}

# Desktop-Verknuepfung → Tray-Toolbar (silent via powershell.exe)
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = "$desktopPath\Projekt Manager.lnk"
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath       = $psExe
$shortcut.Arguments        = "-WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File `"$toolbarPs1`""
$shortcut.WorkingDirectory = $repoRoot
$shortcut.WindowStyle      = 7
$shortcut.Description      = "Projekt Manager Toolbar"
$shortcut.Save()
Write-Host "  Desktop-Verknuepfung : $shortcutPath" -ForegroundColor Gray

# Autostart-Verknuepfung → Tray-Toolbar
$startupDir  = [Environment]::GetFolderPath('Startup')
$startupPath = "$startupDir\Projekt Manager.lnk"
$shortcut2 = $shell.CreateShortcut($startupPath)
$shortcut2.TargetPath       = $psExe
$shortcut2.Arguments        = "-WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File `"$toolbarPs1`""
$shortcut2.WorkingDirectory = $repoRoot
$shortcut2.WindowStyle      = 7
$shortcut2.Description      = "Projekt Manager Toolbar"
$shortcut2.Save()
Write-Host "  Autostart-Verknuepfung: $startupPath" -ForegroundColor Gray

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "   Deployment abgeschlossen!    " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Toolbar  : $toolbarPs1"
Write-Host "  Start    : $startPs1Path"
Write-Host "  Stop     : $stopPs1Path"
Write-Host "  Desktop  : $shortcutPath"
Write-Host "  Autostart: $startupPath"
Write-Host ""
