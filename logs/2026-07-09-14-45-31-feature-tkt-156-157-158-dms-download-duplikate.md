# Log: TKT-156/157/158 DMS-Download und Duplikaterkennung

**Datum:** 09.07.26  
**Uhrzeit:** 14:45:31  
**Schritt:** Feature — TKT-156, TKT-157, TKT-158  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für den Dokumentmanager wurde ein berechtigungspflichtiger Einzeldatei-Download über `GET /api/documents/:id/download` ergänzt und in der Kachelansicht als Download-Icon verdrahtet. Der Zip-Download nutzt nun denselben Blob-Download-Helfer wie der Einzel-Download und gibt die Object-URL erst verzögert frei. Attachments speichern einen internen SHA-256-Inhaltshash; neue Uploads werden gegen vorhandene Inhalte geprüft. DMS-Direktuploads mit bereits vorhandenem Inhalt werden mit `409 CONFLICT` abgelehnt, während fachliche Attachment-Uploads das vorhandene Original an den neuen Parent verknüpfen. Bestehende Datensätze ohne Hash werden beim nächsten gleich großen Upload dateibasiert nachgehasht; der lokale Datei-Watcher aktualisiert den Hash nach externen Änderungen ebenfalls.

Testleitplanken wurden angewendet: API-Integrationstests nutzen echte MySQL-Testdatenbanken, echte Multipart-Uploads und isolierte Upload-Verzeichnisse; Web-Tests bleiben auf Unit-Ebene mit gestubbten Hooks/Browser-APIs. Abgedeckt sind Einzel-Download, Zip-Download-Blob-Verhalten, DMS-Dedupe, Legacy-Hash-Backfill, Parent-Verknüpfung bei Duplikaten sowie Hook-/Kachelverdrahtung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `attachments.content_hash` und Index ergänzt |
| `apps/api/src/db/migrations/20260709122517_vengeful_paibok/` | neu | Wiederanlaufsichere Migration mit Snapshot |
| `apps/api/src/repositories/attachment.repository.ts` | geändert | Hash-Lookups, Backfill und Hash-Aktualisierung ergänzt |
| `apps/api/src/services/attachments.service.ts` | geändert | Upload-Dedupe für DMS und fachliche Attachments |
| `apps/api/src/services/attachment-watcher.service.ts` | geändert | Externe Dateiänderungen aktualisieren Größe, Version und Hash |
| `apps/api/src/services/document-download.service.ts` | geändert | Einzeldatei-Downloaddaten und leeres-Zip-Schutz |
| `apps/api/src/routes/dms.ts` | geändert | `GET /documents/:id/download` ergänzt |
| `apps/web/src/api/documents.ts` | geändert | Einzel-Download-API ergänzt |
| `apps/web/src/hooks/useDocuments.ts` | geändert | `downloadDocument` als reine Leseaktion ergänzt |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Gemeinsamer Blob-Download-Helfer und Einzel-Download-Handler |
| `apps/web/src/components/attachments/DocumentTile.tsx` | geändert | Download-Icon neben Löschaktion ergänzt |
| `tests/integration/api/attachments.test.ts` | geändert | Dedupe-Verknüpfung an zweiten Parent getestet |
| `tests/integration/api/dms.test.ts` | geändert | Einzel-Download, DMS-Dedupe und Legacy-Hash-Backfill getestet |
| `tests/unit/web/components/attachments/DocumentTile.test.tsx` | geändert | Download-Button stoppt Kachelereignisse |
| `tests/unit/web/hooks/useDocuments.test.tsx` | geändert | Einzel-Download invalidiert keine Dokumentliste |
| `tests/unit/web/pages/DocumentsPage.upload.test.tsx` | geändert | Zip-Blob-Download und verzögertes Revoke getestet |
| `tests/unit/web/pages/DocumentsPage.dnd.test.tsx` | geändert | Hook-Mock um `downloadDocument` ergänzt |

## Probleme und Abweichungen

Graphify konnte wegen eines lokalen `uv`-Trampoline-Fehlers nicht als Repo-Query genutzt werden; die Analyse lief deshalb über Ticket-Connector, gezielte lokale Suche und relevante Repo-Dokumente. Beim ersten kombinierten API-Testlauf schlugen neue DMS-Testannahmen zum Upload-Verzeichnis fehl; die Tests wurden auf konkrete Service-Dateipfade korrigiert und anschließend grün wiederholt. Ein kurzzeitig eingeführter frühzeitiger `config`-Import im Attachment-Test wurde entfernt, weil er bestehende Upload-Verzeichnis-Isolation beeinflusste.

## Offene Punkte / Folgeaufgaben

Keine.
