# Log: Wiki-Import

**Datum:** 16.05.26  
**Schritt:** Feature — Wiki-Import für Features, Use Cases und Projektaufgaben  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der projektbezogene Wiki-Import wurde als zusätzlicher Importweg für lokale `docs/wiki`-Ordner umgesetzt. Das Backend bietet eine Vorschau und eine transaktionale Ausführung, liest Feature-Dateien, einzelne Use-Case-Dateien und offene Aufgaben aus `tasks/` und überspringt geschlossene Aufgaben, Templates, Übersichten und aggregierte Dateien. Features und Use Cases werden per Slug aktualisiert oder angelegt; Aufgaben werden pro Projekt über `importKey` idempotent aktualisiert. Importierte Features werden mit dem Zielprojekt verknüpft, Aufgaben werden bei erkennbaren Markdown-Beziehungen zusätzlich mit Features und Use Cases verbunden. Im Frontend wurde ein Import-Tab in der Projektdetailseite ergänzt, der Vorschau, Fehler, Warnungen, Ergebnisliste und Ausführung abbildet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `tasks.importKey` und eindeutiger Index pro Projekt ergänzt |
| `apps/api/src/db/migrations/0003_swift_the_initiative.sql` | neu | Migration für `import_key` und Unique-Index |
| `apps/api/src/db/migrations/meta/0003_snapshot.json` | neu | Drizzle-Migrationsmetadaten |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Drizzle-Journal um Migration 0003 erweitert |
| `packages/shared-types/src/index.ts` | geändert | Shared Types für Preview, Run, Report und Import-Ergebnisse ergänzt |
| `apps/api/src/services/wiki-import.service.ts` | neu | Parser, Vorschau, transaktionaler Import und Upsert-/Link-Logik |
| `apps/api/src/routes/imports.ts` | neu | Fastify-Routen für `preview` und `run` |
| `apps/api/src/app.ts` | geändert | Import-Routen registriert |
| `apps/api/tests/helpers/app.ts` | geändert | Import-Routen in Test-App registriert |
| `apps/api/tests/integration/wiki-import.test.ts` | neu | Integrationstests für Vorschau, Import, Idempotenz und Fehlerfälle |
| `apps/web/src/api/imports.ts` | neu | Frontend-API-Funktionen für Wiki-Import |
| `apps/web/src/hooks/useWikiImport.ts` | neu | Hook für Preview-/Run-Zustände |
| `apps/web/src/components/imports/WikiImportPanel.tsx` | neu | Projekt-Import-UI mit Vorschau und Ergebnisliste |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Import-Tab ergänzt und Reload nach erfolgreichem Import verdrahtet |

## Probleme und Abweichungen

`npm run db:generate` hat trotz Exit-Code 0 die Meldung `Failed to find Response internal state key` ausgegeben; die Migration wurde erzeugt und `npm run db:migrate` anschließend erfolgreich ausgeführt. Der Web-Build zeigt weiterhin die bestehende Vite-Warnung zu Chunks über 500 kB; der Build selbst ist erfolgreich. Funktionale Abweichungen vom bestätigten Plan sind nicht bekannt.

## Offene Punkte / Folgeaufgaben

Keine für den Wiki-Import. Die bestehende Bundle-Größenwarnung bleibt außerhalb dieses Auftrags.
