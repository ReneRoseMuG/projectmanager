# Log: Agents Architekturleitplanken

**Datum:** 19.05.26  
**Schritt:** Fix — Agents Architekturleitplanken  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`agents.md` wurde um verbindliche Regeln für neue Domänen und Support-Objekte ergänzt. Dokumentiert wurden Repository- und Service-Grenzen, Versionierung mit `expectedVersion`, Audit-Felder, Testanforderungen für versionierte Updates und die Pflicht zur Dump-Registry-Pflege. Die Domänenarchitektur wurde auf den neuen Zielzustand angepasst: Tickets sind owner-unabhängige Objekte mit Join-Tabellen, Comments und Attachments werden über Owner-Junctions und DTOs mit `owners: [...]` erweitert. Zusätzlich wurde eine Checkliste für neue Entitäten und die Dump-/Backup-Registry ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Architekturregeln für neue Domänen, Support-Objekte, Versionierung, Junction-Owner und Dump-Registry ergänzt |
| `logs/2026-05-19-fix-agents-architekturleitplanken.md` | neu | Schritt-Log für die Dokumentationsänderung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
