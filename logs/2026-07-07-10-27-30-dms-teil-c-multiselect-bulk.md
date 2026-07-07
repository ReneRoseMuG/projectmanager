# Log: Dokument-Manager Teil C — Multiselect, Bulk-Zuweisung, Bulk-Download

**Datum:** 07.07.26  
**Uhrzeit:** 10:27:30  
**Schritt:** C — Feature (Mehrfachauswahl + Bulk)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dokumentliste erhält eine Mehrfachauswahl: jede Karte hat eine Checkbox, bei aktiver Auswahl togglet ein Klick auf die Karte die Auswahl statt die Vorschau zu öffnen. Sobald mindestens ein Dokument markiert ist, weicht das rechte Vorschau-Panel einer Bulk-Leiste, über die sich die gesamte Auswahl einer Sammlung oder Kategorie zuweisen oder gebündelt als Zip herunterladen lässt.

Backend: drei neue Endpunkte unter der bestehenden Ressource `attachments` — `POST /documents/bulk/folders/:folderId` und `POST /documents/bulk/categories/:categoryId` (beide `write`) sowie `POST /documents/download` (`read`). Die Zuweisung läuft als **ein** gebündelter Insert über gefilterte IDs (kein N+1, konstante Roundtrips). Der Zip-Download bündelt die Dateien serverseitig und streamt sie; fehlende Dateien (Prod-Drift) werden übersprungen statt den Download abzubrechen.

Besonderheit: `archiver` v8 exportiert Format-Klassen statt einer aufrufbaren Default-Funktion und liefert unter ESM keinen Default-Export; die installierten `@types/archiver` (v7) beschreiben noch die alte API (daher Typecheck grün, aber Laufzeit-500). Gelöst durch Laden der `ZipArchive`-Klasse per `createRequire` und Streaming über `reply.hijack()`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/repositories/attachment.repository.ts` | geändert | `findDownloadRecords` (filename + originalName für Zip) |
| `apps/api/src/services/attachment-folder.service.ts` | geändert | `addAttachmentsToFolder` (gebündelter Insert) |
| `apps/api/src/services/attachment-category.service.ts` | geändert | `assignCategoryToAttachments` (gebündelter Insert) |
| `apps/api/src/services/document-download.service.ts` | neu | Zip-Bau (ZipArchive v8 via createRequire), Kollisions-/Drift-robust |
| `apps/api/src/routes/dms.ts` | geändert | 3 Bulk-Routen + Schemas + Hijack-Zip-Streaming |
| `apps/web/src/api/documents.ts` | geändert | 3 Bulk-API-Funktionen (inkl. Zip-Blob) |
| `apps/web/src/hooks/useDocuments.ts` | geändert | `addToFolderBulk`, `assignCategoryBulk`, `downloadZip` |
| `apps/web/src/components/attachments/DocumentCard.tsx` | geändert | Auswahl-Checkbox + Selektions-Interaktionsmodell |
| `apps/web/src/components/attachments/DocumentBulkPanel.tsx` | neu | Bulk-Leiste (Zuweisen + Zip-Download) |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Auswahl-State, Bulk-Handler, Bulk-Panel-Render |
| `tests/integration/api/dms-bulk.test.ts` | neu | 6 Integrationstests (Auth, Zuweisung, Validierung, echtes Zip) |
| `tests/unit/web/components/attachments/DocumentCard.test.tsx` | geändert | Selektions-Tests ergänzt |
| `tests/unit/web/hooks/useDocuments.test.tsx` | geändert | Bulk-Hook-Tests ergänzt |

## Probleme und Abweichungen

`archiver`-v8-API-Bruch analysiert und robust gelöst (siehe oben) — isoliert verifiziert, dass `ZipArchive` ein gültiges Zip erzeugt. Testentwurf gemäß `test-entwurfsleitplanken`: Integration (echte DB, echte Sessions, Temp-Upload, echtes Zip) + Unit (Card-Interaktion, Hook-Mutationen/Invalidierung).

## Prüfungen

- API-Typecheck grün, Web-Typecheck grün.
- `tests/integration/api/dms-bulk.test.ts`: 6/6 grün (401/403-Guards, Bulk-Zuweisung mit Gegenbeispiel, Idempotenz, 400/404, echtes Zip mit Originalnamen).
- Web-Unit (Card/Hook/Breite): 18/18 grün.

## Offene Punkte / Folgeaufgaben

Prüfen, ob `docs/design-leitfaden.md` einen kurzen Abschnitt zur DMS-Karte und zur Mehrfachauswahl-Leiste aufnehmen sollte (Leitfaden-Pflege, nur Vorschlag — keine ungefragte Änderung).
