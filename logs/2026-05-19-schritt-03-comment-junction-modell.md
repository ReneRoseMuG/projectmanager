# Log: Comment-Junction-Modell

**Datum:** 19.05.26  
**Schritt:** 3 — Comment-Junction-Modell  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Schema wurde um die sieben Comment-Junction-Tabellen `project_comments`, `task_comments`, `feature_comments`, `use_case_comments`, `backlog_item_comments`, `wiki_page_comments` und `ticket_comments` erweitert. Eine neue Migration überträgt bestehende Legacy-Comment-Owner aus `task_id` sowie `entity_type`/`entity_id` in die neuen Junction-Tabellen und legt Trigger an, die Comments nach dem Entfernen des letzten Parent-Links löschen. Der Comment-Service nutzt für Listen, Erstellen, Verlinken und Entfernen nun Parent-spezifische Junction-Zugriffe und liefert `owners: [...]` im DTO. Manuelle Comment-Cascade-Aufrufe wurden aus den Parent-Services entfernt. Die Migration wurde auf einer frischen Test-Runtime-Datenbank und auf der lokalen Dev-DB erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Comment-Junction-Tabellen ergänzt |
| `apps/api/src/db/migrations/0014_dry_vermin.sql` | neu | Migration mit Junction-Tabellen, Datenübernahme und Triggern |
| `apps/api/src/db/migrations/meta/0014_snapshot.json` | neu | Drizzle-Snapshot für Comment-Junctions |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Neue Migration registriert |
| `apps/api/src/services/comments.service.ts` | geändert | Junction-basierte Comment-Implementierung mit `owners` |
| `apps/api/src/routes/comments.ts` | geändert | Route zum Verlinken bestehender Comments ergänzt |
| `apps/api/src/services/backlog.service.ts` | geändert | Manuellen Comment-Cascade-Aufruf entfernt |
| `apps/api/src/services/features.service.ts` | geändert | Manuellen Comment-Cascade-Aufruf entfernt |
| `apps/api/src/services/projects.service.ts` | geändert | Manuellen Comment-Cascade-Aufruf entfernt |
| `apps/api/src/services/tasks.service.ts` | geändert | Manuellen Comment-Cascade-Aufruf entfernt |
| `apps/api/src/services/tickets.service.ts` | geändert | Manuellen Comment-Cascade-Aufruf entfernt |
| `apps/api/src/services/use-cases.service.ts` | geändert | Manuellen Comment-Cascade-Aufruf entfernt |
| `apps/api/src/services/wiki.service.ts` | geändert | Manuellen Comment-Cascade-Aufruf entfernt |
| `packages/shared-types/src/index.ts` | geändert | `CommentOwner`, `owners`, `updatedAt` und `version` ergänzt |
| `packages/shared-types/dist/` | geändert | Shared Types neu gebaut |
| `logs/2026-05-19-schritt-03-comment-junction-modell.md` | neu | Schritt-Log für Aufgabe 03 |
| `logs/README.md` | geändert | Log-Index um Aufgabe 03 ergänzt |

## Probleme und Abweichungen

Der Test `npm run test -w apps/api -- tests/integration/comments.test.ts` ist grün: 6 Tests grün.

Der Test `npm run test -w apps/api -- tests/integration/delete-cascade.test.ts` ist nicht grün: 51 Tests grün, 2 Tests rot. Rot sind die Fälle `löscht Kommentare mit entityType='project'` und `löscht Kommentare der BacklogItems (entityType='backlogItem')`. Ursache: Die bestehenden Tests legen Comments direkt in der Legacy-Tabelle an, ohne die neuen Junction-Tabellen zu befüllen. Dadurch kann der neue DB-native Parent-Cascade über Junctions diese direkt eingefügten Testdaten nicht erreichen. Gemäß Nutzeranweisung wurden nach dem Testlauf keine Fixes an Tests oder Produktionscode vorgenommen.

Der bereits aus Schritt 02 bekannte Dump-Registry-Blocker (`users` fehlt in Dump-Tabellenregistry) bleibt offen und wurde nicht behoben.

## Offene Punkte / Folgeaufgaben

- Cascade-Tests müssen in einer passenden Folgeaufgabe auf das Junction-Zielmodell umgestellt werden.
- Direkte Test-Inserts in `comments` müssen künftig auch Junction-Einträge erzeugen oder durch API-Aufrufe ersetzt werden.
- Der Dump-Registry-Blocker bleibt für Aufgabe 08 oder das Abschluss-Gate offen.
