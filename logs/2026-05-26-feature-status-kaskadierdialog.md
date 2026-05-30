# Log: Status-Kaskadierdialog

**Datum:** 26.05.26  
**Schritt:** Feature — TASK-94 Status-Workflow mit Kaskadierdialog  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Status-Workflow wurde clientseitig als Post-Save-Kaskade umgesetzt. Nach erfolgreichem Statuswechsel an Projekt oder Meilenstein vergleicht der neue Hook die `workStatus.sortOrder`-Werte aus dem Katalog und öffnet nur bei Statuserhöhung einen Dialog für direkte Kindobjekte mit niedrigerem Status. Der Dialog führt je Objektgruppe durch Meilensteine, Aufgaben und Tickets, erlaubt Abwahl oder Überspringen und aktualisiert ausschließlich ausgewählte Objekte über die bestehenden PATCH-Mutationen mit `expectedVersion`. Gruppen ohne passende Schreibberechtigung werden nicht angeboten; es wurden keine API-Endpunkte und keine Datenbankmigration ergänzt.

Testleitplanken: Der Testentwurfs-Skill wurde angewendet. Abgedeckte Testebenen sind Web-Unit für die SortOrder-/Step-Logik und Web-Integration für Hook, Dialog, Permission-Ausblendung und Mutation-Aufrufe. Die Tests nutzen isolierte Web-Fixtures und keine produktiven Daten, keine produktive DB und keine Upload-/Content-Verzeichnisse.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/utils/statusCascade.ts` | neu | SortOrder-Vergleich, Betroffenenfilter und Dialog-Step-Aufbau |
| `apps/web/src/hooks/useStatusCascadeWorkflow.tsx` | neu | Wiederverwendbarer Kaskaden-Hook für Projekt- und Meilensteinstatus |
| `apps/web/src/components/ui/StatusCascadeDialog.tsx` | neu | Multistep-Dialog mit Checkbox-Auswahl und Überspringen |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Projektlisten-Statuswechsel an Kaskadenworkflow angebunden |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Projektdetail-Speichern löst nach Statuserhöhung den Workflow aus |
| `apps/web/src/pages/MilestonesPage.tsx` | geändert | Meilensteinlisten-Statuswechsel an Kaskadenworkflow angebunden |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Meilensteindetail-Speichern löst nach Statuserhöhung den Workflow aus |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Projektinterne Meilenstein-Statuswechsel an Kaskadenworkflow angebunden |
| `apps/web/src/hooks/useMilestones.ts` | geändert | Optionales `enabled`-Flag für deaktivierte Mutationsnutzung ergänzt |
| `tests/unit/web/utils/statusCascade.test.ts` | neu | Unit-Tests für SortOrder-Filter und Step-Aufbau |
| `tests/integration/web/hooks/statusCascadeWorkflow.integration.test.tsx` | neu | Integrationstests für Dialogfluss, Auswahl, Überspringen und Permissions |

## Probleme und Abweichungen

Der Arbeitsbaum enthielt bereits zahlreiche unabhängige Änderungen. Diese wurden nicht zurückgesetzt und nur die für TASK-94 nötigen Stellen wurden ergänzt. Teilweise erfolgreiche Kind-Updates bleiben wie geplant möglich, weil kein neuer atomarer Bulk-Endpunkt eingeführt wurde; die UI berichtet erfolgreiche und fehlgeschlagene Änderungen per Toast.

## Offene Punkte / Folgeaufgaben

Optional kann später ein Browser-/E2E-Test für einen vollständigen Projektstatuswechsel mit echten isolierten Testdaten ergänzt werden.
