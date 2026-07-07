# Log: DMS Kachelansicht — Grid mit Thumbnails, Größenwähler, Lightbox, Nav-Zuweisung

**Datum:** 07.07.26  
**Uhrzeit:** 15:32:15  
**Schritt:** Feature (grundlegender Umbau der Dokumente-Seite)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dokumente-Seite wurde von der Listenansicht mit rechter Detailspalte auf eine **Kachel-/Grid-Ansicht** umgebaut:

- **Kacheln mit Thumbnail:** Bilder zeigen ein skaliertes Vorschaubild (`object-cover`, `loading="lazy"`), alle anderen Typen ein großes Typ-Icon mit Badge. Darunter der Dateiname.
- **Größenwähler S/M/L** in der Toolbar steuert die Grid-Spaltenbreite (`repeat(auto-fill, minmax(minPx, 1fr))`); die Wahl wird in `localStorage` gehalten.
- **Rechte Detail-/Bulk-Spalte entfällt** vollständig samt Panel-Breiten-/Resize-Logik.
- **Doppelklick öffnet eine Lightbox** (`DocumentViewer`): Datei groß über die bestehende `DocumentPreviewBody`-Logik plus Bearbeitung von Anzeigename, Beschreibung und Labels; Zuordnungen werden angezeigt und sind dort entfernbar. Schließen per Schaltfläche, Escape oder Backdrop-Klick.
- **Sammlung/Kategorie über die linke Navigation:** Kacheln markieren (Mehrfachauswahl bleibt), dann auf einen Sammlungs-/Kategorie-Eintrag klicken → allen Markierten zugewiesen. Doppelmodus: ohne Auswahl filtert der Klick, mit Auswahl weist er zu (Hinweisbanner + Tooltips). Danach greift die bestehende „weiter oder aufheben"-Nachfrage.
- **Auswahl-Leiste** über dem Grid (bei aktiver Auswahl) mit Zip-Download und „Auswahl aufheben".

Das Backend blieb unverändert — die bereits vorhandenen Bulk-Endpunkte (Zuweisen/Zip) und die Vorschau-Logik werden nur anders angesteuert. Thumbnails werden bewusst nur für Bilder erzeugt (Entscheidung des Nutzers), daher kein Backend-Aufwand.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/attachments/DocumentTile.tsx` | neu | Kachel (Thumbnail/Icon, Auswahl, Doppelklick, Löschen) + `documentTitle` |
| `apps/web/src/components/attachments/DocumentViewer.tsx` | neu | Lightbox-Großansicht mit Metadaten/Labels/Zuordnungen |
| `apps/web/src/components/attachments/documentThumbnailSize.ts` | neu | S/M/L-Größenstufen + localStorage-Helfer |
| `apps/web/src/pages/DocumentsPage.tsx` | neu geschrieben | 2 Spalten, Grid, Größenwähler, Auswahl-Leiste, Nav-Doppelmodus, Viewer |
| `apps/web/src/components/attachments/DocumentCard.tsx` | gelöscht | durch DocumentTile ersetzt |
| `apps/web/src/components/attachments/DocumentBulkPanel.tsx` | gelöscht | rechtes Bulk-Panel entfällt |
| `apps/web/src/components/attachments/documentPreviewWidth.ts` | gelöscht | Panel-Breiten-Logik entfällt |
| `tests/unit/web/components/attachments/DocumentTile.test.tsx` | neu | 7 Tests (Thumbnail/Icon, Auswahl, Öffnen, Löschen, Rechte) |
| `tests/unit/web/components/attachments/documentThumbnailSize.test.ts` | neu | 4 Tests (Default, Roundtrip, ungültiger Wert, Stufen) |
| `tests/unit/web/components/attachments/DocumentCard.test.tsx` | gelöscht | Komponente entfällt |
| `tests/unit/web/components/attachments/documentPreviewWidth.test.ts` | gelöscht | Util entfällt |

## Probleme und Abweichungen

- **Zuordnung entfernen** blieb erhalten (im Viewer, X an den Pills) — bewusste Beibehaltung der bestehenden Funktion, obwohl der Auftrag nur das Setzen über die Nav nannte.
- **Kein isolierter `DocumentsPage`-Test:** die Seite hat kein Test-Setup; die neuen Bausteine (`DocumentTile`, Größen-Helfer) sind getestet, die Bulk-/Metadaten-Hooks weiterhin über `useDocuments.test`.
- **Performance-Risiko:** ohne serverseitiges Bild-Resize lädt das Grid volle Bilder skaliert (gemildert durch `lazy` + progressives Nachladen). Echte Server-Thumbnails wären ein späteres Upgrade.

## Prüfungen

Web-Typecheck grün. Vollständige Web-Unit-Suite: **877 Tests / 125 Dateien grün** (inkl. neuer DMS-Tests). Kein Backend berührt; keine verwaisten Referenzen auf entfernte Module.

## Offene Punkte / Folgeaufgaben

- Design-Leitfaden §8.26 muss neu gefasst werden (Kachelansicht/Größenwähler/Lightbox statt Karte/Panel) — Vorschlag folgt, nur nach Freigabe.
- Änderungen noch nicht committet (kein `save`).
