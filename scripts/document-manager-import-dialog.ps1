param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("copy", "move")]
  [string]$Mode,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Files
)

$ErrorActionPreference = "Stop"
$utf8Encoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8Encoding
$OutputEncoding = $utf8Encoding
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

function Show-ImportError([string]$Message) {
  [System.Windows.MessageBox]::Show($Message, "Dokument Management", "OK", "Error") | Out-Null
}

try {
  $repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
  $cliPath = Join-Path $repoRoot "apps\windows-importer\dist\cli.js"
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) {
    throw "Der Windows-Importer ist noch nicht gebaut. Bitte zuerst 'npm run build -w apps/windows-importer' ausführen."
  }

  $resolvedFiles = @($Files | ForEach-Object { [System.IO.Path]::GetFullPath($_) } | Select-Object -Unique)
  if ($resolvedFiles.Count -eq 0) {
    throw "Es wurde keine Datei ausgewählt."
  }
  if ($resolvedFiles.Count -gt 100) {
    throw "Es können höchstens 100 Dateien gleichzeitig importiert werden."
  }

  $fileRows = @(foreach ($filePath in $resolvedFiles) {
    $item = Get-Item -LiteralPath $filePath -ErrorAction Stop
    if ($item.PSIsContainer) {
      throw "Ordner können nicht importiert werden: $filePath"
    }
    if ($item.Length -gt 25MB) {
      throw "Die Datei überschreitet das Limit von 25 MB: $filePath"
    }
    [pscustomobject]@{
      Name = $item.Name
      Size = if ($item.Length -ge 1MB) { "{0:N1} MB" -f ($item.Length / 1MB) } else { "{0:N0} KB" -f ([Math]::Max(1, $item.Length / 1KB)) }
      Path = $item.FullName
      Status = "Bereit"
    }
  })

  $optionsOutput = & $nodePath $cliPath options 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ($optionsOutput -join [Environment]::NewLine)
  }
  $options = ($optionsOutput -join "") | ConvertFrom-Json
} catch {
  Show-ImportError $_.Exception.Message
  exit 1
}

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Dokument Management" Height="780" Width="1120" MinHeight="680" MinWidth="960"
        WindowStartupLocation="CenterScreen" Background="#F8FAFC">
  <Grid Margin="20">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="2*"/>
      <RowDefinition Height="3*"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <StackPanel Grid.Row="0" Margin="0,0,0,14">
      <TextBlock Name="TitleText" FontSize="22" FontWeight="SemiBold" Foreground="#0F172A"/>
      <TextBlock Name="SummaryText" Margin="0,4,0,0" Foreground="#475569"/>
    </StackPanel>

    <ListView Name="FileList" Grid.Row="1" Margin="0,0,0,16" BorderBrush="#CBD5E1" BorderThickness="1">
      <ListView.View>
        <GridView>
          <GridViewColumn Header="Datei" Width="270" DisplayMemberBinding="{Binding Name}"/>
          <GridViewColumn Header="Größe" Width="90" DisplayMemberBinding="{Binding Size}"/>
          <GridViewColumn Header="Pfad" Width="520" DisplayMemberBinding="{Binding Path}"/>
          <GridViewColumn Header="Status" Width="140" DisplayMemberBinding="{Binding Status}"/>
        </GridView>
      </ListView.View>
    </ListView>

    <Grid Grid.Row="2">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="14"/>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="14"/>
        <ColumnDefinition Width="*"/>
      </Grid.ColumnDefinitions>

      <Border Grid.Column="0" BorderBrush="#CBD5E1" BorderThickness="1" Background="White" Padding="12">
        <Grid>
          <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
          </Grid.RowDefinitions>
          <TextBlock Text="Sammlungen" FontWeight="SemiBold" Foreground="#334155"/>
          <TextBox Name="FolderSearch" Grid.Row="1" Height="30" Margin="0,8,0,10" Padding="8,4" ToolTip="Sammlungen durchsuchen"/>
          <ScrollViewer Grid.Row="2" VerticalScrollBarVisibility="Auto">
            <StackPanel Name="FoldersPanel"/>
          </ScrollViewer>
        </Grid>
      </Border>

      <Border Grid.Column="2" BorderBrush="#CBD5E1" BorderThickness="1" Background="White" Padding="12">
        <Grid>
          <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
          </Grid.RowDefinitions>
          <TextBlock Text="Kategorien" FontWeight="SemiBold" Foreground="#334155"/>
          <TextBox Name="CategorySearch" Grid.Row="1" Height="30" Margin="0,8,0,10" Padding="8,4" ToolTip="Kategorien durchsuchen"/>
          <ScrollViewer Grid.Row="2" VerticalScrollBarVisibility="Auto">
            <StackPanel Name="CategoriesPanel"/>
          </ScrollViewer>
        </Grid>
      </Border>

      <Border Grid.Column="4" BorderBrush="#CBD5E1" BorderThickness="1" Background="White" Padding="12">
        <Grid>
        <Grid.RowDefinitions>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="*"/>
        </Grid.RowDefinitions>
          <TextBlock Text="Tags" FontWeight="SemiBold" Foreground="#334155"/>
          <TextBox Name="TagSearch" Grid.Row="1" Height="30" Margin="0,8,0,8" Padding="8,4" ToolTip="Tags durchsuchen"/>
          <Grid Grid.Row="2" Margin="0,0,0,10">
            <Grid.ColumnDefinitions>
              <ColumnDefinition Width="*"/>
              <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>
            <TextBox Name="NewTagName" Height="30" Padding="8,4" ToolTip="Name des neuen Tags"/>
            <Button Name="CreateTagButton" Grid.Column="1" Content="Tag anlegen" Height="30" Margin="8,0,0,0" Padding="12,0"/>
          </Grid>
          <ScrollViewer Grid.Row="3" VerticalScrollBarVisibility="Auto">
            <StackPanel Name="TagsPanel"/>
          </ScrollViewer>
        </Grid>
      </Border>
    </Grid>

    <Border Grid.Row="3" Margin="0,14,0,0" BorderBrush="#CBD5E1" BorderThickness="1" Background="White" Padding="12">
      <Grid>
        <Grid.RowDefinitions>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        <Grid Grid.Row="0" Margin="0,0,0,8">
          <TextBlock Text="Fortschritt" FontWeight="SemiBold" Foreground="#334155"/>
          <TextBlock Name="ProgressPercent" HorizontalAlignment="Right" FontWeight="SemiBold" Foreground="#334155" Text="0 %"/>
        </Grid>
        <ProgressBar Name="ProgressBar" Grid.Row="1" Height="14" Minimum="0"/>
        <TextBlock Name="ProgressText" Grid.Row="2" Margin="0,7,0,0" Foreground="#475569"/>
        <TextBlock Name="CurrentFileText" Grid.Row="3" Margin="0,3,0,0" Foreground="#64748B" TextTrimming="CharacterEllipsis"/>
      </Grid>
    </Border>

    <StackPanel Grid.Row="4" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,18,0,0">
      <Button Name="CancelButton" Content="Abbrechen" Width="110" Height="36" Margin="0,0,10,0"/>
      <Button Name="ImportButton" Width="160" Height="36" Background="#334155" Foreground="White" FontWeight="SemiBold"/>
    </StackPanel>
  </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)
