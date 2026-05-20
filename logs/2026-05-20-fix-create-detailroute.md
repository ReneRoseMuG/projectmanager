# Log: Create Detailroute

**Datum:** 20.05.26  
**Schritt:** Fix — Create Detailroute  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Create-Flows der Detailseiten öffnen nach erfolgreichem Anlegen nun die kanonische Detailroute des neu erstellten Objekts. Dafür wird `closeOnSubmit` im Create-Modus deaktiviert, während es im Edit-Modus aktiv bleibt. Das bewahrt die bewusste Entscheidung, dass normales Speichern im Bearbeitungsmodus schließt und zur Rücksprung-Route navigiert. Betroffen sind Project, Feature, Milestone, Task, Ticket, Use Case und BacklogItem. Der Projekt-E2E-Test für Edit-Save wurde auf das erwartete Save-to-Close-Verhalten angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Create-Modus verhindert automatisches Schließen nach Submit |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Create-Modus verhindert automatisches Schließen nach Submit |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Create-Modus verhindert automatisches Schließen nach Submit |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Create-Modus verhindert automatisches Schließen nach Submit |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Create-Modus verhindert automatisches Schließen nach Submit |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Create-Modus verhindert automatisches Schließen nach Submit |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Create-Modus verhindert automatisches Schließen nach Submit |
| `apps/web/e2e/project.spec.ts` | geändert | Projekt-Edit-Test auf Save-to-Close ausgerichtet |
| `logs/2026-05-20-fix-create-detailroute.md` | neu | Schritt-Log für die bestätigte Produktionsänderung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die Änderung ist bewusst auf Create beschränkt; Edit-Save bleibt beim Schließen auf `returnTo`.

## Offene Punkte / Folgeaufgaben

Keine.
