# Log: Attachments UI

**Datum:** 16.05.26  
**Schritt:** 15 — Attachments-UI (Uploader, Preview, Lightbox)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Attachment-UI wurde mit Drag-and-Drop-Uploader, Listenansicht und Preview-Komponente umgesetzt. Bilder werden eingebettet und per nativer Dialog-Lightbox geöffnet. PDFs werden per `<embed>` angezeigt. Andere Dateien erhalten eine Icon-Darstellung mit Öffnen- und Löschen-Aktion.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/attachments/AttachmentUploader.tsx` | neu | Datei-Upload |
| `apps/web/src/components/attachments/AttachmentList.tsx` | neu | Attachment-Liste |
| `apps/web/src/components/attachments/AttachmentPreview.tsx` | neu | Preview-Logik |
| `apps/web/src/hooks/useAttachments.ts` | neu | Attachment-Datenlogik |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
