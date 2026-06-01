# Log: MCP-Code Auftrag Skill

**Datum:** 01.06.26  
**Uhrzeit:** 06:13:22  
**Schritt:** Fix — Globaler MCP-Code-Auftrag-Skill  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Projekt-Manager-MCP-Skill wurde als globaler Codex-Skill unter `C:\Users\schro\.codex\skills\MCP-Code_Auftrag` neu angelegt. Der Skill beschreibt jetzt Arbeitsaufträge, die aus der Projekt-Manager-App über den MCP übergeben werden, und lädt Parent-Referenzen wie `PROJ-1` oder `MS-34` mit rekursivem Kontext. Er schreibt verbindlich vor, dass nach dem Laden gefragt wird, ob der Auftrag direkt ausgeführt oder zuerst geplant werden soll. Nach der Ausführung fragt der Skill nach einem nutzerlesbaren Parent-Log als Kommentar oder Notiz und verlangt anschließend, den Parent-Status auf `pending` beziehungsweise `wartend` zu setzen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `C:\Users\schro\.codex\skills\MCP-Code_Auftrag\SKILL.md` | neu | Globaler Skill für Projekt-Manager-MCP-Arbeitsaufträge |
| `C:\Users\schro\.codex\skills\MCP-Code_Auftrag\agents\openai.yaml` | neu | UI-Metadaten für den globalen Skill |
| `logs/2026-06-01-06-13-22-fix-mcp-code-auftrag-skill.md` | neu | Schritt-Log zur Skill-Anlage |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Der aktuell sichtbare Projekt-Manager-MCP-Werkzeugumfang enthält kein explizites Kommentar- oder Status-Update-Tool. Der Skill dokumentiert deshalb, dass in diesem Fall ein Kommentar über ein verfügbares Notiz-Tool geschrieben werden soll und fehlende Statusänderungswerkzeuge als Blocker zu melden sind.

## Offene Punkte / Folgeaufgaben

Keine.
