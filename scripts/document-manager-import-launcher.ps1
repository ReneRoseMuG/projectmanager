param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("copy", "move")]
  [string]$Mode,

  [Parameter(Mandatory = $true)]
  [string]$FilePath
)

$ErrorActionPreference = "Stop"
$queueRoot = Join-Path $env:LOCALAPPDATA "ProjektManager\DocumentImportQueue"
$queuePath = Join-Path $queueRoot "$Mode.jsonl"
$dialogPath = Join-Path $PSScriptRoot "document-manager-import-dialog.ps1"
$appendMutex = New-Object System.Threading.Mutex($false, "Local\ProjektManagerDocumentImportAppend-$Mode")
$coordinatorMutex = New-Object System.Threading.Mutex($false, "Local\ProjektManagerDocumentImportCoordinator-$Mode")

function Wait-Mutex([System.Threading.Mutex]$Mutex, [int]$TimeoutMs) {
  try {
    return $Mutex.WaitOne($TimeoutMs)
  } catch [System.Threading.AbandonedMutexException] {
    return $true
  }
}

New-Item -ItemType Directory -Path $queueRoot -Force | Out-Null
$hasAppendLock = Wait-Mutex $appendMutex 5000
if (-not $hasAppendLock) {
  exit 1
}
try {
  $entry = @{ path = [System.IO.Path]::GetFullPath($FilePath); createdAt = [DateTime]::UtcNow.ToString("O") } | ConvertTo-Json -Compress
  [System.IO.File]::AppendAllText($queuePath, $entry + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
} finally {
  $appendMutex.ReleaseMutex()
}

$hasCoordinatorLock = Wait-Mutex $coordinatorMutex 5000
if (-not $hasCoordinatorLock) {
  $coordinatorMutex.Dispose()
  $appendMutex.Dispose()
  exit 0
}

$selectedFiles = @()
try {
  $stableSince = [DateTime]::UtcNow
  $lastWrite = if (Test-Path -LiteralPath $queuePath) { (Get-Item -LiteralPath $queuePath).LastWriteTimeUtc } else { [DateTime]::MinValue }
  $deadline = [DateTime]::UtcNow.AddSeconds(3)
  do {
    Start-Sleep -Milliseconds 250
    $currentWrite = if (Test-Path -LiteralPath $queuePath) { (Get-Item -LiteralPath $queuePath).LastWriteTimeUtc } else { [DateTime]::MinValue }
    if ($currentWrite -ne $lastWrite) {
      $lastWrite = $currentWrite
      $stableSince = [DateTime]::UtcNow
    }
  } while (([DateTime]::UtcNow - $stableSince).TotalMilliseconds -lt 650 -and [DateTime]::UtcNow -lt $deadline)

  $hasQueueLock = Wait-Mutex $appendMutex 5000
  if (-not $hasQueueLock) {
    exit 1
  }
  try {
    if (Test-Path -LiteralPath $queuePath) {
      $entries = @(Get-Content -LiteralPath $queuePath -Encoding UTF8 | Where-Object { $_.Trim() } | ForEach-Object { $_ | ConvertFrom-Json })
      Remove-Item -LiteralPath $queuePath -Force
      $cutoff = [DateTime]::UtcNow.AddSeconds(-30)
      $selectedFiles = @($entries | Where-Object { [DateTime]::Parse($_.createdAt).ToUniversalTime() -ge $cutoff } | ForEach-Object { $_.path } | Sort-Object -Unique)
    }
  } finally {
    $appendMutex.ReleaseMutex()
  }
} finally {
  $coordinatorMutex.ReleaseMutex()
  $coordinatorMutex.Dispose()
  $appendMutex.Dispose()
}

if ($selectedFiles.Count -gt 0) {
  & $dialogPath -Mode $Mode -Files $selectedFiles
}
