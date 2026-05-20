param(
  [string]$AppDir = "",
  [switch]$EnsureModel,
  [string]$Model = "",
  [int]$StartupTimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

function Resolve-AppRoot {
  param([string]$Candidate)

  if ($Candidate) {
    return (Resolve-Path -LiteralPath $Candidate).Path
  }

  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
}

function Get-OllamaTags {
  try {
    return Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 5
  } catch {
    return $null
  }
}

function Wait-Ollama {
  param([int]$TimeoutSeconds)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $tags = Get-OllamaTags
    if ($tags) {
      return $tags
    }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)

  return $null
}

function Resolve-OllamaExecutable {
  param(
    [string]$PortableExe
  )

  if (Test-Path -LiteralPath $PortableExe) {
    return $PortableExe
  }

  $globalOllama = Get-Command "ollama.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($globalOllama) {
    return $globalOllama.Source
  }

  $globalOllama = Get-Command "ollama" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($globalOllama) {
    return $globalOllama.Source
  }

  return $null
}

$appRoot = Resolve-AppRoot -Candidate $AppDir
$modelName = if ($Model) { $Model } elseif ($env:AI_DEFAULT_MODEL) { $env:AI_DEFAULT_MODEL } else { "llama3.2:1b" }
$runtimeRoot = Join-Path $appRoot ".local-ai"
$ollamaDir = Join-Path $runtimeRoot "ollama"
$portableOllamaExe = Join-Path $ollamaDir "ollama.exe"
$modelsDir = Join-Path $runtimeRoot "models"
$ollamaExe = Resolve-OllamaExecutable -PortableExe $portableOllamaExe

if (-not $ollamaExe) {
  Write-Host "Lokale KI-Runtime fehlt. Einrichtung wird gestartet..."
  & (Join-Path $PSScriptRoot "setup-local-ai.ps1") -AppDir $appRoot -Model $modelName -SkipModelPull
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  $ollamaExe = Resolve-OllamaExecutable -PortableExe $portableOllamaExe
}

if (-not $ollamaExe) {
  throw "Lokale KI-Runtime fehlt weiterhin."
}

New-Item -ItemType Directory -Force -Path $runtimeRoot, $modelsDir | Out-Null
$env:OLLAMA_MODELS = $modelsDir
$env:OLLAMA_HOST = "127.0.0.1:11434"

$tags = Get-OllamaTags
if (-not $tags) {
  Write-Host "Starte lokale KI-Runtime..."
  $logFile = Join-Path $runtimeRoot "ollama.log"
  $errorFile = Join-Path $runtimeRoot "ollama.err.log"
  $workingDirectory = if (Test-Path -LiteralPath $ollamaDir) { $ollamaDir } else { $appRoot }
  Start-Process -WindowStyle Hidden -FilePath $ollamaExe -ArgumentList "serve" -WorkingDirectory $workingDirectory -RedirectStandardOutput $logFile -RedirectStandardError $errorFile
  $tags = Wait-Ollama -TimeoutSeconds $StartupTimeoutSeconds
}

if (-not $tags) {
  throw "Lokale KI-Runtime ist nicht erreichbar unter http://127.0.0.1:11434."
}

if ($EnsureModel) {
  $modelNames = @()
  if ($tags.models) {
    $modelNames = @($tags.models | ForEach-Object { $_.name })
  }

  if ($modelNames -notcontains $modelName) {
    Write-Host "Lade lokales KI-Modell: $modelName"
    & $ollamaExe pull $modelName
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
}

Write-Host "Lokale KI ist bereit: http://127.0.0.1:11434 ($modelName)"
