# scripts/deploy.ps1
# Baut den Projekt Manager und kopiert ihn in das Deployment-Verzeichnis.
# Standardziel: %LOCALAPPDATA%\Projekt Manager
#
# Verwendung:
#   .\scripts\deploy.ps1
#   .\scripts\deploy.ps1 -Target "C:\MeinPfad\Projekt Manager"

param(
    [string]$Target = "$env:LOCALAPPDATA\Projekt Manager"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$Target = [System.IO.Path]::GetFullPath($Target)

function Invoke-CheckedCommand([scriptblock]$Command, [string]$FailureMessage) {
    # 2>&1 | Out-Default: stderr in stdout mergen, damit NativeCommandError bei
    # $ErrorActionPreference=Stop nicht faelschlicherweise den Lauf abbricht.
    & $Command 2>&1 | Out-Default
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage (Exit code: $LASTEXITCODE)"
    }
}

function Sync-Dir([string]$From, [string]$To) {
    if (-not (Test-Path $From)) {
        Write-Warning "Quellordner nicht gefunden, wird übersprungen: $From"
        return
    }

    New-Item -ItemType Directory -Force -Path $To | Out-Null
    robocopy $From $To /MIR /NJH /NJS /NFL /NDL /NP 2>&1 | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy fehlgeschlagen (Exit code: $LASTEXITCODE) beim Kopieren von '$From' nach '$To'"
    }
}

function Copy-File([string]$From, [string]$To) {
    if (-not (Test-Path $From)) {
        Write-Warning "Quelldatei nicht gefunden, wird übersprungen: $From"
        return
    }

    New-Item -ItemType Directory -Force -Path (Split-Path $To -Parent) | Out-Null
    Copy-Item -Force -Path $From -Destination $To
}

function Write-RuntimePackageJson([string]$Path) {
    $apiPackage = Get-Content -Path "$repoRoot\apps\api\package.json" -Raw | ConvertFrom-Json
    $mcpPackage = Get-Content -Path "$repoRoot\apps\mcp-server\package.json" -Raw | ConvertFrom-Json
    $dependencies = [ordered]@{}

    foreach ($dependencySource in @($apiPackage.dependencies, $mcpPackage.dependencies)) {
        foreach ($dependency in $dependencySource.PSObject.Properties) {
            $dependencies[$dependency.Name] = $dependency.Value
        }
    }

    $dependencies["@taskmanager/shared-types"] = "file:packages/shared-types"

    $runtimePackage = [ordered]@{
        name = "projekt-manager-runtime"
        version = "0.1.0"
        private = $true
        type = "module"
        dependencies = $dependencies
    }

    $runtimePackage | ConvertTo-Json -Depth 10 | Set-Content -Path $Path -Encoding UTF8
}

function Stop-ExistingToolbar([string]$ToolbarPath) {
    $escapedToolbarPath = [WildcardPattern]::Escape($ToolbarPath)
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" |
        Where-Object { $_.CommandLine -like "*$escapedToolbarPath*" -or $_.CommandLine -like "*toolbar.ps1*" } |
        ForEach-Object {
            try {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
                Write-Host "  Laufende Toolbar beendet: Prozess $($_.ProcessId)" -ForegroundColor Gray
            } catch {
                Write-Warning "Toolbar-Prozess $($_.ProcessId) konnte nicht beendet werden: $($_.Exception.Message)"
            }
        }
}