$titleText = $window.FindName("TitleText")
$summaryText = $window.FindName("SummaryText")
$fileList = $window.FindName("FileList")
$folderSearch = $window.FindName("FolderSearch")
$foldersPanel = $window.FindName("FoldersPanel")
$categorySearch = $window.FindName("CategorySearch")
$categoriesPanel = $window.FindName("CategoriesPanel")
$tagSearch = $window.FindName("TagSearch")
$tagsPanel = $window.FindName("TagsPanel")
$newTagName = $window.FindName("NewTagName")
$createTagButton = $window.FindName("CreateTagButton")
$progressBar = $window.FindName("ProgressBar")
$progressPercent = $window.FindName("ProgressPercent")
$progressText = $window.FindName("ProgressText")
$currentFileText = $window.FindName("CurrentFileText")
$cancelButton = $window.FindName("CancelButton")
$importButton = $window.FindName("ImportButton")

$actionLabel = if ($Mode -eq "move") { "verschieben" } else { "kopieren" }
$titleText.Text = "Dateien ins Dokument Management $actionLabel"
$totalBytes = ($resolvedFiles | ForEach-Object { (Get-Item -LiteralPath $_).Length } | Measure-Object -Sum).Sum
$summaryText.Text = "$($resolvedFiles.Count) Datei(en), insgesamt $([Math]::Round($totalBytes / 1MB, 1)) MB"
$fileList.ItemsSource = $fileRows
$progressBar.Maximum = $resolvedFiles.Count
$progressText.Text = "Bereit zum Import"
$currentFileText.Text = "Noch nicht gestartet"
$importButton.Content = if ($Mode -eq "move") { "Dateien verschieben" } else { "Dateien kopieren" }

