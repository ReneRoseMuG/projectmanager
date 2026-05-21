# Log: UI-Regressionen

**Datum:** 21.05.26  
**Schritt:** Fix — UI-Regressionen Menüs, Buttonhöhe und Detailbreite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Detailrouten nutzen jetzt einen paddingfreien Full-Bleed-Bereich, damit Header, Tabbar und Footer ohne seitliche Leerränder an die verfügbare App-Fläche andocken. `FormModal` und `DetailModal` wurden auf ein robusteres Shell-Modell umgestellt: Header, Tabbar und Footer bleiben feste Flex-Bereiche, nur der Inhaltsbereich scrollt. Dadurch überdeckt der Footer keine Action-Menüs mehr. `ListBoardView` und `CardGrid` verwenden eine größere Mindest-Arbeitsfläche, damit leere und gefüllte Boards/Listen den sichtbaren Raum besser ausnutzen. Das `ActionMenu` wurde größer und sichtbarer gestaltet. Top-Level-Listen für Projekte, Tickets und Features sind wieder full-width/fill-height statt max-width-zentriert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/App.tsx` | geändert | Detailrouten bekommen paddingfreies, overflow-hidden Full-Bleed-Main |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Page-Shell mit intern scrollendem Inhaltsbereich und festem Footer/Header |
| `apps/web/src/components/ui/DetailModal.tsx` | geändert | Detail-Shell an dasselbe Full-Bleed-Scrollmodell angepasst |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Board/List-Flächen mit größerer Mindesthöhe und full-width Verhalten |
| `apps/web/src/components/ui/CardGrid.tsx` | geändert | Kartenraster füllt die verfügbare Arbeitsfläche besser aus |
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Drei-Punkt-Menü größer, kontrastreicher und besser klickbar |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Übersichtsseite nutzt volle Breite und Höhe |
| `apps/web/src/pages/TicketsPage.tsx` | geändert | Übersichtsseite nutzt volle Breite und Höhe |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Übersichtsseite nutzt volle Breite und Höhe |
| `apps/web/src/pages/*DetailPage.tsx` | geändert | Detailseitenwrapper von negativen Margin-Hacks auf Full-Bleed-Flex umgestellt |
| `tests/unit/web/**` | geändert | Layout-, Menü- und Detailseiten-Erwartungen aktualisiert |
| `tests/browser/web/project.spec.ts` | geändert | Browser-Abnahme für neues Detailseiten-Scrollmodell angepasst |

## Probleme und Abweichungen

Der erste vollständige E2E-Lauf zeigte, dass der zuvor sticky Footer ActionMenu-Dropdowns überdecken konnte. Das wurde nicht mit höheren Z-Indizes gelöst, sondern durch das stabilere Layoutmodell mit intern scrollendem Inhaltsbereich. Keine API-, Datenmodell-, Permission-, Seed- oder Query-Änderungen.

## Offene Punkte / Folgeaufgaben

Keine.
