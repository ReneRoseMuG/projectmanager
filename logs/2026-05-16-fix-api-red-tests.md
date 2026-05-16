# Log: API Red Tests

**Datum:** 16.05.26  
**Schritt:** Fix / Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die 13 roten API-Testfälle wurden anhand der genehmigten Lösungen korrigiert. Die älteren DELETE-Routes liefern jetzt konsistent `204 No Content` statt `200 { ok: true }`, passend zu den neueren Routes und den Integrationstests. Die Kommentar-Liste wird chronologisch aufsteigend und bei gleichen Zeitstempeln stabil nach `id` sortiert. Zusätzlich verhindert `createSubtask`, dass ein Subtask weitere Subtasks erhält. Der ältere Sammel-Integrationstest wurde an den genehmigten DELETE-Vertrag angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/attachments.ts` | geändert | DELETE-Antwort auf `204` umgestellt |
| `apps/api/src/routes/comments.ts` | geändert | DELETE-Antwort auf `204` umgestellt |
| `apps/api/src/routes/events.ts` | geändert | DELETE-Antwort auf `204` umgestellt |
| `apps/api/src/routes/notes.ts` | geändert | DELETE-Antwort auf `204` umgestellt |
| `apps/api/src/routes/projects.ts` | geändert | DELETE-Antwort auf `204` umgestellt |
| `apps/api/src/routes/tags.ts` | geändert | DELETE-Antwort auf `204` umgestellt |
| `apps/api/src/routes/tasks.ts` | geändert | DELETE-Antwort auf `204` umgestellt |
| `apps/api/src/services/comments.service.ts` | geändert | Kommentar-Sortierung chronologisch stabilisiert |
| `apps/api/src/services/tasks.service.ts` | geändert | Subtask-Tiefe auf eine Ebene begrenzt |
| `apps/api/src/app.integration.test.ts` | geändert | Sammeltest auf `204`-DELETE-Vertrag aktualisiert |
| `logs/2026-05-16-fix-api-red-tests.md` | neu | Schritt-Log für die roten API-Tests |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Beim ersten Testlauf nach der Route-Umstellung blieb ein alter Sammeltest rot, weil er noch `200 { ok: true }` für DELETE erwartete. Dieser Test wurde an den genehmigten API-Vertrag angepasst. Danach liefen alle API-Tests grün.

## Offene Punkte / Folgeaufgaben

Keine.
