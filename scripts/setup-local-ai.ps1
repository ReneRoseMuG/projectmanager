param(
  [string]$AppDir = "",
  [string]$Model = "",
  [switch]$SkipModelPull,
  [string]$ReleaseTag = ""
)

$ErrorActionPreference = "Stop"

function Resolve-AppRoot {
  param([string]$Candidate)

  if ($Candidate) {
    return (Resolve-Path -LiteralPath $Candidate).Path
  }

  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
}

function Remove-DirectoryInside {
  param(
    [string]$Path,
    [string]$Root,
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd("\")
  $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
  if (-not $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label liegt außerhalb des lokalen KI-Verzeichnisses: $resolvedPath"
  }

  Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

function Get-OllamaRelease {
  param([string]$Tag)

  $headers = @{ "User-Agent" = "Projekt-Manager-Local-AI" }
  if ($Tag) {
    return Invoke-RestMethod -Uri "https://api.github.com/repos/ollama/ollama/releases/tags/$Tag" -Headers $headers
  }

  return Invoke-RestMethod -Uri "https://api.github.com/repos/ollama/ollama/releases/latest" -Headers $headers
}

function Save-RemoteFile {
  param(
    [string]$Uri,
    [string]$OutFile
  )

  $curl = Get-Command "curl.exe" -ErrorAction SilentlyContinue
  if ($curl) {
    & $curl.Source --fail --location --retry 3 --connect-timeout 30 --output $OutFile $Uri
    if ($LASTEXITCODE -ne 0) {
      throw "Download fehlgeschlagen: $Uri"
    }
    return
  }

  Invoke-WebRequest -Uri $Uri -OutFile $OutFile -UseBasicParsing
}

$appRoot = Resolve-AppRoot -Candidate $AppDir
$modelName = if ($Model) { $Model } elseif ($env:AI_DEFAULT_MODEL) { $env:AI_DEFAULT_MODEL } else { "llama3.2:1b" }
$runtimeRoot = Join-Path $appRoot ".local-ai"
$downloadsDir = Join-Path $runtimeRoot "downloads"
$extractDir = Join-Path $runtimeRoot "extract-ollama"
$ollamaDir = Join-Path $runtimeRoot "ollama"
$ollamaExe = Join-Path $ollamaDir "ollama.exe"

New-Item -ItemType Directory -Force -Path $runtimeRoot, $downloadsDir, $ollamaDir | Out-Null

if (Test-Path -LiteralPath $ollamaExe) {
  Write-Host "Lokale KI-Runtime ist bereits vorhanden: $ollamaExe"
  if (-not $SkipModelPull) {
    & (Join-Path $PSScriptRoot "start-local-ai.ps1") -AppDir $appRoot -EnsureModel -Model $modelName
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
  exit 0
}

Write-Host "Lade portable Ollama-Runtime herunter..."
$release = Get-OllamaRelease -Tag $ReleaseTag
$asset = $release.assets | Where-Object { $_.name -eq "ollama-windows-amd64.zip" } | Select-Object -First 1
if (-not $asset) {
  throw "Im Ollama-Release wurde kein Windows-amd64-Zip gefunden."
}

$zipPath = Join-Path $downloadsDir $asset.name
$downloadNeeded = $true
if (Test-Path -LiteralPath $zipPath) {
  $existing = Get-Item -LiteralPath $zipPath
  $downloadNeeded = $existing.Length -ne [int64]$asset.size
}

if ($downloadNeeded) {
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  Write-Host "Downloadgröße: $([Math]::Round($asset.size / 1GB, 2)) GB"
  Save-RemoteFile -Uri $asset.browser_download_url -OutFile $zipPath
}

Write-Host "Entpacke portable Ollama-Runtime..."
Remove-DirectoryInside -Path $extractDir -Root $runtimeRoot -Label "Temporäres Entpackverzeichnis"
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$extractedExe = Get-ChildItem -LiteralPath $extractDir -Recurse -Filter "ollama.exe" | Select-Object -First 1
if (-not $extractedExe) {
  throw "Das heruntergeladene Ollama-Paket enthält keine ollama.exe."
}

Remove-DirectoryInside -Path $ollamaDir -Root $runtimeRoot -Label "Ollama-Runtime-Verzeichnis"
New-Item -ItemType Directory -Force -Path $ollamaDir | Out-Null
Copy-Item -Path (Join-Path $extractedExe.DirectoryName "*") -Destination $ollamaDir -Recurse -Force
Remove-DirectoryInside -Path $extractDir -Root $runtimeRoot -Label "Temporäres Entpackverzeichnis"

if (-not (Test-Path -LiteralPath $ollamaExe)) {
  throw "Die portable Ollama-Runtime konnte nicht korrekt eingerichtet werden."
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Write-Host "Lokale KI-Runtime wurde eingerichtet: $ollamaExe"

if (-not $SkipModelPull) {
  & (Join-Path $PSScriptRoot "start-local-ai.ps1") -AppDir $appRoot -EnsureModel -Model $modelName
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
