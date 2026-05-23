# Setup-Skript: Projekt-Manager MCP-Server in Claude Desktop registrieren
# -----------------------------------------------------------------------
# 1. Trage deinen API-Key bei $ApiKey ein
# 2. Führe das Skript in PowerShell aus: .\setup-mcp.ps1

$ApiKey = "qfKrFhngzK8f8gYSny9UG9cDv9O42U7c1P0H4Dj7nls="

# Pfade
$ConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$McpEntry = @{
    command = "node"
    args    = @("C:\Users\schro\source\repos\Projekt Manager\apps\mcp-server\dist\stdio.js")
    env     = @{
        PROJECT_MANAGER_API_BASE_URL = "http://127.0.0.1:3001/api"
        PROJECT_MANAGER_API_KEY      = $ApiKey
    }
}

# Prüfen ob der Key noch ein Platzhalter ist
if ($ApiKey -eq "YOUR_API_KEY_HERE") {
    Write-Error "Bitte trage deinen API-Key in die Variable `$ApiKey ein (Zeile 6)."
    exit 1
}

# Config laden oder neu anlegen
if (Test-Path $ConfigPath) {
    $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
} else {
    Write-Host "Keine bestehende Config gefunden — lege neue an."
    $Config = [PSCustomObject]@{ mcpServers = [PSCustomObject]@{} }
}

# mcpServers sicherstellen
if (-not $Config.PSObject.Properties["mcpServers"]) {
    $Config | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([PSCustomObject]@{})
}

# Eintrag setzen (überschreibt bestehenden, falls vorhanden)
$Config.mcpServers | Add-Member -MemberType NoteProperty -Name "projekt-manager" -Value $McpEntry -Force

# Backup der alten Config
if (Test-Path $ConfigPath) {
    $Backup = "$ConfigPath.bak"
    Copy-Item $ConfigPath $Backup -Force
    Write-Host "Backup erstellt: $Backup"
}

# Speichern
$Config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
Write-Host ""
Write-Host "Fertig! 'projekt-manager' wurde in $ConfigPath eingetragen."
Write-Host "Starte Claude Desktop neu, damit der MCP-Server geladen wird."
