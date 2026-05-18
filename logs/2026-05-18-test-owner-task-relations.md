# Log: Owner-Aufgabenbeziehungen Tests

**Datum:** 18.05.26  
**Schritt:** Feature — Testsuite für Owner-Aufgabenbeziehungen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Für alle aufgabenfähigen Owner — Projekt, Feature und Use Case — wurde eine API-Integrationssuite ergänzt, die Create, Link, Remove, Board-Move, unbekannte Owner, unbekannte Aufgaben, fehlende Links, Subtask-Links und direkte Task-Löschversuche mit bestehenden Beziehungen prüft. Die Task-Löschlogik blockiert jetzt direkte Löschungen, solange Projekt-, Feature- oder Use-Case-Aufgabenbeziehungen bestehen. Bestehende API- und E2E-Tests wurden an die neue Semantik angepasst: ein Delete-Icon im Owner-Board entfernt nur die Zuordnung, nicht die Aufgabe selbst. Zusätzlich gibt es eine Playwright-Suite, die in Projekt-, Feature- und Use-Case-Detailansichten den Aufgaben-Tab öffnet und die vollständigen Create-, Link- und Remove-Flows im Browser testet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | Delete-Blocker für Aufgaben mit Owner-Beziehungen ergänzt |
| `apps/api/tests/integration/owner-task-relations.test.ts` | neu | Owner-Task-API-Suite für Projekt, Feature und Use Case |
| `apps/api/tests/integration/tasks.test.ts` | geändert | Direkte Task-Löschung erst nach entfernter Owner-Zuordnung erwartet |
| `apps/api/tests/integration/delete-cascade.test.ts` | geändert | Delete-Cascade-Tests an blockierte Owner-Beziehungen angepasst |
| `apps/api/src/app.integration.test.ts` | geändert | Integrations-Cleanup entfernt Projekt-Task-Link vor direktem Task-Delete |
| `apps/web/e2e/owner-tasks.spec.ts` | neu | Browsertests für Aufgaben-Tabs in Projekt, Feature und Use Case |
| `apps/web/e2e/task.spec.ts` | geändert | Alte Task-E2E-Flows auf Owner-Unlink statt Direktlöschung angepasst |

## Probleme und Abweichungen

Die neuen gezielten API-Tests sind grün, die neuen Browsertests sind grün, und auch die angepasste bestehende Task-E2E-Datei ist grün. Der vollständige Playwright-Lauf bleibt jedoch wegen drei älterer, nicht in diesem Auftrag geänderter E2E-Fälle rot: zwei Timeouts in `freshness.spec.ts` und ein Timeout in `project.spec.ts`, jeweils bei Projekt-/Feature-Aktualitätsflows. Lint und Build sind erfolgreich; der Web-Build meldet nur die bekannte Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Die drei bestehenden Playwright-Timeouts in `freshness.spec.ts` und `project.spec.ts` sollten separat untersucht werden, weil sie nicht Teil der neuen Owner-Aufgaben-Testabdeckung sind.
