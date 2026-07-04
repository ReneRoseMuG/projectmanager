# Log: Tag-Domäne (PM/DMS) mit Sichtbarkeitstrennung

**Datum:** 04.07.26  
**Uhrzeit:** 23:11:02  
**Schritt:** Feature — Tags nach Domäne (Projektmanagement / Dokumentenmanagement) trennen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Tags erhalten eine neue Spalte `domain` (`'pm' | 'dms'`, `NOT NULL DEFAULT 'pm'`). Der DEFAULT ordnet
alle Bestandstags automatisch der PM-Domäne zu — kein separates Backfill-Statement nötig. Die
Sichtbarkeitstrennung ist zweifach abgesichert: server-seitig über den optionalen Filter
`GET /tags?domain=…` (primäre, testbare Grenze) und als defensiver Client-Filter im `TagPicker`.
Neu angelegte Tags erben die Domäne ihres Kontexts (PM-Picker → `pm`, DMS-Picker → `dms`).

Die Migration folgt dem etablierten abbruchsicheren Muster (Stored Procedure mit
`information_schema`-Vorprüfung), damit sie gegen die zentrale Aiven-DB aus jedem Teilzustand
wiederanlaufen kann. `PATCH /tags/:id` akzeptiert bewusst **kein** `domain` (kein stiller
Domänen-Umzug, konsistent mit `updateTag`). Die Tag-Verwaltung (Option b) erhielt eine
Bereichs-Spalte mit Badge, einen Domänen-Umschalter (Alle/PM/DMS) und einen Domänen-Selektor beim
Anlegen. Alle neun Tag-Nutzungsstellen (4 Formulare, 4 Board-Views, DMS-Seite) wurden verdrahtet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `tags.domain` (shortText, NOT NULL, default 'pm') |
| `apps/api/src/db/migrations/20260704203925_marvelous_wolfsbane/` | neu | Abbruchsichere Migration (Stored Procedure + information_schema) |
| `packages/shared-types/src/index.ts` | geändert | `TagDomain` + `Tag.domain` |
| `apps/api/src/services/tags.service.ts` | geändert | `mapTag`/`listTags(domain?)`/`createTag(domain)` + alle Selects |
| `apps/api/src/routes/tags.ts` | geändert | GET `?domain` (enum), POST `domain` (enum), PATCH ohne domain |
| `apps/api/src/services/document.service.ts` | geändert | `loadTags`/`loadTagsForIds` liefern `domain` |
| `apps/web/src/api/tags.ts` | geändert | `getTags(domain?)` / `createTag(domain?)` |
| `apps/web/src/queries/queryKeys.ts` | geändert | `tags.list(domain?)` |
| `apps/web/src/hooks/useTags.ts` | geändert | Signatur `useTags(domain?, enabled?)` |
| `apps/web/src/components/tags/TagPicker.tsx` | geändert | Pflicht-Prop `domain` + defensiver Filter + createTag-Domäne |
| `apps/web/src/components/tags/TagManager.tsx` | geändert | Bereichs-Badge, Domänen-Umschalter, Anlege-Domäne (Option b) |
| `apps/web/src/components/{projects,milestones,tasks,tickets}/*Form.tsx` | geändert | `<TagPicker domain="pm">` |
| `apps/web/src/components/{projects,milestones,tasks,tickets}/*ListBoardView.tsx` | geändert | `useTags("pm", …)` |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | `useTags("dms")` + `<TagPicker domain="dms">` |
| `tests/integration/api/tags.test.ts` | geändert | 6 neue Domänen-Tests (Filter, Default, 400, Gegenbeispiele) |
| `tests/unit/web/components/tags/TagPicker.test.tsx` | geändert | domänenbewusster Mock + 3 Sichtbarkeits-/Anlege-Tests |

## Testleitplanken und Testebenen

Angewandt: `planungsleitplanken`, `datenmodell`, `test-entwurfsleitplanken`.

- **Integration (API, echte Temp-MySQL via `createTestDb`, keine Mocks):** POST-Default `pm`,
  POST `dms` persistiert, `GET ?domain=pm|dms` mit Gegenbeispiel (jeweils andere Domäne
  ausgeschlossen, Assertion auf die komplette Ergebnismenge), `GET` ohne Filter liefert beide,
  ungültige Domäne → 400. Migration läuft real bei jedem Testlauf durch.
- **Unit (Web, jsdom, gemockter Hook):** PM-Picker zeigt nur PM-Tags (DMS-Gegenbeispiel),
  DMS-Picker nur DMS-Tags, `createTag` mit korrekter Domäne.

Testergebnisse (seriell, lokale Test-MySQL 8.0.45):
- `apps/api` tags: 28 grün (22 Bestand + 6 neu)
- `apps/web` TagPicker: 15 grün (12 Bestand + 3 neu)
- Regressionsprüfung betroffener Bereiche: API dms/documents 18 grün; Web ListBoardView + Form-catalogTiming 103 grün
- Typecheck: `apps/api` grün, `apps/web` grün; `shared-types` gebaut

## Probleme und Abweichungen

Der Typecheck deckte auf, dass das DMS Tags direkt in `document.service.ts` lädt (nicht über den
Tag-Service). Diese zwei Ladefunktionen wurden konsistent zum Tag-Service um `domain` ergänzt —
war Teil des Backend-Scopes, nicht ursprünglich einzeln geplant.

## Offene Punkte / Folgeaufgaben

Keine. Bewusst nicht umgesetzt (kein Auftrag): DB-Constraint zwischen Tag-Domäne und
Zuweisungstabelle sowie Domänen-Umzug bestehender Tags — beides wären eigene Folgeaufträge.
