# Log: Navigation und Standalone-Tabs

**Datum:** 22.05.26  
**Schritt:** Feature — Neue Hauptansichten, Navigation und Standalone-Tabs  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Hauptnavigation wurde gruppiert und um die neuen Hauptansichten Meilensteine und Aufgaben zwischen Projekte und Tickets erweitert. Für Meilensteine, Aufgaben und Tickets wurden Filterzeilen unterhalb der Such-/Aktionszeile ergänzt; Meilensteine filtern nach Projekt, Aufgaben und Tickets nach Projekt oder Meilenstein. Die Funktion „In neuem Tab öffnen“ erzeugt nun zentrale Standalone-URLs mit `standalone=1`, sodass Hauptansichten und Detailformulare ohne App-Navigation gerendert werden. Bestehende Detailseiten wurden auf diese Standalone-URL-Erzeugung umgestellt, damit der Fehler nicht nur für neue Aufgaben- und Ticketansichten behoben ist. Admin-Unterpunkte wurden in eine Inline-Navigation der Adminseite verschoben, der Header wurde um „Lokal“ bereinigt und die neue Refresh-Fläche im Navigationskopf angebunden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/App.tsx` | geändert | Standalone-Rendering, neue Haupt- und Adminrouten ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Gruppierte Navigation, neue Einträge und Standalone-Tab-Buttons umgesetzt |
| `apps/web/src/components/layout/AdminLayout.tsx` | neu | Inline-Navigation für Admin-Unterseiten angelegt |
| `apps/web/src/components/layout/TopBar.tsx` | geändert | Horizontale Trennung an Suchfeld-Unterkante ergänzt |
| `apps/web/src/components/ui/PageHeader.tsx` | neu | Wiederverwendbarer Seitenkopf mit icon-only Refresh |
| `apps/web/src/components/ui/ProjectMilestoneFilterBar.tsx` | neu | Gemeinsame Projekt-/Meilenstein-Filterzeile |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Toolbar in Such-/Aktionszeile plus separate Filterzeile umgebaut |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Filterzeile an Milestone-Board weitergegeben |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Filterzeile und optionale Create-Aktionen für Aufgaben ergänzt |
| `apps/web/src/hooks/useStandaloneView.ts` | neu | Hook für Standalone-Erkennung aus der URL |
| `apps/web/src/hooks/useTasks.ts` | geändert | Globale Aufgabenliste für die neue Hauptansicht ergänzt |
| `apps/web/src/utils/standalone.ts` | neu | Zentrale Standalone-URL-Hilfsfunktionen |
| `apps/web/src/pages/MilestonesPage.tsx` | neu | Hauptansicht Meilensteine mit Projektfilter |
| `apps/web/src/pages/TasksPage.tsx` | neu | Hauptansicht Aufgaben mit Projekt-/Meilensteinfilter |
| `apps/web/src/pages/TicketsPage.tsx` | geändert | Ticket-Hauptansicht mit Projekt-/Meilensteinfilter und Standalone-Refresh |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Standalone-Refresh und Rücksprungparameter ergänzt |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Standalone-Refresh und Rücksprungparameter ergänzt |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Standalone-Refresh und Tab-URLs angepasst |
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Standalone-Refresh ergänzt |
| `apps/web/src/pages/JournalPage.tsx` | geändert | Standalone-Refresh ergänzt |
| `apps/web/src/pages/*DetailPage.tsx` | geändert | Detail-Tab-Öffnen auf Standalone-URLs umgestellt |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Navigation, Admin-Gruppierung und Standalone-Tab-URLs geprüft |
| `tests/unit/web/components/layout/AdminLayout.test.tsx` | neu | Admin-Inline-Navigation geprüft |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Neue Filterzeilen-Struktur geprüft |
| `tests/unit/web/components/ui/PageHeader.test.tsx` | neu | Icon-only Refresh-Button geprüft |
| `tests/unit/web/components/ui/ProjectMilestoneFilterBar.test.tsx` | neu | Projekt-/Meilensteinfilter geprüft |
| `tests/unit/web/pages/TicketsPage.test.tsx` | neu | Ticket-Hauptansicht, globale Liste und Filter-Owner geprüft |
| `tests/unit/web/pages/*DetailPage.test.tsx` | geändert | Erwartete Standalone-Tab-URLs aktualisiert |
| `tests/unit/web/utils/standalone.test.ts` | neu | Standalone-URL-Hilfsfunktionen geprüft |

## Probleme und Abweichungen

Der Frontend-Umfang ist grün geprüft: `npm run typecheck -w apps/web`, `npm run test -w apps/web`, `npm run lint -w apps/web` und `npm run build -w apps/web` waren erfolgreich. Der ergänzend ausgeführte API-Testlauf `npm run test -w apps/api` ist mit zwei bestehenden API-/Content-Testfehlern fehlgeschlagen: `tests/integration/api/app.integration.test.ts:446` findet keinen importierten Use Case, und `tests/unit/api/services/content.service.test.ts:90` erwartet weiterhin einen Dateinamen mit Slug, während `buildFilename` `feature-42.md` liefert. Diese API-Fehler wurden gemäß Testregel nicht im Rahmen dieses Frontend-Auftrags behoben. Eine Browser-Sichtprüfung wurde nicht ausgeführt, weil die Browser-/Node-REPL-Fähigkeit in dieser Sitzung nicht als nutzbares Tool bereitgestellt wurde.

## Offene Punkte / Folgeaufgaben

Die beiden API-Testfehler sollten in einem separaten Folgeauftrag bewertet werden. Zusätzlich ist ein Browser-/E2E-Durchlauf sinnvoll, sobald die lokale Browser-Fähigkeit oder der E2E-Lauf ausdrücklich freigegeben ist.
