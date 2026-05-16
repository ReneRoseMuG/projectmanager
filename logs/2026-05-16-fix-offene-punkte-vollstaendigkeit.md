# Log: Offene Vollständigkeitspunkte schließen

**Datum:** 16.05.26  
**Schritt:** Fix / Feature — Offene Punkte aus der Vollständigkeitsprüfung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die offenen Punkte aus der Vollständigkeitsprüfung wurden fachlich geschlossen. Die DB-Defaults für Projekte, Tags und Termine wurden auf die Werte aus dem Großauftrag gesetzt; zusätzlich erzwingt eine neue SQLite-Folgemigration für Attachments, dass genau ein Owner (`project_id` oder `task_id`) gesetzt ist. Die Shared Types enthalten nun `Event` und typisieren `Note.contentJson` als JSON-Objekt. Die Multipart-Routen validieren den Upload-Body über das Fastify-Multipart-Schema.

Die API-Testabdeckung wurde um einen Integrationstest erweitert, der alle Route-Gruppen über eine temporäre SQLite-Datei prüft. Im Frontend wurden ein zentraler Toast-Provider, wiederverwendbare Skeleton-Komponenten und ein Favicon ergänzt, damit Ladezustände und Aktionsfeedback vollständig vorhanden sind und der Browser keine Asset-404-Fehler meldet. Die lokale Dev-DB wurde migriert und per `foreign_key_check` geprüft.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Default-Farben korrigiert, Attachment-Check ergänzt |
| `apps/api/src/db/migrate.ts` | geändert | SQLite-Rebuild-Migration mit FK-Off/FK-Check abgesichert |
| `apps/api/src/db/migrations/0001_wakeful_the_call.sql` | neu | Folgemigration für Defaults und Attachment-Constraint |
| `apps/api/src/db/migrations/meta/0001_snapshot.json` | neu | Drizzle-Snapshot zur neuen Migration |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migrationsjournal ergänzt |
| `apps/api/src/plugins/multipart.ts` | geändert | Multipart-Felder an Body gehängt und Shared Schema aktiviert |
| `apps/api/src/routes/attachments.ts` | geändert | Multipart-Body-Schema und Body-basiertes Upload-Lesen |
| `apps/api/src/routes/notes.ts` | geändert | `contentJson` als Objekt validiert |
| `apps/api/src/services/*.ts` | geändert | Defaults, JSON-Objekt-Handling und Event-Typ angepasst |
| `apps/api/src/services/helpers.test.ts` | geändert | JSON-Objekt-Test angepasst |
| `apps/api/src/app.integration.test.ts` | neu | API-Integrationstest über alle Route-Gruppen |
| `packages/shared-types/src/index.ts` | geändert | `JsonObject`, `Event`, objektbasiertes `contentJson` |
| `packages/shared-types/dist/*` | geändert | Shared-Type-Build aktualisiert |
| `apps/web/src/components/ui/ToastProvider.tsx` | neu | Zentrales Toast-System |
| `apps/web/src/components/ui/Skeleton.tsx` | neu | Wiederverwendbare Skeleton-Komponenten |
| `apps/web/src/main.tsx` | geändert | ToastProvider eingebunden |
| `apps/web/src/pages/*.tsx` | geändert | Toasts, Skeletons und Fehlerfeedback in Hauptseiten |
| `apps/web/src/components/**/*.tsx` | geändert | Toast-kompatible Aktionspfade, Defaults und Skeleton-Nutzung |
| `apps/web/index.html` | geändert | Favicon eingebunden |
| `apps/web/public/favicon.svg` | neu | Favicon gegen Browser-404 |
| `apps/web/dist/*` | geändert | Web-Build aktualisiert |

## Probleme und Abweichungen

`drizzle-kit generate` konnte die SQLite-Default-Änderungen nicht automatisch als SQL erzeugen und hat nur einen Hinweis generiert. Die erzeugte Migration wurde deshalb manuell mit SQLite-Tabellen-Rebuilds gefüllt. Um Datenverlust durch FK-Kaskaden beim Rebuild zu vermeiden, setzt `migrate.ts` die Foreign-Key-Prüfung während der Migration aus und führt danach `foreign_key_check` aus.

Der Browser-Use-Pluginpfad war nicht verfügbar, weil kein `node_repl`/`js`-Tool bereitgestellt wurde. Der Browser-Check wurde stattdessen mit lokal installiertem Chrome im Headless-Modus und Chrome DevTools Protocol durchgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
