# Log: Notizen API

**Datum:** 16.05.26  
**Schritt:** 5 — Notizen-API (CRUD + Join-Tabellen)  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Notizen-API wurde für Projekt- und Aufgabenverknüpfungen implementiert. `contentJson` wird beim Schreiben serialisiert und beim Lesen deserialisiert. Erstellen, Lesen, Aktualisieren und Löschen von Notizen ist als Service-Logik umgesetzt. Ein Unit-Test deckt die JSON-Hilfsfunktionen ab.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/notes.ts` | neu | Notizen-Endpunkte |
| `apps/api/src/services/notes.service.ts` | neu | Notizenlogik |
| `apps/api/src/services/helpers.ts` | neu | JSON- und Validierungshelfer |
| `apps/api/src/services/helpers.test.ts` | neu | Unit-Tests für Helfer |

## Probleme und Abweichungen

Runtime-Prüfung gegen SQLite ist wegen des blockierten `better-sqlite3`-Native-Bindings nicht möglich.

## Offene Punkte / Folgeaufgaben

CRUD-Integrationstests nach lauffähiger SQLite-Installation ergänzen.