$folderCheckboxes = @()
foreach ($folder in @($options.folders)) {
  $checkbox = New-Object System.Windows.Controls.CheckBox
  $checkbox.Content = $folder.label
  $checkbox.Tag = $folder
  $checkbox.Margin = "0,0,0,8"
  $checkbox.Padding = "2"
  $foldersPanel.Children.Add($checkbox) | Out-Null
  $folderCheckboxes += $checkbox
}

$categoryCheckboxes = @()
foreach ($category in @($options.categories)) {
  $checkbox = New-Object System.Windows.Controls.CheckBox
  $checkbox.Content = $category.name
  $checkbox.Tag = $category
  $checkbox.Margin = "0,0,0,8"
  $checkbox.Padding = "2"
  $categoriesPanel.Children.Add($checkbox) | Out-Null
  $categoryCheckboxes += $checkbox
}

$script:tagCheckboxes = @()
foreach ($tag in @($options.tags)) {
  $checkbox = New-Object System.Windows.Controls.CheckBox
  $checkbox.Content = $tag.name
  $checkbox.Tag = $tag
  $checkbox.Margin = "0,0,0,8"
  $checkbox.Padding = "2"
  $tagsPanel.Children.Add($checkbox) | Out-Null
  $script:tagCheckboxes += $checkbox
}

$folderSearch.Add_TextChanged({
  $needle = $folderSearch.Text.Trim()
  foreach ($checkbox in $folderCheckboxes) {
    $checkbox.Visibility = if ([string]::IsNullOrWhiteSpace($needle) -or $checkbox.Content.ToString().IndexOf($needle, [StringComparison]::CurrentCultureIgnoreCase) -ge 0) { "Visible" } else { "Collapsed" }
  }
})

$categorySearch.Add_TextChanged({
  $needle = $categorySearch.Text.Trim()
  foreach ($checkbox in $categoryCheckboxes) {
    $checkbox.Visibility = if ([string]::IsNullOrWhiteSpace($needle) -or $checkbox.Content.ToString().IndexOf($needle, [StringComparison]::CurrentCultureIgnoreCase) -ge 0) { "Visible" } else { "Collapsed" }
  }
})

$tagSearch.Add_TextChanged({
  $needle = $tagSearch.Text.Trim()
  foreach ($checkbox in $script:tagCheckboxes) {
    $checkbox.Visibility = if ([string]::IsNullOrWhiteSpace($needle) -or $checkbox.Content.ToString().IndexOf($needle, [StringComparison]::CurrentCultureIgnoreCase) -ge 0) { "Visible" } else { "Collapsed" }
  }
})

