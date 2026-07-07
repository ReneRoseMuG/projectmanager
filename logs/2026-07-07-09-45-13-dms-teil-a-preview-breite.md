# Log: Dokument-Manager Teil A — Preview-Breite bei nicht-anzeigbaren Dateien

**Datum:** 07.07.26  
**Uhrzeit:** 09:45:13  
**Schritt:** A — Fix (Preview-Panel-Breite)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Beim Öffnen einer Datei ohne Vorschau (Archiv/Zip, unbekannte Dateitypen) sprang das Detail-Panel bisher auf die für PDF/Text/Office/Video gedachte Vorschaubreite (1000 px), obwohl nur die Meldung „keine Vorschau verfügbar" angezeigt wird — verschenkter Platz. Ursache: Die Breiten-Kalkulation kannte nur „Bild" vs. „alles andere" und ignorierte das bereits vorhandene Flag `previewEnabled`.

Die Startbreiten-Entscheidung wurde in eine reine, testbare Funktion `initialDetailWidth(document, max)` ausgelagert. Sie öffnet Bilder auf Maximalbreite (danach per Bild-Probe verfeinert), Typen mit Vorschau auf der breiten Fläche und Typen **ohne** Vorschau auf der Mindestbreite (320 px). Die Seite nutzt jetzt diese Funktion; das manuelle Ziehen am Panelrand bleibt unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/attachments/documentPreviewWidth.ts` | neu | Konstanten + `clampDetailWidth` + reine `initialDetailWidth`-Logik |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Import der Util, `useEffect` nutzt `initialDetailWidth`, lokale Duplikate entfernt |
| `tests/unit/web/components/attachments/documentPreviewWidth.test.ts` | neu | 5 Unit-Tests (Bild, PDF, Zip, unbekannt, Klemm-Grenze) |

## Probleme und Abweichungen

Keine. Gezielter Testlauf `npm run test -w apps/web -- documentPreviewWidth`: 5/5 grün.

## Offene Punkte / Folgeaufgaben

Teil B (zweizeiliges Card-Layout) und Teil C (Multiselect + Bulk-Zuweisung + Bulk-Download) folgen im selben Auftrag.
