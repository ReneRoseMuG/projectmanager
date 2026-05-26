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

function Write-JsonWithoutBom {
    param(
        [string]$Path,
        [object]$Value
    )

    $json = $Value | ConvertTo-Json -Depth 10
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $json, $encoding)
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

$McpEntry = [PSCustomObject]@{
    command = "node"
    args = @("$ScriptDir\apps\mcp-server\dist\stdio.js")
    env = [PSCustomObject]@{
        PROJECT_MANAGER_API_BASE_URL = $ApiBaseUrl
        PROJECT_MANAGER_API_KEY = $ApiKey
    }
}

foreach ($ConfigPath in $ConfigPaths) {
    if (Test-Path $ConfigPath) {
        $raw = Get-Content $ConfigPath -Raw -Encoding UTF8
        $Config = $raw | ConvertFrom-Json
    } else {
        Write-Host "No existing config found at $ConfigPath - creating new one."
        $Config = [PSCustomObject]@{ mcpServers = [PSCustomObject]@{} }
    }

    if (-not ($Config.PSObject.Properties.Name -contains "mcpServers")) {
        $Config | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([PSCustomObject]@{})
    }

    if (Test-Path $ConfigPath) {
        Copy-Item $ConfigPath "$ConfigPath.bak" -Force
        Write-Host "Backup created: $ConfigPath.bak"
    }

    $Config.mcpServers | Add-Member -MemberType NoteProperty -Name "projekt-manager" -Value $McpEntry -Force

    $dir = Split-Path $ConfigPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Write-JsonWithoutBom $ConfigPath $Config
    Write-Host "Updated Claude config: $ConfigPath"
}

Write-Host "Done! Please restart Claude Desktop."
