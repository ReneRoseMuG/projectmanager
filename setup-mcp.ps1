$ApiKey = "qfKrFhngzK8f8gYSny9UG9cDv9O42U7c1P0H4Dj7nls="
$ConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$ScriptDir = $PSScriptRoot

$McpEntry = [PSCustomObject]@{
    command = "node"
    args = @("$ScriptDir\apps\mcp-server\dist\stdio.js")
    env = [PSCustomObject]@{
        PROJECT_MANAGER_API_BASE_URL = "http://127.0.0.1:3001/api"
        PROJECT_MANAGER_API_KEY = $ApiKey
    }
}

if (Test-Path $ConfigPath) {
    $raw = Get-Content $ConfigPath -Raw -Encoding UTF8
    $Config = $raw | ConvertFrom-Json
} else {
    Write-Host "No existing config found - creating new one."
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
$Config | ConvertTo-Json -Depth 10 | Out-File $ConfigPath -Encoding UTF8
Write-Host "Done! Please restart Claude Desktop."
