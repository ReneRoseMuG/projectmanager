# Log: Design-Leitfaden §8.26 (DMS-Kachelansicht) ergänzt

**Datum:** 07.07.26  
**Uhrzeit:** 16:58:01  
**Schritt:** Doku (Design-Leitfaden)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Nach Freigabe durch den Nutzer wurde der Design-Leitfaden um **§8.26 DMS-Kachelansicht (DocumentTile / DocumentViewer)** ergänzt: Kachel-Grid, Thumbnail/Typ-Icon, S/M/L-Größenwähler, Interaktion (Einfachklick = Auswahl, Doppelklick = Großansicht), Zuweisung über die linke Navigation im Doppelmodus, Auswahl-Leiste, Endungsfilter sowie die Lightbox-Großansicht. Die Lightbox wird darin ausdrücklich als bewusste Overlay-Ausnahme zum seiten-internen Detailpanel aus §8.25 benannt.

Der Vorschlag entstand über den Skill `leitfaden-pflege` und wurde erst nach ausdrücklicher Freigabe eingetragen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/design-leitfaden.md` | geändert | Neuer Abschnitt §8.26 (DMS-Kachelansicht) vor §9 |

## Probleme und Abweichungen

Beim Eintragen fiel eine **Differenz in §8.25** auf: Der dortige Verweis „Detailbereich neben einer scrollenden Hauptliste (aktuell die Dokumente-Seite)" trifft nach dem Umbau nicht mehr zu (die rechte Detailspalte ist entfallen; das linke Verwaltungs-Panel nutzt weiter `DocumentSidePanel`), und das Overlay-Verbot berührt die neue Lightbox. Diese §8.25-Anpassung wurde **nicht** ungefragt vorgenommen, sondern dem Nutzer als Folgepunkt mit Formulierungsvorschlag gemeldet.

## Offene Punkte / Folgeaufgaben

- §8.25-Differenz (Dokumente-Seiten-Verweis + Overlay-Verbot) zur Freigabe offen.
- Änderung noch nicht committet (kein `save`).
