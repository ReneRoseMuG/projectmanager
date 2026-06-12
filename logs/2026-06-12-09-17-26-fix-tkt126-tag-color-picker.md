# Log: TKT-126 Tag-Color-Picker (Feld + Popover, pflegbare Palette)

**Datum:** 12.06.26  
**Uhrzeit:** 09:17:26  
**Schritt:** Fix — TKT-126 (Tag Picker: Panel-Aktualisierung, Scroll, Farbpalette)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

TKT-126 umfasste drei Punkte am Tag-Picker. **Punkt 3 (Farbpalette)** wurde nach
Rücksprache neu ausgerichtet: Statt die Palette zu entfernen, wird die Farbauswahl
hinter einem **kompakten Farb-Feld** versteckt, das eine **Popover-Picker-UI** öffnet
(Farbrad + Helligkeitsregler + Hex-Eingabe + Palette). Damit wird die Palette nicht
mehr dauerhaft „unter die Nase gerieben", sondern erscheint nur im geöffneten Popover.
Die Palette ist jetzt **pflegbar und importierbar** (Farbe hinzufügen/entfernen, Hex-Liste
einfügen) und wird browser-lokal in `localStorage` gespeichert. Technisch wurde die
moderne Bibliothek `@uiw/react-color` eingebunden und in die bestehende, zentrale
`ColorPicker`-Komponente gekapselt — die drei Nutzungsstellen (TagPicker, TagManager,
CatalogManager) profitieren automatisch, ohne dass sie umgebaut werden mussten.
**Punkt 1 (Scroll zu früh):** Die Auswahlliste nutzt jetzt den real verfügbaren Platz
statt einer festen Höhe von 160 px. **Punkt 2 (Picker aktualisiert sich nicht):** Nach
dem Anlegen eines Tags wächst das Panel; die Position des Portal-Dropdowns wird nun neu
berechnet, sodass es nicht mehr stehen bleibt und „nicht aktualisiert" wirkt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useColorPalette.ts` | neu | Browser-lokale, pflegbare Farbpalette (localStorage) + Hex-Import-Parser |
| `apps/web/src/components/ui/ColorPicker.tsx` | geändert | Feld + Popover (Farbrad/Helligkeit/Hex/Palette) statt dauerhaft sichtbarer Swatch-Reihe |
| `apps/web/src/components/tags/TagPicker.tsx` | geändert | Integration neues Feld; adaptive Listenhöhe (Punkt 1); Reposition nach Anlegen (Punkt 2) |
| `apps/web/src/components/settings/CatalogManager.tsx` | geändert | An neue ColorPicker-API angepasst (Prop `swatches` entfällt) |
| `tests/unit/web/hooks/useColorPalette.test.ts` | neu | Unit-Tests: Parsing, add/remove/import, localStorage-Persistenz |
| `tests/unit/web/components/ui/ColorPicker.test.tsx` | neu | Unit-Tests: Palette versteckt, Auswahl, Hex, Hinzufügen, Import, Außenklick |
| `apps/web/package.json` | geändert | Dependency `@uiw/react-color` ergänzt |

## Testleitplanken / Testebenen

- Angewandt: `test-entwurfsleitplanken`. Ebene: **Unit**. Keine Mocks außer `onChange`-Spy;
  echtes jsdom-`localStorage`, echter `@uiw`-Picker. Negativ-/Randfälle abgedeckt
  (ungültige Hex, Import ohne Treffer, case-insensitive Dedupe).
- Ergebnis: betroffene Tests grün (28 Tests in 3 Dateien), Web-Typecheck fehlerfrei.

## Probleme und Abweichungen

- Punkt 3 wurde gegenüber dem ursprünglichen Ticket-Wortlaut („Farbpalette entfernen")
  bewusst zu „Palette hinter Feld verstecken + pflegbar machen" geändert — auf
  ausdrücklichen Wunsch im Verlauf.
- Punkt 2: Die Ursache (stehengebliebene Portal-Position nach Wachsen des Panels) wurde
  aus dem Code abgeleitet und behoben; eine visuelle Browser-Verifikation steht auf Wunsch
  noch aus (kein eigenständiger Preview gestartet).

## Offene Punkte / Folgeaufolgaben

- Optionale Browser-Verifikation der drei Punkte im laufenden Frontend auf Wunsch.
- Palette ist bewusst browser-lokal (kein Backend/Teilen). Eine team-/serverweite
  Palette wäre ein eigenes Feature (Datenmodell + Migration + API).