$createTagButton.Add_Click({
  $name = $newTagName.Text.Trim()
  if ([string]::IsNullOrWhiteSpace($name)) {
    [System.Windows.MessageBox]::Show("Bitte geben Sie einen Namen für den neuen Tag ein.", "Dokument Management", "OK", "Information") | Out-Null
    return
  }
  $requestPath = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($requestPath, (@{ name = $name } | ConvertTo-Json -Compress), $utf8Encoding)
    $output = & $nodePath $cliPath create-tag --request $requestPath 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw ($output -join [Environment]::NewLine)
    }
    $tag = ($output -join "") | ConvertFrom-Json
    $checkbox = New-Object System.Windows.Controls.CheckBox
    $checkbox.Content = $tag.name
    $checkbox.Tag = $tag
    $checkbox.Margin = "0,0,0,8"
    $checkbox.Padding = "2"
    $checkbox.IsChecked = $true
    $tagsPanel.Children.Add($checkbox) | Out-Null
    $script:tagCheckboxes += $checkbox
    $newTagName.Clear()
    $tagSearch.Clear()
  } catch {
    [System.Windows.MessageBox]::Show($_.Exception.Message, "Tag konnte nicht angelegt werden", "OK", "Error") | Out-Null
  } finally {
    Remove-Item -LiteralPath $requestPath -Force -ErrorAction SilentlyContinue
  }
})

$script:importStarted = $false
$script:importCompleted = $false
$script:workerProcess = $null
$script:timer = $null
$script:tempRoot = $null

function Update-ProgressFromFile {
  param([string]$ProgressPath)
  if (-not (Test-Path -LiteralPath $ProgressPath -PathType Leaf)) { return }
  try {
    $summary = Get-Content -Raw -LiteralPath $ProgressPath | ConvertFrom-Json
    $progressBar.Value = $summary.completed
    $percent = if ($summary.total -gt 0) { [Math]::Round(($summary.completed / $summary.total) * 100) } else { 0 }
    $progressPercent.Text = "$percent %"
    foreach ($result in @($summary.results)) {
      $row = $fileRows | Where-Object { $_.Path -eq $result.filePath } | Select-Object -First 1
      if ($null -ne $row) { $row.Status = $result.message }
    }
    if ($summary.phase -eq "uploading" -and $summary.currentFilePath) {
      $currentNumber = [Math]::Min($summary.completed + 1, $summary.total)
      $currentName = [System.IO.Path]::GetFileName($summary.currentFilePath)
      $progressText.Text = "Datei $currentNumber von $($summary.total)"
      $currentFileText.Text = "Wird importiert: $currentName"
      $currentRow = $fileRows | Where-Object { $_.Path -eq $summary.currentFilePath } | Select-Object -First 1
      if ($null -ne $currentRow -and $currentRow.Status -eq "Bereit") { $currentRow.Status = "Wird importiert …" }
    } elseif ($summary.phase -eq "complete") {
      $progressText.Text = "$($summary.completed) von $($summary.total) Datei(en) verarbeitet"
      $currentFileText.Text = "Import abgeschlossen"
    } elseif ($summary.completed -gt 0) {
      $progressText.Text = "$($summary.completed) von $($summary.total) Datei(en) verarbeitet"
      $currentFileText.Text = "Nächste Datei wird vorbereitet"
    } else {
      $progressText.Text = "Import wird vorbereitet"
      $currentFileText.Text = "Dateien werden geprüft"
    }
    $fileList.Items.Refresh()
  } catch {
    # Die Fortschrittsdatei kann genau während eines Schreibvorgangs gelesen werden; der nächste Tick versucht es erneut.
  }
}

$cancelButton.Add_Click({
  if (-not $script:importStarted -or $script:importCompleted) { $window.Close() }
})

