# Log: Progress-Balken

**Datum:** 16.05.26  
**Schritt:** 2 — Fortschrittsbalken auf Projektkarten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das `Project`-Interface wurde um `doneTaskCount` und `totalTaskCount` erweitert. Der Projekt-Service berechnet nun neben `openTaskCount` auch erledigte und gesamte Tasks aus der bestehenden Tasks-Tabelle, ohne eine Migration oder Schemaänderung. Die Projektkarte rendert bei vorhandenen Tasks einen schmalen Fortschrittsbalken in Projektfarbe und den Text `X / Y erledigt`. Bei Projekten ohne Tasks wird der Balken nicht angezeigt. Nach der Änderung wurde `npm run build` erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Project um `doneTaskCount` und `totalTaskCount` erweitert |
| `apps/api/src/services/projects.service.ts` | geändert | Task-Zähler für Projekte ergänzt |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Fortschrittsbalken und Erledigt-Text ergänzt |

## Probleme und Abweichungen

Keine. Die Aggregation wurde mit vorhandenen Drizzle-Abfragen und Berechnung im Service umgesetzt; eine Migration war nicht erforderlich.

## Offene Punkte / Folgeaufgaben

Keine.
