# Log: Attachment-Junction-Modell

**Datum:** 19.05.26  
**Schritt:** 4 — Attachment-Junction-Modell  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Schema wurde um die vier Attachment-Junction-Tabellen `project_attachments`, `task_attachments`, `feature_attachments` und `ticket_attachments` erweitert. Eine neue Migration überträgt bestehende Legacy-Owner aus `attachments.project_id`, `task_id`, `feature_id` und `ticket_id` in die neuen Junction-Tabellen. Der Attachment-Service listet, erstellt und löscht Attachments nun über Parent-spezifische Junction-Zugriffe und liefert `owners: [...]` im DTO. Die Datei-Cleanup-Logik berücksichtigt mehrere Parent-Links und löscht Dateien nur für Attachments, deren bekannte Owner vollständig im gelöschten Owner-Scope liegen. Die Migration wurde auf einer frischen Test-Runtime-Datenbank und auf der lokalen Dev-DB erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Attachment-Junction-Tabellen ergänzt |
| `apps/api/src/db/migrations/0015_workable_invisible_woman.sql` | neu | Migration mit Attachment-Junction-Tabellen und Datenübernahme |
| `apps/api/src/db/migrations/meta/0015_snapshot.json` | neu | Drizzle-Snapshot für Attachment-Junctions |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Neue Migration registriert |
| `apps/api/src/services/attachments.service.ts` | geändert | Junction-basierte Attachment-Implementierung mit `owners` |
| `packages/shared-types/src/index.ts` | geändert | `AttachmentOwner`, `owners`, `updatedAt` und `version` ergänzt |
| `packages/shared-types/dist/` | geändert | Shared Types neu gebaut |
| `logs/2026-05-19-schritt-04-attachment-junction-modell.md` | neu | Schritt-Log für Aufgabe 04 |
| `logs/README.md` | geändert | Log-Index um Aufgabe 04 ergänzt |

## Probleme und Abweichungen

Der Test `npm run test -w apps/api -- tests/integration/attachments.test.ts` ist grün: 8 Tests grün.

Der Test `npm run test -w apps/api -- tests/integration/delete-cascade.test.ts` bleibt nicht grün: 51 Tests grün, 2 Tests rot. Es handelt sich um dieselben offenen Comment-Cascade-Altfälle aus Schritt 03. Gemäß Nutzeranweisung wurden nach dem Testlauf keine Fixes an Tests oder Produktionscode vorgenommen.

Der bereits bekannte Dump-Registry-Blocker bleibt offen: Neue Anwendungstabellen wie `users` sowie die neuen Junction-Tabellen sind noch nicht in der Dump-Tabellenregistry berücksichtigt.

## Offene Punkte / Folgeaufgaben

- Cascade-Tests müssen in einer passenden Folgeaufgabe auf das Junction-Zielmodell umgestellt werden.
- Dump-Registry muss die neuen Tabellen in Aufgabe 08 oder im Abschluss-Gate berücksichtigen.
- E2E-Tests für n:m-Attachments wurden in diesem Schritt noch nicht ergänzt.
