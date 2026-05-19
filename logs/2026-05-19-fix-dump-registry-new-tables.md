# Log: Dump-Registry Neue Tabellen

**Datum:** 19.05.26  
**Schritt:** Fix — Dump-Registry Neue Tabellen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dump-Registry wurde um die neuen Anwendungstabellen aus dem Architektur-Refactoring erweitert. Eingetragen wurden `users`, alle Comment-Junction-Tabellen und alle Attachment-Junction-Tabellen. Die Reihenfolge wurde so gesetzt, dass abhängige Tabellen beim Import erst nach ihren Eltern eingefügt und beim Restore in umgekehrter Reihenfolge gelöscht werden. Der Dump-Roundtrip-Test seedet jetzt repräsentative Datensätze für die neuen Tabellen, damit Export, Manifest, Import und Verifikation nicht nur leere Tabellen prüfen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | geändert | `DUMP_TABLES` um neue Tabellen ergänzt und FK-kompatibel sortiert |
| `apps/api/tests/integration/dumps-drive.test.ts` | geändert | Roundtrip-Seed um User-, Comment-Junction- und Attachment-Junction-Daten ergänzt |
| `logs/2026-05-19-fix-dump-registry-new-tables.md` | neu | Schritt-Log für den Dump-Registry-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. `DUMP_FORMAT_VERSION` wurde bewusst nicht erhöht, weil die Dump-Struktur unverändert bleibt und die harte Schema-Kompatibilität bereits über die Schema-Revision geprüft wird.

## Offene Punkte / Folgeaufgaben

Keine.
