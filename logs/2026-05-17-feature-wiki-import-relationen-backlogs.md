# Log: Wiki-Import Relationen und Backlogs

**Datum:** 17.05.26  
**Schritt:** Feature — Wiki-Import Relationen und Backlogs  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Wiki-Import verarbeitet Feature-Dateien jetzt so, dass der gespeicherte Feature-Kerninhalt vor der Headline `## Use Cases` endet. Use Cases, Backlog-Dateien, Aufgaben und Feature-Querverweise werden nicht mehr als Steuertext im Feature-Content belassen, sondern als eigene Domänenobjekte beziehungsweise Relationen importiert. Für Feature-zu-Feature-Verweise wurde eine neue Relationstabelle eingeführt und per API verfügbar gemacht. Backlog-Items besitzen nun einen `import_key`, damit wiederholte Imports vorhandene Einträge aktualisieren statt zu duplizieren. Der Import akzeptiert außerdem direkt übergebene `features`-Ordner und findet Aufgaben im benachbarten Wiki-Ordner.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `feature_relations` und `backlog_items.import_key` ergänzt |
| `apps/api/src/db/migrations/0008_broken_the_order.sql` | neu | Migration für Feature-Relationen und Backlog-Import-Key |
| `apps/api/src/db/migrations/meta/0008_snapshot.json` | neu | Drizzle-Snapshot zur Migration |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Drizzle-Journal um Migration 0008 ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Typen für Feature-Relationen, Backlog-Import-Key und Import-Report erweitert |
| `apps/api/src/services/wiki-import.service.ts` | geändert | Feature-Kernschnitt, Relationsextraktion, Backlog-Import und flexibler Quellpfad |
| `apps/api/src/services/doc-links.service.ts` | geändert | Feature-Relationen listen und setzen |
| `apps/api/src/routes/doc-links.ts` | geändert | API-Routen für Feature-Relationen ergänzt |
| `apps/api/src/services/backlog.service.ts` | geändert | Backlog-Import-Key in DTO und Service aufgenommen |
| `apps/api/src/routes/backlog.ts` | geändert | Backlog-Import-Key im API-Schema zugelassen |
| `apps/api/src/services/dump.service.ts` | geändert | `feature_relations` in Dump-/Restore-Tabellen registriert |
| `apps/api/src/app.integration.test.ts` | geändert | Integrationstest für Feature-Pfad-Import mit Relationen, Backlogs und Tasks |
| `apps/web/src/api/doc-links.ts` | geändert | Frontend-API-Client für Feature-Relationen ergänzt |
| `apps/web/src/components/ui/__tests__/factories.ts` | geändert | Backlog-Testfactory um `importKey` ergänzt |
| `apps/web/src/components/ui/__tests__/TaskListBoardView.test.tsx` | geändert | TypeScript-Non-null-Assertion nach bestehender Längenprüfung ergänzt |

## Probleme und Abweichungen

Der erste vollständige API-Testlauf zeigte, dass die neue Tabelle `feature_relations` noch nicht in der Dump-Tabellenliste registriert war. Das wurde als direkte Folge der Schemaänderung ergänzt. Der Web-Build gibt weiterhin nur die bestehende Vite-Warnung zu großen Chunks aus.

## Offene Punkte / Folgeaufgaben

Keine.