$importButton.Add_Click({
  if ($script:importCompleted) {
    $window.Close()
    return
  }
  if ($script:importStarted) { return }

  $script:importStarted = $true
  $folderSearch.IsEnabled = $false
  $categorySearch.IsEnabled = $false
  $tagSearch.IsEnabled = $false
  $newTagName.IsEnabled = $false
  $createTagButton.IsEnabled = $false
  foreach ($checkbox in $folderCheckboxes) { $checkbox.IsEnabled = $false }
  foreach ($checkbox in $categoryCheckboxes) { $checkbox.IsEnabled = $false }
  foreach ($checkbox in $script:tagCheckboxes) { $checkbox.IsEnabled = $false }
  $importButton.IsEnabled = $false
  $cancelButton.IsEnabled = $false
  $progressText.Text = "Import wird vorbereitet"
  $currentFileText.Text = "Dateien werden geprüft"

  $request = [ordered]@{
    mode = $Mode
    filePaths = @($resolvedFiles)
    folderIds = @($folderCheckboxes | Where-Object IsChecked | ForEach-Object { [int]$_.Tag.id })
    categoryIds = @($categoryCheckboxes | Where-Object IsChecked | ForEach-Object { [int]$_.Tag.id })
    tagIds = @($script:tagCheckboxes | Where-Object IsChecked | ForEach-Object { [int]$_.Tag.id })
  }

  $script:tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ProjektManagerDocumentImport\" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $script:tempRoot -Force | Out-Null
  $requestPath = Join-Path $script:tempRoot "request.json"
  $resultPath = Join-Path $script:tempRoot "result.json"
  $progressPath = Join-Path $script:tempRoot "progress.json"
  $request | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $requestPath -Encoding UTF8

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $nodePath
  $startInfo.Arguments = ('"{0}" import --request "{1}" --result "{2}" --progress "{3}"' -f $cliPath, $requestPath, $resultPath, $progressPath)
  $startInfo.WorkingDirectory = $repoRoot
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardError = $true
  $script:workerProcess = New-Object System.Diagnostics.Process
  $script:workerProcess.StartInfo = $startInfo
  $script:workerProcess.EnableRaisingEvents = $true

  $script:timer = New-Object System.Windows.Threading.DispatcherTimer
  $script:timer.Interval = [TimeSpan]::FromMilliseconds(250)
  $script:timer.Add_Tick({ Update-ProgressFromFile $progressPath })

  $script:workerProcess.add_Exited({
    $window.Dispatcher.Invoke([action]{
      $script:timer.Stop()
      Update-ProgressFromFile $progressPath
      $script:importCompleted = $true
      $importButton.IsEnabled = $true
      $importButton.Content = "Schließen"
      if ($script:workerProcess.ExitCode -eq 0 -and (Test-Path -LiteralPath $resultPath)) {
        $summary = Get-Content -Raw -LiteralPath $resultPath | ConvertFrom-Json
        $successCount = @($summary.results | Where-Object { $_.status -eq "copied" -or $_.status -eq "moved" }).Count
        $warningCount = @($summary.results | Where-Object { $_.status -eq "imported_not_moved" }).Count
        $failedCount = @($summary.results | Where-Object { $_.status -eq "failed" }).Count
        $progressBar.Value = $summary.total
        $progressPercent.Text = "100 %"
        $progressText.Text = "Abgeschlossen: $successCount erfolgreich, $warningCount mit Warnung, $failedCount fehlgeschlagen"
        $currentFileText.Text = "$($summary.total) Datei(en) verarbeitet"
      } else {
        $errorText = $script:workerProcess.StandardError.ReadToEnd().Trim()
        $progressText.Text = if ($errorText) { $errorText } else { "Der Import wurde unerwartet beendet." }
        $currentFileText.Text = "Import abgebrochen"
      }
    })
  })

  if (-not $script:workerProcess.Start()) {
    throw "Der Importprozess konnte nicht gestartet werden."
  }
  $script:timer.Start()
})

$window.Add_Closing({
  param($sender, $eventArgs)
  if ($script:importStarted -and -not $script:importCompleted) {
    $eventArgs.Cancel = $true
    [System.Windows.MessageBox]::Show("Der laufende Import muss zuerst abgeschlossen werden.", "Dokument Management", "OK", "Information") | Out-Null
  }
  if ($script:importCompleted -and $script:tempRoot) {
    Remove-Item -LiteralPath $script:tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
})

$window.ShowDialog() | Out-Null
