# Log: MCP Feature Feldhinweise

**Datum:** 26.05.26  
**Schritt:** Fix — MCP Feature Feldhinweise  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die MCP-Tool-Schemata für das Erstellen und Aktualisieren von Features wurden um Anwendungshinweise an den Feldern `description` und `content` ergänzt. `description` ist nun als Zusammenfassung des redaktionellen Feature-Inhalts beschrieben. `content` ist nun als redaktioneller Hauptinhalt des Features beschrieben. Die Änderung sitzt direkt im Zod-Input-Schema, damit MCP-Clients die Semantik der Parameter aus der Tool-Definition ableiten können. Zusätzlich wurde bestätigt, dass es neben `create_feature` auch ein bestehendes `update_feature`-Tool gibt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | Feldbeschreibungen für `create_feature` und `update_feature` ergänzt |
| `logs/2026-05-26-fix-mcp-feature-feldhinweise.md` | neu | Schritt-Log zum Fix |
| `logs/README.md` | geändert | Log-Index um neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
