# Log: Kontrollierter Neustart im Tray-Menü

**Datum:** 11.07.26  
**Uhrzeit:** 07:38:01  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Tray-Menü wurde um den Eintrag „Projekt Manager neu starten“ ergänzt. Das neue Skript `Restart.ps1` führt zuerst das installierte Stop-Skript aus, prüft anschließend die Ports 3001, 5173 und 3010 und startet die Anwendung nur, wenn kein Listener mehr aktiv ist. Das generierte Stop-Skript wartet nun bis zu zehn Sekunden auf das tatsächliche Ende jedes bekannten Prozesses und anschließend auf die Freigabe der verwendeten Ports. Das Deployment kopiert das Restart-Skript in das Installationsverzeichnis.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/toolbar.ps1` | geändert | Restart-Menüpunkt und Aufruf ergänzt |
| `scripts/deploy.ps1` | geändert | Restart-Skript wird installiert; Stop wartet auf Prozessende und freie Ports |
| `scripts/restart.ps1` | neu | Kontrollierte Stop-Prüf-Start-Sequenz |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Testleitplanken

Angewendet wurden die Projekt-Manager-Testentwurfsleitplanken. Die Prüfung erfolgte auf Skript-/Integrationsebene mit einem isolierten temporären Laufzeitordner und echten PowerShell-Testskripten für Stop und Start. Bewiesen wurden die korrekte Reihenfolge Stop vor Start sowie der Abbruch vor Start bei einem weiterhin belegten Port. Zusätzlich wurden alle drei geänderten PowerShell-Skripte mit dem PowerShell-Parser geprüft.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Das Update-Skript muss einmal ausgeführt werden, damit `Restart.ps1` in die lokale Installation kopiert und die laufende Toolbar mit dem neuen Menü neu geladen wird.
