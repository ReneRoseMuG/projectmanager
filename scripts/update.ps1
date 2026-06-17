# scripts/update.ps1 - Projekt Manager aktualisieren (sichtbares Terminal)
param(
    [string]$DeployDir = "$env:LOCALAPPDATA\Projekt Manager",
    [string]$RepoRoot  = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = "Stop"
$stopPs1   = "$DeployDir\Stop.ps1"
$startPs1  = "$DeployDir\Start.ps1"
$deployPs1 = "$RepoRoot\scripts\deploy.ps1"

# Transcript-Log: jede Zeile dieses Updates landet dauerhaft in einer Datei,
# damit ein Fehler auch dann nachlesbar bleibt, wenn das Fenster schließt.
$logDir  = "$DeployDir\runtime-logs"
$logFile = $null
try {
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $logFile = Join-Path $logDir ("update-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
    Start-Transcript -Path $logFile -Force | Out-Null
} catch {
    Write-Host "  Hinweis: Transcript-Log konnte nicht gestartet werden: $($_.Exception.Message)" -ForegroundColor DarkYellow
}

try {

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "   Projekt Manager Update      " -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Schritt 1: Stoppen
Write-Host "[1/3] Dienste werden gestoppt..." -ForegroundColor Yellow
if (Test-Path $stopPs1) {
    & $stopPs1
} else {
    Write-Host "  Stop.ps1 nicht gefunden, wird übersprungen." -ForegroundColor Gray
}

# Schritt 2: Deploy
Write-Host ""
Write-Host "[2/3] Deployment wird ausgeführt..." -ForegroundColor Yellow
Write-Host ""
& $deployPs1 -Target $DeployDir
if ($LASTEXITCODE -ne 0) {
    throw "Deployment fehlgeschlagen (Exit-Code $LASTEXITCODE)."
}

# Schritt 3: Starten
Write-Host ""
Write-Host "[3/3] Dienste werden gestartet..." -ForegroundColor Yellow
if (Test-Path $startPs1) {
    & $startPs1
    Write-Host "  Dienste gestartet." -ForegroundColor Gray
} else {
    Write-Host "  Start.ps1 nicht gefunden." -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Green
Write-Host "   Update abgeschlossen!       " -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "===============================" -ForegroundColor Red
    Write-Host "   UPDATE FEHLGESCHLAGEN       " -ForegroundColor Red
    Write-Host "===============================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
        Write-Host ""
        Write-Host $_.InvocationInfo.PositionMessage -ForegroundColor DarkGray
    }
    if ($_.ScriptStackTrace) {
        Write-Host ""
        Write-Host "Aufruf-Stack:" -ForegroundColor DarkGray
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    }
    if ($logFile) {
        Write-Host ""
        Write-Host "Vollständiges Protokoll: $logFile" -ForegroundColor Yellow
    }
}
finally {
    try { Stop-Transcript | Out-Null } catch { }
    Write-Host ""
    Read-Host "Fenster schließen? [Enter drücken]"
}

