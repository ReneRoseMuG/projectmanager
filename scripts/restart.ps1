# scripts/restart.ps1 - Projekt Manager kontrolliert neu starten
param(
    [string]$DeployDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"
$stopPs1 = "$DeployDir\Stop.ps1"
$startPs1 = "$DeployDir\Start.ps1"

if (-not (Test-Path $stopPs1)) {
    throw "Stop.ps1 nicht gefunden: $stopPs1"
}
if (-not (Test-Path $startPs1)) {
    throw "Start.ps1 nicht gefunden: $startPs1"
}

& $stopPs1

foreach ($port in @(3001, 5173, 3010)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port ist weiterhin belegt. Der Neustart wurde abgebrochen."
    }
}

& $startPs1
