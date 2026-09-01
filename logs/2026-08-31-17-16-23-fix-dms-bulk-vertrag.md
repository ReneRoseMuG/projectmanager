# Log: DMS-Bulk-Vertrag

**Datum:** 31.08.26  
**Uhrzeit:** 17:16:23  
**Schritt:** Fix — DMS-Bulk-Vertrag  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die globale DMS-Bulk-Funktion wurde auf den aktuellen MS-80-Vertrag gebracht: Kategorien werden nicht wiederbelebt, DMS-Tags bleiben die Label-Struktur und Sammlungen bleiben ausschließlich globale DMS-Sammlungen. Für mehrere Dokumente wurde eine versionierte Bulk-Zuweisung zu genau einer globalen Sammlung ergänzt. Der globale ZIP-Download `POST /api/documents/download` nutzt den vorhandenen Archiv-Service und bündelt ausgewählte DMS-Dokumente als echtes ZIP. Parent-Dateiansichten, Parent-Ordner, lokale Windows-Ordner und exklusive Parent-Attachments wurden nicht angefasst.

Für die Testbewertung wurden `planungsleitplanken`, `test-entwurfsleitplanken` und Graphify angewendet. Die Testebene ist Integration: echte Fastify-App, echte MySQL-Testdatenbank, echte Auth-Sessions, echte Multipart-Uploads ins Temp-Verzeichnis und echtes ZIP ohne Mocks.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/document.service.ts` | geändert | Versionierte Bulk-Zuweisung von DMS-Dokumenten zu einer globalen Sammlung ergänzt |
| `apps/api/src/routes/dms.ts` | geändert | Routen für Bulk-Sammlung und globalen DMS-ZIP-Download ergänzt |
| `tests/integration/api/dms-bulk.test.ts` | geändert | Testvertrag von Kategorien auf DMS-Tags und versionierte Bulk-Sammlungen umgestellt |
| `logs/2026-08-31-17-16-23-fix-dms-bulk-vertrag.md` | neu | Schritt-Log für den DMS-Bulk-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Gezielt grün verifiziert wurden `npm test -w apps/api -- --run tests/integration/api/dms-bulk.test.ts --fileParallelism=false`, `npm run typecheck -w apps/api` und `npm run lint`.

## Offene Punkte / Folgeaufgaben

Der komplette Abnahmelauf steht noch aus.
