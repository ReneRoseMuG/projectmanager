# setup-mcp.ps1 - Projekt-Manager-MCP in Claude Desktop eintragen
#
# Trägt den Server "projekt-manager" in alle gefundenen Claude-Desktop-
# Konfigurationen ein (klassische Installation und Store-Paket). Der Eintrag
# zeigt bewusst auf das Deployment-Verzeichnis und nicht auf das Repository,
# damit ein Build im Repo laufende Chats nicht unterbricht.
param(
    [string]$DeployDir = "$env:LOCALAPPDATA\Projekt Manager"
)

$ScriptDir = $PSScriptRoot
$ConfigPaths = @("$env:APPDATA\Claude\claude_desktop_config.json")
$StoreClaudeRoot = "$env:LOCALAPPDATA\Packages"
if (Test-Path $StoreClaudeRoot) {
    Get-ChildItem $StoreClaudeRoot -Directory -Filter "Claude_*" | ForEach-Object {
        $StoreConfigPath = Join-Path $_.FullName "LocalCache\Roaming\Claude\claude_desktop_config.json"
        if ($ConfigPaths -notcontains $StoreConfigPath) {
            $ConfigPaths += $StoreConfigPath
        }
    }
}

function Read-LocalEnv {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    foreach ($rawLine in Get-Content $Path -Encoding UTF8) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            continue
        }
        if ($line.StartsWith("export ")) {
            $line = $line.Substring(7).Trim()
        }
        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -le 0) {
            continue
        }
        $key = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $values[$key] = $value
    }

    return $values
}

$LocalEnv = Read-LocalEnv "$ScriptDir\.env.local"
$ApiKey = $env:PROJECT_MANAGER_API_KEY
if (-not $ApiKey) { $ApiKey = $env:API_KEY }
if (-not $ApiKey -and $LocalEnv.ContainsKey("PROJECT_MANAGER_API_KEY")) { $ApiKey = $LocalEnv["PROJECT_MANAGER_API_KEY"] }
if (-not $ApiKey -and $LocalEnv.ContainsKey("API_KEY")) { $ApiKey = $LocalEnv["API_KEY"] }

if (-not $ApiKey) {
    Write-Host "Kein PROJECT_MANAGER_API_KEY/API_KEY gefunden. Bitte .env.local aus .env.local.example anlegen."
    exit 1
}

$ApiBaseUrl = $env:PROJECT_MANAGER_API_BASE_URL
if (-not $ApiBaseUrl -and $LocalEnv.ContainsKey("PROJECT_MANAGER_API_BASE_URL")) { $ApiBaseUrl = $LocalEnv["PROJECT_MANAGER_API_BASE_URL"] }
if (-not $ApiBaseUrl -and $LocalEnv.ContainsKey("VITE_API_URL")) { $ApiBaseUrl = $LocalEnv["VITE_API_URL"] }
if (-not $ApiBaseUrl) { $ApiBaseUrl = "http://127.0.0.1:3001/api" }

# Geschrieben wird mit Node: ConvertTo-Json in Windows PowerShell 5.1 macht aus
# einelementigen Arrays Skalare und kappt tiefe Verschachtelungen - das würde
# den bestehenden preferences-Block der Claude-Konfiguration beschädigen.
$Writer = Join-Path $ScriptDir "scripts\write-claude-mcp-config.mjs"
if (-not (Test-Path $Writer)) {
    Write-Host "Schreib-Skript nicht gefunden: $Writer"
    exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "node.exe nicht gefunden. Bitte Node.js installieren (https://nodejs.org)."
    exit 1
}

$env:PROJECT_MANAGER_API_KEY = $ApiKey

foreach ($ConfigPath in $ConfigPaths) {
    Write-Host "Claude-Konfiguration: $ConfigPath"
    node $Writer $ConfigPath $DeployDir $ApiBaseUrl
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Eintrag fehlgeschlagen: $ConfigPath"
        exit 1
    }
}

Write-Host ""
Write-Host "Fertig. Bitte Claude Desktop neu starten, damit der Server geladen wird."
