# Stop.ps1 - Projekt Manager beenden
param(
    [int[]]$Ports = @(3001, 5173, 3010)
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$pidFile = "$root\pm-pids.txt"

function Get-ProcessCommandLine([int]$ProcessId) {
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if (-not $processInfo -or $processInfo.Name -ine "node.exe") {
        return $null
    }
    return [string]$processInfo.CommandLine
}

function Test-ProjectManagerProcess([int]$ProcessId, [string]$Role, [bool]$AllowLegacyCommandLine = $false) {
    $commandLine = Get-ProcessCommandLine $ProcessId
    if (-not $commandLine) {
        return $false
    }

    if ($commandLine -match [regex]::Escape("--project-manager-runtime=$Role")) {
        return $true
    }
    if (-not $AllowLegacyCommandLine) {
        return $false
    }

    switch ($Role) {
        "api" {
            return $commandLine -match 'dist[\\/]index\.js'
        }
        "web" {
            return $commandLine -match 'scripts[\\/]serve-static\.mjs' -and
                $commandLine -match 'apps[\\/]web[\\/]dist'
        }
        "mcp" {
            return $commandLine -match 'apps[\\/]mcp-server[\\/]dist[\\/]http\.js'
        }
        default {
            return $false
        }
    }
}

function Get-RoleForPort([int]$Port) {
    switch ($Port) {
        3001 { return "api" }
        5173 { return "web" }
        3010 { return "mcp" }
        default { return $null }
    }
}

$targetPids = [System.Collections.Generic.HashSet[int]]::new()
$legacyPids = [System.Collections.Generic.HashSet[int]]::new()
$foreignPortOwners = @{}

if (Test-Path $pidFile) {
    foreach ($rawEntry in Get-Content $pidFile) {
        $entry = $rawEntry.Trim()
        if (-not $entry) {
            continue
        }

        $record = [regex]::Match($entry, '^(api|web|mcp)\|(\d+)\|(\d+)$')
        if (-not $record.Success) {
            if ($entry -match '^\d+(?:\s+\d+)*$') {
                foreach ($legacyPid in ($entry -split '\s+')) {
                    [void]$legacyPids.Add([int]$legacyPid)
                }
            }
            Write-Warning "Veralteter oder ungültiger PID-Eintrag wird ignoriert: $entry"
            continue
        }

        $role = $record.Groups[1].Value
        $processId = [int]$record.Groups[2].Value
        $expectedStartTicks = [long]$record.Groups[3].Value
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if (-not $process) {
            continue
        }

        try {
            $actualStartTicks = $process.StartTime.ToUniversalTime().Ticks
        } catch {
            Write-Warning "Prozess $processId konnte nicht sicher geprüft werden und wird nicht beendet."
            continue
        }

        if ($actualStartTicks -ne $expectedStartTicks -or
            -not (Test-ProjectManagerProcess $processId $role)) {
            Write-Warning "PID $processId gehört nicht mehr zum gespeicherten Projekt-Manager-Prozess und wird ignoriert."
            continue
        }

        [void]$targetPids.Add($processId)
    }
}

foreach ($port in $Ports) {
    $role = Get-RoleForPort $port
    $connections = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $connections) {
        $processId = [int]$connection.OwningProcess
        if ($targetPids.Contains($processId)) {
            continue
        }

        $allowLegacyCommandLine = $legacyPids.Contains($processId)
        if ($role -and (Test-ProjectManagerProcess $processId $role $allowLegacyCommandLine)) {
            [void]$targetPids.Add($processId)
            continue
        }

        if (-not $foreignPortOwners.ContainsKey($port)) {
            $foreignPortOwners[$port] = [System.Collections.Generic.HashSet[int]]::new()
        }
        [void]$foreignPortOwners[$port].Add($processId)
    }
}

if ($targetPids.Count -eq 0) {
    Write-Host "Keine laufenden Projekt-Manager-Prozesse gefunden." -ForegroundColor Yellow
} else {
    foreach ($processId in $targetPids) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $processId -Force
            if (-not $process.WaitForExit(10000)) {
                throw "Prozess $processId ($($process.Name)) konnte nicht beendet werden."
            }
            Write-Host "Prozess $processId ($($process.Name)) beendet." -ForegroundColor Green
        }
    }
}

if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
}

if ($foreignPortOwners.Count -gt 0) {
    $occupiedPorts = foreach ($port in ($foreignPortOwners.Keys | Sort-Object)) {
        $processIds = ($foreignPortOwners[$port] | Sort-Object) -join ", "
        "Port $port (PID $processIds)"
    }
    throw "Fremde Prozesse belegen Projekt-Manager-Ports und wurden nicht beendet: $($occupiedPorts -join '; ')."
}

foreach ($port in $Ports) {
    $deadline = (Get-Date).AddSeconds(10)
    do {
        $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if (-not $listener) {
            break
        }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)

    if ($listener) {
        throw "Port $port ist nach dem Stoppen weiterhin belegt."
    }
}

Write-Host "Projekt Manager gestoppt." -ForegroundColor Green