function Read-EnvLocal([string]$Path) {
    $result = @{}
    if (-not (Test-Path $Path)) { return $result }
    foreach ($rawLine in Get-Content $Path -Encoding UTF8) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#")) { continue }
        $idx = $line.IndexOf("=")
        if ($idx -le 0) { continue }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if ($val.Length -ge 2 -and (($val[0] -eq '"' -and $val[-1] -eq '"') -or ($val[0] -eq "'" -and $val[-1] -eq "'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        $result[$key] = $val
    }
    return $result
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "   Projekt Manager Deployment  " -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Quelle : $repoRoot"
Write-Host "  Ziel   : $Target"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "node.exe nicht gefunden. Bitte Node.js installieren (https://nodejs.org)."
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm nicht gefunden. Bitte Node.js installieren (https://nodejs.org)."
    exit 1
}

Write-Host "[1/7] Projekt wird kompiliert..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    Invoke-CheckedCommand { npm run build } "Build fehlgeschlagen"
    Invoke-CheckedCommand { node apps/api/scripts/copy-migrations-to-dist.mjs } "Migrationen konnten nicht nach dist kopiert werden"
} finally {
    Pop-Location
}

Write-Host "[2/7] Runtime-Zielstruktur wird vorbereitet..." -ForegroundColor Yellow

$subdirs = @(
    "apps\api\dist",
    "apps\api\uploads",
    "apps\api\previews",
    "apps\api\content",
    "apps\web\dist",
    "apps\mcp-server\dist",
    "packages\shared-types\dist",
    "docs\Zertifikate",
    "runtime-logs",
    "scripts"
)
foreach ($sub in $subdirs) {
    New-Item -ItemType Directory -Force -Path "$Target\$sub" | Out-Null
}

Write-RuntimePackageJson "$Target\package.json"

Write-Host "[3/7] Dateien werden synchronisiert..." -ForegroundColor Yellow

Sync-Dir "$repoRoot\apps\api\dist" "$Target\apps\api\dist"
Sync-Dir "$repoRoot\apps\web\dist" "$Target\apps\web\dist"
Sync-Dir "$repoRoot\apps\mcp-server\dist" "$Target\apps\mcp-server\dist"
Sync-Dir "$repoRoot\packages\shared-types\dist" "$Target\packages\shared-types\dist"
Sync-Dir "$repoRoot\docs\Zertifikate" "$Target\docs\Zertifikate"

Copy-File "$repoRoot\packages\shared-types\package.json" "$Target\packages\shared-types\package.json"
Copy-File "$repoRoot\scripts\serve-static.mjs" "$Target\scripts\serve-static.mjs"
if (Test-Path "$repoRoot\tsconfig.base.json") {
    Copy-File "$repoRoot\tsconfig.base.json" "$Target\tsconfig.base.json"
}

$envTarget = "$Target\apps\api\.env"
if (-not (Test-Path $envTarget)) {
    if (Test-Path "$repoRoot\apps\api\.env") {
        Copy-File "$repoRoot\apps\api\.env" $envTarget
        Write-Host "  .env aus Quell-Repo kopiert." -ForegroundColor Gray
    } elseif (Test-Path "$repoRoot\apps\api\.env.example") {
        Copy-File "$repoRoot\apps\api\.env.example" $envTarget
        Write-Host "  .env.example als .env kopiert. Bitte Konfiguration prüfen!" -ForegroundColor Magenta
    } else {
        Write-Warning "Keine .env oder .env.example für die API gefunden."
    }
} else {
    Write-Host "  .env bereits vorhanden, wird nicht überschrieben." -ForegroundColor Gray
}

Write-Host "[4/7] Runtime-Abhängigkeiten werden installiert..." -ForegroundColor Yellow
Push-Location $Target
try {
    Invoke-CheckedCommand { npm install --omit=dev --no-audit --fund=false } "Runtime-Abhängigkeiten konnten nicht installiert werden"
    Invoke-CheckedCommand { npm prune --omit=dev --no-audit --fund=false } "Runtime-Abhängigkeiten konnten nicht bereinigt werden"
} finally {
    Pop-Location
}

Write-Host "[5/7] Datenbankmigration wird ausgeführt..." -ForegroundColor Yellow
Push-Location "$Target\apps\api"
try {
    Invoke-CheckedCommand { node dist\db\migrate.js } "Datenbankmigration fehlgeschlagen"
} finally {
    Pop-Location
}

Write-Host "[6/7] Start- und Stop-Scripts werden eingerichtet..." -ForegroundColor Yellow

$localEnv    = Read-EnvLocal "$repoRoot\.env.local"
$mcpApiKey   = if ($localEnv.ContainsKey("PROJECT_MANAGER_API_KEY")) { $localEnv["PROJECT_MANAGER_API_KEY"] } elseif ($localEnv.ContainsKey("API_KEY")) { $localEnv["API_KEY"] } else { "" }
$mcpAuthMode = if ($localEnv.ContainsKey("MCP_HTTP_AUTH_MODE")) { $localEnv["MCP_HTTP_AUTH_MODE"] } else { "none" }
$mcpPort     = if ($localEnv.ContainsKey("MCP_HTTP_PORT"))     { $localEnv["MCP_HTTP_PORT"] }     else { "3010" }
$mcpPath     = if ($localEnv.ContainsKey("MCP_HTTP_PATH"))     { $localEnv["MCP_HTTP_PATH"] }     else { "/mcp" }
$ngrokDomain = "motivator-sizably-rind.ngrok-free.dev"

$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrokCmd) {
    $ngrokExe = $ngrokCmd.Source
} else {
    $wingetNgrok = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
    if (Test-Path $wingetNgrok) { $ngrokExe = $wingetNgrok }
    else { throw "ngrok nicht gefunden. Bitte 'winget install ngrok.ngrok' ausfuehren." }
}
Write-Host "  ngrok : $ngrokExe" -ForegroundColor Gray
Write-Host "  domain: $ngrokDomain" -ForegroundColor Gray

$startPs1Path = "$Target\Start.ps1"
# Statischer Teil 1: Hilfsfunktionen und API/Web-Start
$startPs1Content = @'
# Start.ps1 - Projekt Manager starten
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http
$root = $PSScriptRoot
$pidFile = "$root\pm-pids.txt"
$logDir = "$root\runtime-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$startLog = "$logDir\start.log"

function Write-StartLog([string]$Message) {
    Add-Content -Path $startLog -Value "$(Get-Date -Format o) $Message" -Encoding UTF8
}

function Test-HttpReady([string]$Uri) {
    $client = [System.Net.Http.HttpClient]::new()
    $response = $null
    try {
        $client.Timeout = [TimeSpan]::FromSeconds(2)
        $response = $client.GetAsync($Uri).GetAwaiter().GetResult()
        return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400
    } catch {
        return $false
    } finally {
        if ($response) { $response.Dispose() }
        $client.Dispose()
    }
}

function Wait-HttpReady([string]$Name, [string]$Uri, [System.Diagnostics.Process]$Process) {
    for ($i = 0; $i -lt 30; $i++) {
        if (Test-HttpReady $Uri) {
            return
        }
        if ($Process.HasExited) {
            throw "$Name wurde beendet, bevor $Uri erreichbar war. Siehe runtime-logs."
        }
        Start-Sleep -Seconds 1
    }
    throw "$Name ist nicht erreichbar: $Uri. Siehe runtime-logs."
}

Write-StartLog "starting api"
$api = Start-Process -FilePath "node" `
    -ArgumentList "dist\index.js" `
    -WorkingDirectory "$root\apps\api" `
    -WindowStyle Hidden `
    -PassThru

Write-StartLog "starting web"
$web = Start-Process -FilePath "node" `
    -ArgumentList "scripts\serve-static.mjs", "apps\web\dist" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

'@

# Dynamischer Teil: MCP-Server und ngrok mit zur Deploy-Zeit aufgeloesten Werten
$startPs1Content += @"

# MCP-Server starten
`$env:PROJECT_MANAGER_API_KEY      = "$mcpApiKey"
`$env:PROJECT_MANAGER_API_BASE_URL = "http://localhost:3001/api"
`$env:MCP_HTTP_AUTH_MODE           = "$mcpAuthMode"
`$env:MCP_HTTP_HOST                = "127.0.0.1"
`$env:MCP_HTTP_PORT                = "$mcpPort"
`$env:MCP_HTTP_PATH                = "$mcpPath"
Write-StartLog "starting mcp"
`$mcp = Start-Process -FilePath "node" ``
    -ArgumentList "apps\mcp-server\dist\http.js" ``
    -WorkingDirectory `$root ``
    -WindowStyle Hidden ``
    -PassThru

# ngrok-Tunnel starten
Write-StartLog "starting ngrok"
`$tunnel = Start-Process -FilePath "$ngrokExe" ``
    -ArgumentList "http", "--domain=$ngrokDomain", "$mcpPort" ``
    -WindowStyle Hidden ``
    -PassThru

"@

# Statischer Teil 2: PID-Datei, Warten, Browser oeffnen
$startPs1Content += @'
"$($api.Id) $($web.Id) $($mcp.Id) $($tunnel.Id)" | Set-Content $pidFile -Encoding UTF8
Write-StartLog "pid file written: $($api.Id) $($web.Id) $($mcp.Id) $($tunnel.Id)"

Wait-HttpReady "API" "http://127.0.0.1:3001/api/health" $api
Write-StartLog "api ready"
Wait-HttpReady "Web" "http://127.0.0.1:5173" $web
Write-StartLog "web ready"

Write-StartLog "opening browser"
Start-Process -FilePath "explorer.exe" -ArgumentList "http://localhost:5173"
Write-StartLog "browser opened"
exit 0
'@
Set-Content -Path $startPs1Path -Value $startPs1Content -Encoding UTF8

$stopPs1Path = "$Target\Stop.ps1"
$stopPs1Content = @'
# Stop.ps1 - Projekt Manager beenden
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$pidFile = "$root\pm-pids.txt"

$targetPids = [System.Collections.Generic.HashSet[int]]::new()

if (Test-Path $pidFile) {
    (Get-Content $pidFile -Raw).Trim() -split '\s+' |
        Where-Object { $_ -match '^\d+$' } |
        ForEach-Object { [void]$targetPids.Add([int]$_) }
}

foreach ($port in @(3001, 5173, 3010)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        foreach ($item in @($conn)) {
            [void]$targetPids.Add([int]$item.OwningProcess)
        }
    }
}

