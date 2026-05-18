# Log: Verifikation und Upload-Fortschritt

**Datum:** 18.05.26  
**Schritt:** 5 — Verifikation: API-Build, Testzahlen, Fortschritt  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der fehlende API-Build wurde mit `npm run build -w apps/api` nachgeholt und war grün. Die geforderten Mindestzahlen wurden geprüft: `owner-task-relations.test.ts` enthält 51 Treffer für `it(`/`test(` und `tickets.test.ts` enthält 17 Treffer für `"Ticket`; beide Werte liegen über dem Soll. Danach lief `npm run test -w apps/api` grün mit 24 Testdateien und 278 bestandenen Tests. Die Datei-Upload-Fortschrittsanzeige wurde geprüft und ergänzt: Task-Uploads nutzen nun denselben Text wie Feature- und Project-Uploads, und Feature-/Project-Create setzen während sequenzieller Datei-Uploads `Speichern… (Datei X von Y)`. `npm run test -w apps/web` lief danach grün mit 24 Testdateien und 182 bestandenen Tests; `npm run typecheck -w apps/web` war ebenfalls grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | `savingLabel` für laufende Speichervorgänge ergänzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | `savingLabel` für laufende Speichervorgänge ergänzt |
| `apps/web/src/components/tasks/TaskModal.tsx` | geändert | Fallback-Speicherlabel auf Fortschrittstext mit Ellipse vereinheitlicht |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Datei-Upload-Fortschrittstext vereinheitlicht |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Fortschrittslabel im Feature-Post-Create-Dateiupload gesetzt |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Fortschrittslabel im Projekt-Post-Create-Dateiupload gesetzt |
| `logs/2026-05-18-schritt-05-verifikation-fortschritt.md` | neu | Schritt-Log für Schritt 5 |
| `logs/README.md` | geändert | Log-Index um Schritt 5 ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
