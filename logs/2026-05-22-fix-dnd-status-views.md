# Log: DnD Status Views

**Datum:** 22.05.26  
**Schritt:** Fix — DnD Status Views  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die DnD-Prüfung wurde von gemockter Unit-Abnahme auf echte Browser-Verifikation umgestellt. Dabei wurde sichtbar, dass die generische `ListBoardView` zwar DnD unterstützt, aber mehrere statusfähige Adapter ihren vorhandenen `onStatusChange`-Callback nicht an `onItemStatusChange` weitergereicht hatten. Dadurch war DnD außerhalb der Task-Ansicht faktisch deaktiviert. Die betroffenen Adapter geben Status-Drops jetzt an ihre bestehenden Status-Update-Handler weiter. Zusätzlich nutzt die zentrale DnD-Konfiguration nun Pointer-basierte Collision-Erkennung mit Rect-Fallback, damit Drops in breiten Statusboards zuverlässiger auf der Zielspalte landen. Ein neuer Playwright-Test prüft reale Pointer-Drags für Aufgaben und Tickets inklusive API-PATCH und sichtbarer Spaltenverschiebung. Der gemockte DnD-Unit-Test wurde entfernt, weil er zentrale DnD-Funktionalität nicht real abgesichert hat.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Pointer-basierte DnD-Collision-Erkennung mit Fallback ergänzt |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Vorhandenen Status-Callback an DnD weitergereicht |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Vorhandenen Status-Callback an DnD weitergereicht |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Vorhandenen Status-Callback an DnD weitergereicht |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Vorhandenen Status-Callback an DnD weitergereicht |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Vorhandenen Status-Callback an DnD weitergereicht |
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | geändert | Vorhandenen Status-Callback an DnD weitergereicht |
| `tests/browser/web/task-dnd.spec.ts` | neu | Echter Browser-Test für Task- und Ticket-DnD ohne DnD-Mocks |
| `tests/unit/web/components/ui/ListBoardView.dnd.test.tsx` | gelöscht | Gemockten DnD-Test entfernt |
| `logs/2026-05-22-fix-dnd-status-views.md` | neu | Schritt-Log für den DnD-Regressionsfix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Beim neuen Ticket-E2E fiel auf, dass Tickets mit Status `open` wegen der aktuellen WorkStatus-Reihenfolge in einer weiter rechts liegenden Spalte stehen; der Test scrollt die Karte deshalb vor dem Drag sichtbar in den Viewport.

## Offene Punkte / Folgeaufgaben

Die WorkStatus-Reihenfolge mischt Projekt-/Planungsstatus und Ticket-/Task-Status. Das ist kein Blocker für diesen Fix, sollte aber separat fachlich geprüft werden, weil Ticket-Defaults dadurch weiter rechts im Board erscheinen.
