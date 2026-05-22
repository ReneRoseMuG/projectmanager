# Log: Dashboard Frontend

**Datum:** 22.05.26  
**Schritt:** 2 — Dashboard Anzeige und Editor im Frontend  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Web-App hat eine neue Dashboard-Seite unter `/dashboard` und kontextbezogene Dashboard-Übersichten in Projekt-, Meilenstein- und Aufgabenformularen erhalten. Dashboard-Daten laufen über einen eigenen API-Client, zentrale Query-Keys und TanStack-Query-Hooks. Die Anzeige rendert Widgets in einem zweispaltigen Grid und nutzt echte Aufgaben-, Ticket-, Kommentar-, Datei-, Journal- und Meilensteindaten. Der Editor unterstützt persönliche Dashboards, Admin-Systemdashboards, Default-Setzung und Drag-and-Drop-Sortierung über `@dnd-kit`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/dashboard.ts` | neu | Dashboard-API und Widgetdaten-Requests |
| `apps/web/src/hooks/useDashboards.ts` | neu | Dashboard-Listen-, Detail-, Mutations- und Widgetdaten-Hooks |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | neu | Widget-Metadaten und Kontextlabels |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | neu | Widget-Renderer für Status, Listen, Journal, Kommentare und Dateien |
| `apps/web/src/components/dashboard/DashboardGrid.tsx` | neu | Responsive Grid-Anzeige |
| `apps/web/src/components/dashboard/DashboardPicker.tsx` | neu | Dashboard-Auswahl |
| `apps/web/src/components/dashboard/DashboardBuilder.tsx` | neu | Dashboard-Editor mit Widgetauswahl, Parametern und Drag-and-Drop |
| `apps/web/src/components/dashboard/DashboardView.tsx` | neu | Gemeinsame Anzeige für globalen, Projekt-, Meilenstein- und Aufgabenkontext |
| `apps/web/src/pages/DashboardPage.tsx` | neu | Globale Dashboard-Seite |
| `apps/web/src/App.tsx` | geändert | Route `/dashboard` ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationseintrag „Dashboard“ ergänzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Übersicht-Tab mit Projekt-Dashboard ergänzt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Übersicht-Tab mit Meilenstein-Dashboard ergänzt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Übersicht-Tab für Aufgaben mit Unteraufgaben ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Dashboard-Query-Keys ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Dashboard-Invalidierung in betroffene Domänenscopes aufgenommen |

## Probleme und Abweichungen

Die Detailformulare starten weiterhin im Details- bzw. Stammdaten-Tab, damit bestehende Bearbeitungsabläufe stabil bleiben. Die Dashboard-Anzeige ist als erster Tab „Übersicht“ erreichbar, wird aber nicht automatisch beim Öffnen eines Bearbeitungsformulars aktiviert.

## Offene Punkte / Folgeaufgaben

Keine.
