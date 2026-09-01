# Log: Parent-Dateiansicht

**Datum:** 27.08.26  
**Uhrzeit:** 15:15:09  
**Schritt:** 4 — Web-API, Query-Hooks und Parent-Attachment-UI  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Parent-Uploadoberflächen speichern Dateien ohne DMS-Auswahl ausschließlich als Parent-Anhang. Die Dateiansicht verwendet ownerlokale virtuelle Ordner statt globaler DMS-Sammlungen und zeigt verknüpfte DMS-Dokumente klar mit einem DMS-Kennzeichen an. Vorhandene DMS-Dokumente können über eine Suche explizit verknüpft, innerhalb der Parent-Ordner verschoben und wieder entknüpft werden; die UI erklärt dabei ausdrücklich, dass das DMS-Dokument bestehen bleibt. Lokale Windows-Ordner bleiben als eigene Festplattenquelle mit realer Hierarchie erhalten. Navigation, Seitenschutz und Aktionen des globalen Dokumentenmanagements verwenden nun die Permission `documents`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/attachments.ts` | geändert | Parent-Ordner- und Dokumentlink-API ergänzt, Uploadvertrag getrennt |
| `apps/web/src/api/documents.ts` | geändert | Eigene Dokument-Lösch- und Öffnen-Routen verwendet |
| `apps/web/src/hooks/useAttachments.ts` | geändert | Parent-Ordner und DMS-Links als TanStack-Query-State integriert |
| `apps/web/src/queries/queryKeys.ts` | geändert | Ownerlokale Folder- und Link-Keys ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Zusammenhängende Parent- und Dokumentscopes invalidiert |
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Getrennte Parent-Dateiansicht, DMS-Picker und Windows-Quelle umgesetzt |
| `apps/web/src/components/attachments/AttachmentUploader.tsx` | geändert | DMS-Sichtbarkeitsauswahl entfernt |
| `apps/web/src/components/ui/PendingFileList.tsx` | geändert | Neue Parent-Anhänge eindeutig beschrieben |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Globales DMS als eigenständige Dokumentdomäne formuliert |
| `apps/web/src/App.tsx` | geändert | Dokumentseite mit `documents:read` geschützt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | DMS-Navigation an `documents` gebunden |

## Testleitplanken

Der Testentwurfs-Skill `test-entwurfsleitplanken` wurde angewendet. Die in diesem Schritt berührte Web-Anwendung wurde zunächst statisch durch den vollständigen Web-Typecheck geprüft. Komponenten- und Browserverhalten werden in der nachfolgenden dedizierten Teststufe mit echten Query- und API-Verträgen nachgewiesen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Bestehende Unit- und Browser-Tests werden im Testschritt auf die neue Bedienlogik umgestellt und um die DMS-Linkfälle ergänzt.
