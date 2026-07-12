Option Explicit

Dim shell, fileSystem, scriptDirectory, launcherPath, mode, filePath, command
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

If WScript.Arguments.Count < 2 Then
  WScript.Quit 1
End If

scriptDirectory = fileSystem.GetParentFolderName(WScript.ScriptFullName)
launcherPath = fileSystem.BuildPath(scriptDirectory, "document-manager-import-launcher.ps1")
mode = WScript.Arguments(0)
filePath = WScript.Arguments(1)
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File " & Quote(launcherPath) & " -Mode " & mode & " -FilePath " & Quote(filePath)
shell.Run command, 0, False

Function Quote(value)
  Quote = Chr(34) & Replace(value, Chr(34), Chr(34) & Chr(34)) & Chr(34)
End Function
