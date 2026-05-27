# Log: Footer-Counter Erweiterung

**Datum:** 27.05.26  
**Schritt:** Fix / Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Footer von Projekt- und Meilenstein-Karten wurden um fachliche Counter erweitert. Für Projekte liefert die API nun zusätzlich `milestoneCount` und `ticketCount`; die bestehende Aufgabenanzahl wird weiter aus `totalTaskCount` genutzt. `CardFooterBar` unterstützt optionale fachliche Counter und rendert weiterhin Tags und Tag-Picker ganz links, während die Counter-Gruppe rechts in der Reihenfolge fachliche Counter, Anhänge, Notizen und Kommentare angezeigt wird. Für Meilensteine werden Aufgaben und Tickets vor den bestehenden Support-Countern angezeigt. Die Testentwurfsleitplanken wurden angewendet: API-Integration mit echter Test-App und isolierter Test-DB prüft echte Projekt-, Meilenstein- und Ticket-Daten; Web-Unit-Tests in jsdom prüfen die beobachtbare Counter-Reihenfolge ohne API-Mocks.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Project-DTO um `milestoneCount` und `ticketCount` ergänzt |
| `apps/api/src/services/projects.service.ts` | geändert | Project-Counts für Meilensteine und direkte Projekt-Tickets ergänzt |
| `apps/web/src/components/ui/CardFooterBar.tsx` | geändert | Optionale fachliche Counter in der rechten Counter-Gruppe ergänzt |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Projekt-Footer um Meilenstein-, Aufgaben- und Ticket-Counter ergänzt |
| `apps/web/src/components/milestones/MilestoneCard.tsx` | geändert | Meilenstein-Footer um Aufgaben- und Ticket-Counter ergänzt |
| `tests/integration/api/projects.test.ts` | geändert | API-Integrationstest für Project-Footer-Counter ergänzt |
| `tests/unit/web/components/ui/CardFooterBar.test.tsx` | geändert | Footer-Counter-Reihenfolge getestet |
| `tests/unit/web/components/ui/ProjectListBoardView.test.tsx` | geändert | Projektkarten-Counter in Board/ListView abgesichert |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | geändert | Meilensteinkarten-Counter in Board/ListView abgesichert |
| `tests/fixtures/api/factories.ts` | geändert | API-Testprojekt-Typ um neue Counter ergänzt |
| `tests/fixtures/web/components/ui/factories.ts` | geändert | Web-Projektfixtures um neue Counter ergänzt |
| `tests/integration/web/hooks/statusCascadeWorkflow.integration.test.tsx` | geändert | Project-Fixture um neue Counter ergänzt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Project-Fixture um neue Counter ergänzt |
| `tests/unit/web/pages/TicketsPage.test.tsx` | geändert | Project-/Milestone-Fixtures vervollständigt |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Project-/Milestone-Fixtures vervollständigt |
| `tests/unit/web/components/calendar/EventForm.test.tsx` | geändert | Project-Fixtures vervollständigt |
| `tests/unit/web/components/ui/ProjectMilestoneFilterBar.test.tsx` | geändert | Project-/Milestone-Fixtures vervollständigt |
| `tests/unit/web/pages/ProjectDetailPage.test.tsx` | geändert | Project-Fixture vervollständigt |
| `tests/unit/web/pages/MilestonesPage.test.tsx` | geändert | Project-/Milestone-Fixtures vervollständigt |
| `tests/unit/web/pages/ProjectsPage.test.tsx` | geändert | Project-Fixture vervollständigt |

## Probleme und Abweichungen

Die erste Umsetzung hatte die fachlichen Counter vor die Tags gesetzt. Nach Nutzerkorrektur wurde die Anordnung angepasst: Tags und Tag-Picker bleiben ganz links, die Counter-Reihenfolge wird nur innerhalb der rechten Counter-Gruppe erweitert. Der zuvor gestartete API-Typecheck wurde durch die Nutzerunterbrechung abgebrochen und danach erfolgreich erneut ausgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
