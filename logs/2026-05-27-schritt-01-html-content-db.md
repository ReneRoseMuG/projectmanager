# Log: HTML-Content in der DB

**Datum:** 27.05.26  
**Schritt:** 1 — HTML-Content und Editor-Bilder in SQLite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Feature-, Use-Case- und Wiki-Inhalte werden jetzt DB-first über neue `content`-Spalten gelesen und geschrieben; vorhandene `content_path`-Dateien bleiben als Legacy-Fallback lesbar. Für eingebettete Editor-Bilder gibt es die neue geschützte API `POST /api/content/images` und `GET /api/content/images/:id`, die Bilddaten als BLOB in `content_images` speichert und mit `contentImages:write` bzw. `contentImages:read` abgesichert ist. Die betroffenen Rich-Text-Felder in Feature-, Use-Case- und Wiki-Formularen/Details nutzen den neuen Upload-Endpunkt. Wiki-Importe schreiben importierten Inhalt direkt in die DB statt in neue Content-Dateien. Der Dump-Export serialisiert `content_images.data` base64 und importiert es wieder als BLOB.

Testleitplanken wurden angewendet. Testebenen: API-Integration mit echter Temp-DB und Temp-Dateisystemen sowie Web-Build/Typecheck; Rollenfälle wurden mit echten Sessions und Rollen geprüft. Bewiesen wurde: DB-Content-Create/Update, Legacy-Fallback, Content-Image Upload/Get inklusive MIME-/Größen-/Auth-Fehlern und BLOB-Dump-Roundtrip.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `content`-Spalten und Tabelle `content_images` ergänzt |
| `apps/api/src/db/migrations/0032_content_images.sql` | neu | Migration für Content-Spalten und BLOB-Tabelle |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration 0032 registriert |
| `apps/api/src/routes/content-images.ts` | neu | Geschützte Upload- und Auslieferungsroute für Editor-Bilder |
| `apps/api/src/services/content-images.service.ts` | neu | MIME-, Größen- und Speicherlogik für Content-Bilder |
| `apps/api/src/repositories/content-image.repository.ts` | neu | Persistenzzugriffe für `content_images` |
| `apps/api/src/services/content.service.ts` | geändert | DB-first-Lesen mit Dateisystem-Fallback |
| `apps/api/src/services/features.service.ts` | geändert | Feature-Content schreibt in `features.content` |
| `apps/api/src/services/use-cases.service.ts` | geändert | Use-Case-Content schreibt in `use_cases.content` |
| `apps/api/src/services/wiki.service.ts` | geändert | Wiki-Content schreibt in `wiki_pages.content` |
| `apps/api/src/services/wiki-import.service.ts` | geändert | Import-Content wird direkt in DB-Felder geschrieben |
| `apps/api/src/services/dump.service.ts` | geändert | `content_images` in Dumps aufgenommen, BLOB base64 serialisiert |
| `apps/api/scripts/migrate-content-to-db.mjs` | neu | Idempotentes Migrationsscript für vorhandene Content-Dateien |
| `apps/api/src/app.ts` | geändert | Content-Image-Routen registriert |
| `apps/api/src/plugins/auth.ts` | geändert | Permission-Mapping für `contentImages` ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Permission-Ressource und Upload-Response ergänzt |
| `apps/web/src/api/content-images.ts` | neu | Web-API-Funktion `uploadContentImage` |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Content-Editor nutzt neuen Bild-Upload |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Detail-Content-Editor nutzt neuen Bild-Upload |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-Editor nutzt neuen Bild-Upload |
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | geändert | Wiki-Detail-Editor nutzt neuen Bild-Upload |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Wiki-Formular nutzt neuen Bild-Upload |
| `tests/fixtures/api/app.ts` | geändert | Test-App registriert Content-Image-Routen |
| `tests/fixtures/api/db.ts` | geändert | `truncateAll` berücksichtigt `content_images` |
| `tests/integration/api/content-images.test.ts` | neu | Upload/Get/Auth/Validierungsfälle für Content-Bilder |
| `tests/integration/api/features.test.ts` | geändert | DB-Content und Legacy-Fallback geprüft |
| `tests/integration/api/use-cases.test.ts` | geändert | DB-Content und Legacy-Fallback geprüft |
| `tests/integration/api/wiki.test.ts` | geändert | DB-Content und Legacy-Fallback geprüft |
| `tests/integration/api/dumps-local.test.ts` | geändert | `content_images` BLOB-Roundtrip abgesichert |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` ist durch die vorhandene drizzle-kit-Konfiguration blockiert: `generate:sqlite --config` wird von der installierten CLI nicht akzeptiert; der alternative `npx drizzle-kit generate --config=...` bricht wegen eines veralteten Migrationsordnerformats ab. Deshalb wurde die Migration manuell als `0032_content_images.sql` angelegt und im Journal registriert. `npm run db:migrate -w apps/api` lief anschließend erfolgreich durch.

## Offene Punkte / Folgeaufgaben

Der spätere Cleanup-Auftrag kann `content_path` und die verbleibenden Dateisystem-Hilfen entfernen, sobald keine Legacy-Daten mehr darauf angewiesen sind.
