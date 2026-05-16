# Log: Tags API

**Datum:** 16.05.26  
**Schritt:** 4 — Tags-API (CRUD + PUT-Zuweisung)  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Tags-API wurde mit CRUD-Endpunkten und PUT-Zuweisung für Projekte und Aufgaben implementiert. Tag-Listen werden für Projekt- und Task-Antworten gruppiert bereitgestellt. Die Services prüfen Entitäten und Tag-IDs vor der Zuweisung. Das einheitliche Fehlerformat wird über den zentralen Fehlerhandler verwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/tags.ts` | neu | Tag-Endpunkte |
| `apps/api/src/services/tags.service.ts` | neu | Tag- und Zuordnungslogik |
| `apps/api/src/utils/route-schemas.ts` | neu | Gemeinsame Request-Schemas |

## Probleme und Abweichungen

Runtime-Prüfung gegen SQLite ist wegen des blockierten `better-sqlite3`-Native-Bindings nicht möglich.

## Offene Punkte / Folgeaufgaben

PUT-Zuweisungen nach laufender Migration per Integrationstest absichern.
