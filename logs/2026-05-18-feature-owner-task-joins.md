# Log: Owner-Join-Tabellen für Aufgaben

**Datum:** 18.05.26  
**Schritt:** Feature — Vereinheitlichung Aufgaben-Zuordnung über Owner-Join-Tabellen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Aufgaben sind jetzt owner-unabhängige Objekte; Projekt-, Feature- und Use-Case-Boards verknüpfen Aufgaben ausschließlich über eigene Join-Tabellen. Die alten direkten Task-Domänenrelationen wurden aus Schema, Shared Types, Services und UI entfernt, während Subtasks weiterhin reine Task-zu-Task-Relationen bleiben. Für Projekte, Features und Use Cases gibt es einheitliche Owner-Endpunkte zum Listen, Erstellen-und-Verknüpfen, Verknüpfen vorhandener Aufgaben, Entfernen nur der Zuordnung und Aktualisieren von Board-Status/Position. Im Frontend ersetzt `OwnerTaskBoard` die bisherigen Sonderlogiken und stellt überall dieselbe Toolbar mit Suche, View-Toggle, `Verknüpfen` und `+` bereit. Die alten Checkboxlisten mit separatem Speichern-Button wurden aus den Aufgaben-Zuordnungen entfernt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `Task` ohne Domänen-FKs, `TaskBoardItem` und Board-Input ergänzt |
| `apps/api/src/db/schema.ts` | geändert | `project_tasks`, `feature_tasks`, `use_case_tasks` ergänzt; alte Task-Domänenrelationen entfernt |
| `apps/api/src/db/migrations/0011_warm_the_hunter.sql` | neu | Migration der Task-Zuordnungen in Owner-Join-Tabellen |
| `apps/api/src/db/migrations/0012_ticket_owner_joins.sql` | neu | Mitführung vorhandener Ticket-Owner-Join-Struktur zur Schema-Konsistenz |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migrationsjournal erweitert |
| `apps/api/src/db/migrations/meta/0011_snapshot.json` | neu | Drizzle-Snapshot für Task-Owner-Joins |
| `apps/api/src/db/migrations/meta/0012_snapshot.json` | neu | Drizzle-Snapshot für aktuellen Schema-Endstand |
| `apps/api/src/services/tasks.service.ts` | geändert | Owner-Task-Board-Logik, Link/Unlink, Board-Position und globale Task-Liste |
| `apps/api/src/routes/tasks.ts` | geändert | Einheitliche Owner-Endpunkte für Projekt, Feature und Use Case |
| `apps/api/src/services/doc-links.service.ts` | geändert | Alte Task-Feature-/Task-Use-Case-Link-Services entfernt |
| `apps/api/src/routes/doc-links.ts` | geändert | Alte Checkbox-Relation-API für Aufgaben entfernt |
| `apps/api/src/services/projects.service.ts` | geändert | Projektstatistiken und Projektlöschung auf Join-Tabellen umgestellt |
| `apps/api/src/services/wiki-import.service.ts` | geändert | Import verknüpft Aufgaben über Owner-Join-Tabellen |
| `apps/api/src/services/seed-data.service.ts` | geändert | Seed-Aufgaben und Ticket-Bezüge auf Owner-Join-Struktur umgestellt |
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Format um neue Join-Tabellen erweitert |
| `apps/api/tests/**` | geändert | API-, Migrations-, Dump-, Seed- und Cascade-Tests auf Owner-Tasks angepasst |
| `apps/web/src/api/tasks.ts` | geändert | Owner-basierter Task-API-Client |
| `apps/web/src/hooks/useTasks.ts` | geändert | Owner-basierter Task-Hook mit Create/Link/Unlink/Board-Move |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | neu | Einheitliches Aufgaben-Board für Projekt, Feature und Use Case |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Gemeinsame Toolbar-Aktion `Verknüpfen` ergänzt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Feature-/Use-Case-Relationen entfernt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Feature-/Use-Case-Relationen und Relation-Tabs entfernt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Projekt-Aufgaben-Tab auf `OwnerTaskBoard` umgestellt |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Feature-Aufgaben-Tab auf `OwnerTaskBoard` umgestellt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-Aufgabenbereich auf `OwnerTaskBoard` umgestellt |
| `apps/web/src/queries/invalidation.ts` | geändert | Task-Invalidierung an owner-unabhängige Aufgaben angepasst |
| `apps/web/src/hooks/useGlobalSearchData.ts` | geändert | Globale Suche lädt Aufgaben ohne Projektbindung |
| `apps/web/src/hooks/useCalendarTasks.ts` | geändert | Kalender-Aufgabenauswahl ohne Projektbindung |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Kalenderformular nutzt owner-unabhängige Aufgabenliste |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Sekundäre Toolbar-Aktion für Link-Button ergänzt |
| `apps/web/src/components/ui/Modal.tsx` | geändert | Modals werden per Portal gerendert, damit Link-Dialoge nicht in Formularen verschachteln |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Toter Typ-Import entfernt, damit Lint sauber läuft |

## Probleme und Abweichungen

Im Arbeitsbaum existierte bereits eine Ticket-Owner-Join-Umstellung. Damit Schema, Migrationen und Tests konsistent bleiben, wurde dafür eine zusätzliche Migration mitgeführt. Außerdem setzt der API-Testhelper global das Content-Verzeichnis; Seed- und Dump-Tests setzen deshalb nach dem App-Build wieder explizit ihr isoliertes Testverzeichnis. Der Web-Build meldet weiterhin nur den bestehenden Vite-Hinweis zu großen Chunks, der Build selbst ist erfolgreich.

## Offene Punkte / Folgeaufgaben

Keine.
