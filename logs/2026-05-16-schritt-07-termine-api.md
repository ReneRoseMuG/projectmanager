# Log: Termine API

**Datum:** 16.05.26  
**Schritt:** 7 — Termine-API (CRUD + Date-Range-Filter)  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Termine-API wurde mit Listen, Erstellen, Lesen, Aktualisieren und Löschen umgesetzt. Query-Parameter `from` und `to` werden für Date-Range-Filter berücksichtigt. Verknüpfungen zu Projekten und Aufgaben werden vor dem Schreiben geprüft. Datumsbereiche werden validiert, damit `endTime` nicht vor `startTime` liegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/events.ts` | neu | Termin-Endpunkte |
| `apps/api/src/services/events.service.ts` | neu | Terminlogik |

## Probleme und Abweichungen

Runtime-Prüfung gegen SQLite ist wegen des blockierten `better-sqlite3`-Native-Bindings nicht möglich.

## Offene Punkte / Folgeaufgaben

Date-Range-Filter nach lauffähiger SQLite-Installation per Integrationstest absichern.
