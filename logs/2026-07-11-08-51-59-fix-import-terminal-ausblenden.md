# Log: Import-Terminal ausblenden

**Datum:** 11.07.26  
**Uhrzeit:** 08:51:59  
**Schritt:** Fix — Import-Terminal ausblenden  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Explorer-Befehle starten Windows PowerShell nun mit `-WindowStyle Hidden`. Dadurch bleibt das technische Konsolenfenster unsichtbar, während der native WPF-Auswahldialog normal angezeigt wird. Die Registrierung wurde für den aktuellen Benutzer erneut angewendet. Beide aktiven Command-Werte wurden zurückgelesen und enthalten die Hidden-Option.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/register-document-manager-context-menu.ps1` | geändert | PowerShell-Konsole beim Explorer-Aufruf ausblenden |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

- Manueller Explorer-Klick zur visuellen Bestätigung.

## Angewendete Testleitplanken

`projekt-manager-test-entwurfsleitplanken`: strukturelle Windows-Integrationsprüfung der aktiven Copy- und Move-Command-Werte; beide enthalten `-WindowStyle Hidden`.
