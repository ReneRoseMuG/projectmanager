param()

$ErrorActionPreference = "Stop"
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$dialogPath = Join-Path $PSScriptRoot "document-manager-import-dialog.ps1"
$launcherPath = Join-Path $PSScriptRoot "document-manager-import-launcher.vbs"
$wscriptPath = (Get-Command wscript.exe -ErrorAction Stop).Source
$cliPath = Join-Path $repoRoot "apps\windows-importer\dist\cli.js"

if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) {
  throw "Der Windows-Importer ist nicht gebaut. Führen Sie zuerst 'npm run build -w apps/windows-importer' aus."
}
if (-not (Test-Path -LiteralPath $dialogPath -PathType Leaf) -or -not (Test-Path -LiteralPath $launcherPath -PathType Leaf)) {
  throw "Die Windows-Importer-Startskripte fehlen."
}

$registryRoot = [Microsoft.Win32.Registry]::CurrentUser
$legacyPaths = @(
  "Software\Classes\*\shell\ProjektManager.DocumentManagement",
  "Software\Classes\ProjektManager.DocumentManagement.Commands"
)
foreach ($legacyPath in $legacyPaths) {
  $registryRoot.DeleteSubKeyTree($legacyPath, $false)
}

foreach ($command in @(
  @{ Key = "ProjektManager.DocumentCopy"; Label = "Ins Dokument Management kopieren"; Mode = "copy" },
  @{ Key = "ProjektManager.DocumentMove"; Label = "Ins Dokument Management verschieben"; Mode = "move" }
)) {
  $verbPath = "Software\Classes\*\shell\$($command.Key)"
  $verbKey = $registryRoot.CreateSubKey($verbPath)
  $verbKey.SetValue("MUIVerb", $command.Label, [Microsoft.Win32.RegistryValueKind]::String)
  $verbKey.SetValue("MultiSelectModel", "Player", [Microsoft.Win32.RegistryValueKind]::String)
  $commandLine = ('"{0}" "{1}" {2} "%1"' -f $wscriptPath, $launcherPath, $command.Mode)
  $commandKey = $verbKey.CreateSubKey("command")
  $commandKey.SetValue("", $commandLine, [Microsoft.Win32.RegistryValueKind]::String)
  $commandKey.Dispose()
  $verbKey.Dispose()
}

Write-Host "Die beiden Dokument-Management-Befehle wurden für den aktuellen Benutzer registriert."
