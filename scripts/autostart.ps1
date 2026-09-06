# scripts/autostart.ps1 - Projekt Manager beim Windows-Start hochfahren
#
# Wird von der Toolbar aufgerufen, wenn diese mit -AutoStart startet. Läuft in
# einem eigenen Hintergrundprozess, damit das Tray-Symbol sofort erscheint.
# Ein zweiter Versuch fängt den Fall ab, dass beim Anmelden Netzwerk oder
# VPN noch nicht bereit sind und die API deshalb nicht hochkommt.
param(
    [string]$DeployDir = "$env:LOCALAPPDATA\Projekt Manager",
    [int]$Attempts = 2,
    [int]$RetryDelaySeconds = 20
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$startPs1 = "$DeployDir\Start.ps1"
$logDir = "$DeployDir\runtime-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = "$logDir\autostart.log"

function Write-AutoStartLog([string]$Message) {
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) $Message" -Encoding UTF8
}

function Test-ApiReady {
    $client = [System.Net.Http.HttpClient]::new()
    $response = $null
    try {
        $client.Timeout = [TimeSpan]::FromSeconds(2)
        $response = $client.GetAsync("http://127.0.0.1:3001/api/health").GetAwaiter().GetResult()
        return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400
    } catch {
        return $false
    } finally {
        if ($response) { $response.Dispose() }
        $client.Dispose()
    }
}

if (-not (Test-Path $startPs1)) {
    Write-AutoStartLog "Abbruch: Start.ps1 nicht gefunden ($startPs1). Bitte deploy.ps1 ausführen."
    exit 1
}

if (Test-ApiReady) {
    Write-AutoStartLog "Übersprungen: Projekt Manager läuft bereits."
    exit 0
}

for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    Write-AutoStartLog "Versuch $attempt von $Attempts : Dienste werden gestartet."
    try {
        & $startPs1 -NoBrowser
    } catch {
        Write-AutoStartLog "Versuch $attempt fehlgeschlagen: $($_.Exception.Message)"
    }

    if (Test-ApiReady) {
        Write-AutoStartLog "Versuch $attempt erfolgreich: Projekt Manager läuft."
        exit 0
    }

    if ($attempt -lt $Attempts) {
        Write-AutoStartLog "Warte $RetryDelaySeconds Sekunden vor dem nächsten Versuch."
        Start-Sleep -Seconds $RetryDelaySeconds
    }
}

Write-AutoStartLog "Autostart fehlgeschlagen nach $Attempts Versuchen. Details siehe api.err.log und start.log."
exit 1
