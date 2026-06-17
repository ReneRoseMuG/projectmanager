# scripts/toolbar.ps1 - Projekt Manager Tray-Toolbar
param(
    [string]$DeployDir = "$env:LOCALAPPDATA\Projekt Manager",
    [string]$RepoRoot = (Split-Path $PSScriptRoot -Parent)
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:repoRoot  = $RepoRoot
$script:deployDir = $DeployDir
$script:startPs1  = "$script:deployDir\Start.ps1"
$script:stopPs1   = "$script:deployDir\Stop.ps1"
$script:updatePs1 = "$PSScriptRoot\update.ps1"

# Icon: blaues Quadrat mit "PM"
$bmp = New-Object System.Drawing.Bitmap 16, 16
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(0, 120, 215))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment     = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$font = New-Object System.Drawing.Font("Arial", 5, [System.Drawing.FontStyle]::Bold)
$g.DrawString("PM", $font, [System.Drawing.Brushes]::White,
    [System.Drawing.RectangleF]::new(0, 0, 16, 16), $sf)
$g.Dispose(); $font.Dispose(); $sf.Dispose()
$script:tray = New-Object System.Windows.Forms.NotifyIcon
$script:tray.Icon    = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$script:tray.Text    = "Projekt Manager"
$script:tray.Visible = $true
$bmp.Dispose()

# Kontextmenu
$menu = New-Object System.Windows.Forms.ContextMenuStrip

# --- Starten ---
$itemStart = New-Object System.Windows.Forms.ToolStripMenuItem "Projekt Manager starten"
$itemStart.Add_Click({
    if (-not (Test-Path $script:startPs1)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Start.ps1 nicht gefunden.`nBitte zuerst deploy.ps1 ausführen.",
            "Projekt Manager", "OK", "Warning") | Out-Null
        return
    }
    Start-Process powershell.exe -ArgumentList `
        "-WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File `"$script:startPs1`""
})
$menu.Items.Add($itemStart) | Out-Null

# --- Beenden ---
$itemStop = New-Object System.Windows.Forms.ToolStripMenuItem "Projekt Manager beenden"
$itemStop.Add_Click({
    if (-not (Test-Path $script:stopPs1)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Stop.ps1 nicht gefunden.", "Projekt Manager", "OK", "Warning") | Out-Null
        return
    }
    Start-Process powershell.exe -ArgumentList `
        "-ExecutionPolicy Bypass -NonInteractive -File `"$script:stopPs1`""
})
$menu.Items.Add($itemStop) | Out-Null

$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# --- Updaten ---
$itemUpdate = New-Object System.Windows.Forms.ToolStripMenuItem "Projekt Manager updaten"
$itemUpdate.Add_Click({
    if (-not (Test-Path $script:updatePs1)) {
        [System.Windows.Forms.MessageBox]::Show(
            "update.ps1 nicht gefunden.", "Projekt Manager", "OK", "Warning") | Out-Null
        return
    }
    Start-Process powershell.exe -ArgumentList `
        "-NoExit -ExecutionPolicy Bypass -NoProfile -File `"$script:updatePs1`" -DeployDir `"$script:deployDir`" -RepoRoot `"$script:repoRoot`""
})
$menu.Items.Add($itemUpdate) | Out-Null

$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# --- Toolbar beenden ---
$itemExit = New-Object System.Windows.Forms.ToolStripMenuItem "Toolbar beenden"
$itemExit.Add_Click({
    $script:tray.Visible = $false
    $script:tray.Dispose()
    [System.Windows.Forms.Application]::Exit()
})
$menu.Items.Add($itemExit) | Out-Null

$script:tray.ContextMenuStrip = $menu

# Linksklick öffnet dasselbe Kontextmenü
$script:tray.Add_MouseClick({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:tray.GetType().GetMethod(
            "ShowContextMenu",
            [System.Reflection.BindingFlags]"NonPublic,Instance"
        ).Invoke($script:tray, $null)
    }
})

[System.Windows.Forms.Application]::Run()