if ($targetPids.Count -eq 0) {
    Write-Host "Keine laufenden Projekt-Manager-Prozesse gefunden." -ForegroundColor Yellow
} else {
    foreach ($p in $targetPids) {
        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $p -Force
            Write-Host "Prozess $p ($($proc.Name)) beendet." -ForegroundColor Green
        }
    }
}

Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force
    Write-Host "Ngrok-Tunnel beendet (Prozess $($_.Id))." -ForegroundColor Green
}

if (Test-Path $pidFile) { Remove-Item $pidFile -Force }
Write-Host "Projekt Manager gestoppt." -ForegroundColor Green
'@
Set-Content -Path $stopPs1Path -Value $stopPs1Content -Encoding UTF8

Write-Host "[7/7] Toolbar-Verknüpfungen werden eingerichtet und gestartet..." -ForegroundColor Yellow

$psExe = (Get-Command powershell.exe).Source
$toolbarPs1 = "$repoRoot\scripts\toolbar.ps1"
$toolbarArgs = "-WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File `"$toolbarPs1`" -DeployDir `"$Target`" -RepoRoot `"$repoRoot`""
$shell = New-Object -ComObject WScript.Shell

$desktopPath = [Environment]::GetFolderPath('Desktop')
$startupDir = [Environment]::GetFolderPath('Startup')
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

$shortcutPath = "$desktopPath\Projekt Manager.lnk"
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $psExe
$shortcut.Arguments = $toolbarArgs
$shortcut.WorkingDirectory = $repoRoot
$shortcut.WindowStyle = 7
$shortcut.Description = "Projekt Manager Toolbar"
$shortcut.Save()
Write-Host "  Desktop-Verknüpfung : $shortcutPath" -ForegroundColor Gray

$startupPath = "$startupDir\Projekt Manager.lnk"
$shortcut2 = $shell.CreateShortcut($startupPath)
$shortcut2.TargetPath = $psExe
$shortcut2.Arguments = $toolbarArgs
$shortcut2.WorkingDirectory = $repoRoot
$shortcut2.WindowStyle = 7
$shortcut2.Description = "Projekt Manager Toolbar"
$shortcut2.Save()
Write-Host "  Autostart-Verknüpfung: $startupPath" -ForegroundColor Gray

Stop-ExistingToolbar $toolbarPs1
Start-Process -FilePath $psExe -ArgumentList $toolbarArgs -WorkingDirectory $repoRoot -WindowStyle Hidden
Write-Host "  Toolbar gestartet." -ForegroundColor Gray

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






