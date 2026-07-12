# Log: Windows-Explorer-Importer

**Datum:** 11.07.26  
**Uhrzeit:** 08:07:03  
**Schritt:** 2 — Windows-Importer und Auswahl-Dialog  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Eine neue TypeScript-/Node-Komponente lädt Sammlungen, Kategorien und DMS-Tags über die geschützte API und importiert bis zu 100 Dateien strikt sequenziell. Der native WPF-Dialog zeigt Dateiliste, Anzahl, Gesamtgröße, optionale Sammlung und Kategorie sowie eine durchsuchbare Tag-Mehrfachauswahl. Fortschritt und Einzelstatus werden während des Imports über eine temporäre Statusdatei aktualisiert. Im Verschiebemodus wird jede Quelldatei erst nach ihrem vollständig erfolgreichen API-Import gelöscht; Löschfehler werden als eigener Warnstatus zurückgegeben. Das Explorer-Untermenü wurde für den aktuellen Benutzer registriert und die erzeugten Registry-Werte einschließlich `MultiSelectModel=Player` wurden zurückgelesen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/windows-importer/` | neu | Buildbare Importlogik und CLI |
| `scripts/document-manager-import-dialog.ps1` | neu | Nativer WPF-Auswahl- und Fortschrittsdialog |
| `scripts/register-document-manager-context-menu.ps1` | neu | HKCU-Registrierung für Kopieren/Verschieben |
| `scripts/unregister-document-manager-context-menu.ps1` | neu | Rücknehmbare Entfernung der Registry-Einträge |
| `package.json` / `package-lock.json` | geändert | Workspace, Build und Testskript ergänzt |

## Probleme und Abweichungen

Keine. Der Importer-Typecheck und -Build sowie die PowerShell-Syntaxprüfung aller drei Skripte sind grün. Das lokale System besitzt kein .NET SDK; der bestätigte WPF-über-Windows-PowerShell-Ansatz benötigt dieses nicht.

## Offene Punkte / Folgeaufgaben

- Unit-Tests für Importlogik und Dateilöschsemantik ergänzen und ausführen.
- Gesamtbuild und verfügbare Prüfungen ausführen.

## Angewendete Testleitplanken

`projekt-manager-test-entwurfsleitplanken`: Unit-Ebene für deterministische Importlogik mit echten Temp-Dateien und gemockter HTTP-Grenze; Integrationsebene bleibt für die echte DMS-API vorgesehen. Registry und WPF werden zusätzlich als manuelle Windows-Abnahme geprüft.
