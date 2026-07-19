param()

$ErrorActionPreference = "Stop"
$registryRoot = [Microsoft.Win32.Registry]::CurrentUser
$paths = @(
  "Software\Classes\*\shell\ProjektManager.DocumentManagement",
  "Software\Classes\ProjektManager.DocumentManagement.Commands",
  "Software\Classes\*\shell\ProjektManager.DocumentCopy",
  "Software\Classes\*\shell\ProjektManager.DocumentMove"
)

foreach ($path in $paths) {
  $registryRoot.DeleteSubKeyTree($path, $false)
}

Write-Host "Die Dokument-Management-Befehle wurden für den aktuellen Benutzer entfernt."
