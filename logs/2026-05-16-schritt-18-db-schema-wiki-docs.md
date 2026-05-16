# Log: DB-Schema Wiki/Docs

**Datum:** 16.05.26  
**Schritt:** 18 — DB-Schema: Neue Tabellen und Migrationen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Datenbankschema wurde um die Dokumentations- und Wiki-Ebene erweitert. Neu hinzugekommen sind `features`, `use_cases`, `wiki_pages`, `backlog_items`, `project_features`, `task_features` und `task_use_cases`. Zusätzlich wurden `FEATURE_STATUSES` und `BACKLOG_STATUSES` ergänzt. Die Migration wurde mit `drizzle-kit generate` erzeugt und anschließend auf die lokale Entwicklungsdatenbank angewendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Neue Tabellen, Status-Konstanten und Foreign Keys ergänzt |
| `apps/api/src/db/migrations/0002_minor_sinister_six.sql` | neu | Migration für Wiki-/Docs-Tabellen |
| `apps/api/src/db/migrations/meta/0002_snapshot.json` | neu | Drizzle-Snapshot zur Migration |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration-Journal um Schritt 0002 erweitert |

## Selbsttest-Protokoll — Schritt 18: DB-Schema Wiki/Docs

### 1. TypeScript-Build
Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei.

### 2. Migration
Kommando: `npm run db:migrate -w apps/api`  
Ergebnis: Fehlerfrei.

### 3. Schema-Verifikation
Pflichtkommando: `sqlite3 apps/api/taskmanager.db ".tables"`  
Ergebnis: Nicht ausführbar, weil `sqlite3` auf dem System nicht installiert ist.

Ersatzprüfung mit `better-sqlite3` gegen `apps/api/data/taskmanager.sqlite`:

```text
tables=__drizzle_migrations,attachments,backlog_items,comments,events,features,notes,project_features,project_notes,project_tags,projects,tags,task_features,task_notes,task_tags,task_use_cases,tasks,use_cases,wiki_pages
```

Foreign Keys `use_cases`:

```json
[{"id":0,"seq":0,"table":"features","from":"feature_id","to":"id","on_update":"NO ACTION","on_delete":"CASCADE","match":"NONE"}]
```

Foreign Keys `backlog_items`:

```json
[{"id":0,"seq":0,"table":"use_cases","from":"use_case_id","to":"id","on_update":"NO ACTION","on_delete":"SET NULL","match":"NONE"},{"id":1,"seq":0,"table":"features","from":"feature_id","to":"id","on_update":"NO ACTION","on_delete":"SET NULL","match":"NONE"},{"id":2,"seq":0,"table":"projects","from":"project_id","to":"id","on_update":"NO ACTION","on_delete":"CASCADE","match":"NONE"}]
```

### 4. API-Smoke-Tests
Für Schritt 18 nicht vorgesehen, weil noch keine neuen Endpunkte existieren.

### 5. Dateisystem-Check
Für Schritt 18 nicht vorgesehen.

### 6. Abweichungen vom Plan
Abweichungen vorhanden:

- Die neue Migration heißt nicht `0001_wiki_docs.sql`, weil im bestehenden Projekt bereits `0000` und `0001` versioniert sind. Gemäß Migrationsstrategie wurde die nächste Migration `0002_minor_sinister_six.sql` erzeugt.
- Das Pflichtwerkzeug `sqlite3` ist nicht installiert. Die Schema- und FK-Prüfung wurde deshalb mit `better-sqlite3` durchgeführt.

### Gesamtstatus
Alle Pflicht-Checks sind fachlich grün. Schritt 18 ist abgeschlossen.

## Probleme und Abweichungen

Siehe Selbsttest-Protokoll. Es gibt keine fachlichen Blocker.

## Offene Punkte / Folgeaufgaben

Schritt 19: Content FileSystem Service.
