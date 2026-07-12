# Log: Explorer-Dateiplatzhalter

**Datum:** 11.07.26  
**Uhrzeit:** 08:47:54  
**Schritt:** Fix — Explorer-Dateiplatzhalter  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Registry-Befehl verwendete irrtümlich `%*`, das der Windows Explorer bei klassischen Shell-Verben unverändert an PowerShell weitergab. Dadurch erhielt der WPF-Dialog den ungültigen Pfad `%*` und `GetFullPath` brach ab. Beide Explorer-Befehle verwenden jetzt den standardisierten, gequoteten Dateiplatzhalter `"%1"`; `MultiSelectModel=Player` bleibt für Mehrfachauswahlen erhalten. Die Registrierung wurde für den aktuellen Benutzer erneut angewendet und anschließend direkt aus der Registry zurückgelesen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/register-document-manager-context-menu.ps1` | geändert | `%*` durch den gültigen Shell-Platzhalter `"%1"` ersetzt |

## Probleme und Abweichungen

Keine. Die aktive Copy- und Move-Befehlszeile enthält jeweils `"%1"` und kein `%*` mehr.

## Offene Punkte / Folgeaufgaben

- Explorer-Fenster neu öffnen und Einzel- sowie Mehrfachauswahl manuell anklicken.

## Angewendete Testleitplanken

`projekt-manager-test-entwurfsleitplanken`: strukturelle Windows-Integrationsprüfung. Bewiesen wurde für beide aktiven Registry-Befehle der gültige `"%1"`-Platzhalter und die Abwesenheit von `%*`; die visuelle Ausführung bleibt ein manueller Explorer-Test.
