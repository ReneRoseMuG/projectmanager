# Log: Integrationstests Wiki/Docs-Ebene

**Datum:** 16.05.26  
**Schritt:** 30 - Integrationstests Wiki/Docs-Ebene  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Integrationstests für die neue Wiki-/Docs-Ebene wurden ergänzt. Die Testhelfer kennen jetzt die neuen Tabellen in der Truncation-Reihenfolge und stellen Factories für Features, Use Cases, Wiki-Seiten und Backlog-Items bereit. Die neuen Tests verwenden ein eigenes temporäres Content-Verzeichnis über `setContentBaseDir`, sodass keine Produktions-Markdown-Dateien erzeugt werden. Zusätzlich wurde das API-Script `test:integration` angepasst, damit die im Auftrag vorgegebenen Einzeldatei-Aufrufe tatsächlich nach Dateinamen filtern können. Alle fünf neuen Testdateien laufen mit den geforderten Einzelkommandos grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/package.json` | geändert | `test:integration` für Dateifilter-Aufrufe angepasst |
| `apps/api/tests/helpers/db.ts` | geändert | `truncateAll` um neue Tabellen erweitert |
| `apps/api/tests/helpers/factories.ts` | geändert | Factories für neue Entitäten ergänzt |
| `apps/api/tests/integration/features.test.ts` | neu | 14 Feature-Integrationstests |
| `apps/api/tests/integration/use-cases.test.ts` | neu | 10 Use-Case-Integrationstests |
| `apps/api/tests/integration/wiki.test.ts` | neu | 12 Wiki-Integrationstests |
| `apps/api/tests/integration/backlog.test.ts` | neu | 10 Backlog-Integrationstests |
| `apps/api/tests/integration/doc-links.test.ts` | neu | 8 Link-API-Integrationstests |

## Selbsttest-Protokoll - Schritt 30: Integrationstests Wiki/Docs-Ebene

### 1. TypeScript-Build
Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 30 nicht nötig; die Tests migrieren jeweils eine isolierte In-Memory-SQLite-DB.

### 3. Schema-Verifikation
Indirekt über Test-DB-Migration und die neuen Tests verifiziert. `truncateAll` enthält die neuen Tabellen `task_use_cases`, `task_features`, `project_features`, `backlog_items`, `use_cases`, `wiki_pages`, `features` vor den bestehenden Tabellen.

### 4. Integrationstest-Kommandos
Kommando: `npm run test:integration -w apps/api -- features.test.ts`  
Ergebnis: 14 bestanden, 0 fehlgeschlagen.

Kommando: `npm run test:integration -w apps/api -- use-cases.test.ts`  
Ergebnis: 10 bestanden, 0 fehlgeschlagen.

Kommando: `npm run test:integration -w apps/api -- wiki.test.ts`  
Ergebnis: 12 bestanden, 0 fehlgeschlagen.

Kommando: `npm run test:integration -w apps/api -- backlog.test.ts`  
Ergebnis: 10 bestanden, 0 fehlgeschlagen.

Kommando: `npm run test:integration -w apps/api -- doc-links.test.ts`  
Ergebnis: 8 bestanden, 0 fehlgeschlagen.

### 5. Dateisystem-Check
Die neuen Testdateien verwenden je Testdatei ein `os.tmpdir()`-Verzeichnis und setzen dieses über `setContentBaseDir`. Produktionsverzeichnisse unter `apps/api/content/` wurden durch die Tests nicht beschrieben.

### 6. Vollständiger Integrationstestlauf
Kommando: `npm run test:integration -w apps/api`  
Ergebnis: Rot mit 13 fehlgeschlagenen Alt-Tests außerhalb der neuen V3-Testdateien.

Fehlerliste:

| Test | Fehler |
|---|---|
| Attachments API DELETE /api/attachments/:id entfernt den Eintrag aus der DB | expected 204 "No Content", got 200 "OK" |
| Comments API GET /api/tasks/:id/comments gibt Kommentare chronologisch zurueck | expected 'Zweiter' to be 'Erster' |
| Comments API DELETE /api/comments/:id loescht den Kommentar | expected 204 "No Content", got 200 "OK" |
| Events API DELETE /api/events/:id loescht den Termin | expected 204 "No Content", got 200 "OK" |
| Events API Loeschen eines verknuepften Projekts setzt projectId auf NULL | expected 204 "No Content", got 200 "OK" |
| Notes API DELETE /api/notes/:id loescht Notiz und Join-Eintraege | expected 204 "No Content", got 200 "OK" |
| Projects API DELETE /api/projects/:id loescht das Projekt | expected 204 "No Content", got 200 "OK" |
| Projects API DELETE /api/projects/:id entfernt auch zugehoerige Tasks | expected 204 "No Content", got 200 "OK" |
| Subtasks API Subtask eines Subtasks anlegen gibt 400 zurueck | expected 400 "Bad Request", got 201 "Created" |
| Tags API DELETE /api/tags/:id loescht den Tag | expected 204 "No Content", got 200 "OK" |
| Tags API DELETE eines Tags entfernt auch seine Projektzuweisungen | expected 204 "No Content", got 200 "OK" |
| Tasks API DELETE /api/tasks/:id loescht die Aufgabe | expected 204 "No Content", got 200 "OK" |
| Tasks API DELETE /api/tasks/:id entfernt auch Subtasks und Kommentare | expected 204 "No Content", got 200 "OK" |

### 7. Abweichungen vom Plan
Das bestehende `test:integration`-Script musste minimal geändert werden, damit die im Auftrag vorgegebenen Einzeldatei-Kommandos korrekt funktionieren. Der vollständige Integrationstestlauf bleibt wegen bereits bekannter Alt-Vertragsabweichungen rot; diese wurden gemäß `agents.md` nicht eigenständig während des Testlaufs gefixt.

### Gesamtstatus
Alle neuen Schritt-30-Pflichtdateien und Einzelkommandos sind grün. Schritt 30 ist abgeschlossen; die rote vollständige Alt-Suite bleibt als separater Folgepunkt dokumentiert.

## Probleme und Abweichungen

Die vollständige alte Integrationstest-Suite ist weiterhin nicht grün. Die Fehler liegen außerhalb der neu implementierten V3-Wiki-/Docs-Testdateien und betreffen vor allem alte DELETE-Statusverträge sowie zwei bestehende Verhaltensabweichungen bei Kommentarsortierung und Subtask-Tiefe.

## Offene Punkte / Folgeaufgaben

Separater Folgeauftrag: alte Integrationstest-Suite fachlich entscheiden und bereinigen.
