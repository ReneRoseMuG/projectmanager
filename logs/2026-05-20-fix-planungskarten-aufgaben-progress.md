# Log: Planungskarten Aufgaben-Progress

**Datum:** 20.05.26  
**Schritt:** Fix — Planungskarten Aufgaben-Progress  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Projekt- und Meilensteinkarten nutzen jetzt eine gemeinsame UI-Basis für Karte und Listenzeile. Diese Basis rendert Avatar, Titel, Beschreibung, Status/Tags, Aktionen und einen einheitlichen Aufgaben-Fortschrittsbereich mit dem sichtbaren Label „Aufgaben“. Die Projektkarte zeigt kein automatisch abgeleitetes Kürzel mehr. Die Meilensteinkarte verwendet keine enge Badge-Zeile für Aufgaben, Tickets und Features mehr, sondern denselben Aufgaben-Fortschritt wie Projekte. Damit der Meilenstein-Fortschritt echte Daten nutzt, liefert die Meilenstein-API nun zusätzlich `openTaskCount`, `doneTaskCount` und `totalTaskCount`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Meilenstein-DTO um Aufgaben-Zähler erweitert |
| `apps/api/src/services/milestones.service.ts` | geändert | Offene, erledigte und gesamte Meilenstein-Aufgaben aus Task-Relationen gezählt |
| `apps/api/tests/helpers/factories.ts` | geändert | Test-DTO für Meilensteine ergänzt |
| `apps/api/tests/integration/milestones.test.ts` | geändert | Meilenstein-Aufgabenzähler abgesichert |
| `apps/web/src/components/ui/PlanningItemCard.tsx` | neu | Gemeinsame Basis für Projekt- und Meilensteinkarten/-zeilen |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Projektkarte auf gemeinsame Basis umgestellt und Kürzel entfernt |
| `apps/web/src/components/milestones/MilestoneCard.tsx` | geändert | Meilensteinkarte auf gemeinsame Basis umgestellt |
| `apps/web/src/components/milestones/__tests__/MilestoneForm.test.tsx` | geändert | Meilenstein-Testfixture ergänzt |
| `apps/web/src/components/test/ownerFormTestUtils.tsx` | geändert | Meilenstein-Testfixture ergänzt |
| `apps/web/src/components/ui/__tests__/factories.ts` | geändert | Meilenstein-Factory für ListBoard-Tests ergänzt |
| `apps/web/src/components/ui/__tests__/ProjectListBoardView.test.tsx` | geändert | Aufgaben-Progress und entferntes Kürzel abgesichert |
| `apps/web/src/components/ui/__tests__/MilestoneListBoardView.test.tsx` | neu | Meilenstein-Progress und Layout-Verhalten abgesichert |
| `logs/2026-05-20-fix-planungskarten-aufgaben-progress.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die enge Analyse hat gezeigt, dass Meilensteine bisher nur `taskCount`, aber keine offenen/erledigten Aufgaben-Zähler hatten. Deshalb wurde der ursprünglich frontendnahe Fix gezielt um Shared Types und API-Zählung erweitert, damit die Progressbar nicht aus ungenauen Daten geschätzt wird.

## Offene Punkte / Folgeaufgaben

Slug-Anzeigen in anderen Domänen wie Feature- und Use-Case-Karten wurden nicht entfernt, weil dieser Auftrag konkret Projekt- und Meilensteinkarten/-listitems betraf und eine domänenweite Slug-Bereinigung ein eigener UI-Cleanup wäre.
