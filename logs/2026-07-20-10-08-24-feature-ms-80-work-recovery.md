# Log: MS-80 auf Work-Stand wiederhergestellt

**Datum:** 20.07.26  
**Uhrzeit:** 10:08:24  
**Schritt:** Feature — MS-80 und Work-DMS auf Recovery-Branch zusammenführen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Recovery-Branch `recovery/ms-80-on-work` wurde unverändert von `work` abgezweigt und mit `feature/ms-80-dms-refactoring` zusammengeführt; beide Ursprungsbranches blieben unangetastet. Die 24 Mergekonflikte wurden so aufgelöst, dass das MS-80-Datenmodell mit DMS-Tags, genau einer direkten Sammlung, Versionierung, Lifecycle-Trennung und geschützten Dateirouten verbindlich bleibt. Aus `work` wurden die Dokumentkacheln, direkte Bildvorschauen, gecachte PDF-/Office-/ODF-Thumbnails und die persistente Kachelgröße wiederhergestellt. Die Thumbnail-Route verlangt `attachments:read`; LibreOffice-Konvertierungen bleiben begrenzt und der gemeinsame Preview-Cache wird beim Löschen bereinigt. Unvereinbare Kategorie-, Mehrfachsammlungs-, Kategorie-DnD- und `DocumentViewer`-Reste wurden nicht in den MS-80-Vertrag zurückgebracht.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/dms.ts` | geändert | MS-80-Routen mit geschütztem Thumbnail-Endpunkt kombiniert |
| `apps/api/src/services/attachment-preview.service.ts` | geändert | Geschützte Vorschauen und begrenzte Thumbnail-Erzeugung zusammengeführt |
| `apps/api/src/repositories/attachment.repository.ts` | geändert | Work-Download und Watcher-Hash-Felder im MS-80-Repository erhalten |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | MS-80-Navigation und Detailpanel mit Thumbnail-Grid kombiniert |
| `apps/web/src/components/attachments/DocumentTile.tsx` | geändert | Tags sowie getrennte Bibliotheks- und Löschaktionen ergänzt |
| `apps/web/src/api/documents.ts` | geändert | Geschützte Thumbnail-URL ergänzt |
| `packages/shared-types/src/index.ts` | geändert | MS-80-Typen mit Work-CalendarSync-Vertrag zusammengeführt |
| `docs/design-leitfaden.md` | geändert | DMS-Kachelregel auf den kombinierten MS-80-Vertrag aktualisiert |
| `tests/unit/web/pages/DocumentsPage.grid.test.tsx` | neu | Grid-, Thumbnail-, Tag-, Größen- und Einzel-Sammlungs-Vertrag |
| `tests/integration/api/attachments.test.ts` | geändert | Thumbnail-Route um 401-/403-Nachweise ergänzt |

## Probleme und Abweichungen

Die Testentwurfsleitplanken wurden für Web-Unit, API-Unit, echte MySQL-Integration, Windows-Importer und MCP-Unit angewendet. Die produktiven Builds für Shared Types, API, Web, MCP und Windows-Importer sind grün. Von 142 gezielt ausgeführten Tests sind 140 grün. Ein Web-Unit-Test erwartet den nicht vorhandenen Titel „Kachelgröße Groß“, während die Oberfläche die bestehenden Labels S/M/L verwendet. Ein aus `work` übernommener Attachment-Duplikat-Test sendet beim Owner-Upload noch nicht das seit MS-80 verpflichtende `libraryVisibility` und erhält deshalb korrekt `400`. Gemäß `agents.md` §4.3 wurden diese beiden Testfehler während des laufenden Testauftrags nicht eigenständig korrigiert.

## Offene Punkte / Folgeaufgaben

- Kachelgrößen-Assertion auf den vorhandenen S/M/L-Vertrag nachführen und den gezielten Web-Lauf erneut ausführen.
- Duplikat-Integrationstest um die explizite MS-80-Bibliothekssichtbarkeit ergänzen und den Attachment-Lauf erneut ausführen.
- Danach den Recovery-Merge final als vollständig abgenommen bewerten.
