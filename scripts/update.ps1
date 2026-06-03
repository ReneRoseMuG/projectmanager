# scripts/update.ps1 - Projekt Manager aktualisieren (sichtbares Terminal)
param(
    [string]$DeployDir = "$env:LOCALAPPDATA\Projekt Manager",
    [string]$RepoRoot  = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = "Stop"
$stopPs1   = "$DeployDir\Stop.ps1"
$startPs1  = "$DeployDir\Start.ps1"
$deployPs1 = "$RepoRoot\scripts\deploy.ps1"

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
    Write-Host ""
    Write-Host "FEHLER: Deployment fehlgeschlagen (Exit $LASTEXITCODE)." -ForegroundColor Red
    Write-Host ""
    Read-Host "Fenster schließen? [Enter drücken]"
    exit 1
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
Read-Host "Fenster schließen? [Enter drücken]"

