# Log: DMS Zuweisung per Drag & Drop, scrollende Listen, automatische Spaltenbreite

**Datum:** 08.07.26  
**Uhrzeit:** 10:19:51  
**Schritt:** Feature — Dokument-Manager: Zuweisen per D&D, Klick filtert immer, Panel-Scroll, Auto-Breite, Suchleiste  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der unsichtbare Doppelmodus der linken Verwaltungsspalte wurde aufgelöst. Bisher hat ein Klick auf eine Sammlung oder Kategorie bei aktiver Mehrfachauswahl **ungefragt zugewiesen** statt zu filtern — ohne Bestätigung und ohne Rückgängig. Ab sofort gilt: **Klick filtert immer, Zuweisen geschieht per Drag & Drop.** Zwei verschiedene Gesten, kein versteckter Zustand.

Umgesetzt mit `@dnd-kit` (bereits Abhängigkeit), gespiegelt nach dem erprobten Muster aus `WikiTree`: `PointerSensor` mit `activationConstraint: { distance: 6 }`, damit Einfachklick (markieren) und Doppelklick (öffnen) der Kachel unverändert funktionieren. Dokumentkacheln sind Drag-Quellen, Sammlungs- und Kategoriezeilen sind Ablageziele. Wird eine markierte Kachel gezogen, wandert die ganze Auswahl mit; eine unmarkierte zieht nur sich selbst.

Zusätzlich (vom Nutzer im selben Auftrag verlangt): Sammlungs- und Kategorienliste scrollen je für sich (`max-h-[40vh]`), Überschrift und „Neu…"-Formular bleiben stehen. Die linke Spalte ermittelt ihre Breite inhaltsgesteuert aus dem längsten Eintrag, geklemmt auf 280–460 px; Namen brechen um statt abgeschnitten zu werden (`truncate` entfernt). Die Suchleiste wurde entzerrt: Das Suchfeld verliert `flex-1`, die vier Dropdowns bekommen eine Mindestbreite, die Kachelgrößen-Gruppe sitzt rechts.

Das Backend blieb **vollständig unangetastet** — die Bulk-Zuweis-Endpunkte existierten bereits und werden nur vom Drop-Handler aufgerufen. Keine API-Änderung, keine Migration, keine Permission-Änderung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/utils/textMeasure.ts` | neu | Geteilte Canvas-Textmessung (Font als Parameter) |
| `apps/web/src/components/attachments/documentDnd.ts` | neu | Drop-ID-Präfixe, `parseDropTarget`, `dragDocumentIds`, `dragIdsFromData` |
| `apps/web/src/components/attachments/documentPanelWidth.ts` | neu | `computePanelWidth` mit injizierbarer Messfunktion, Min/Max-Korridor |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | `DndContext`, Drag-/Drop-Wrapper, Filter-Handler entkoppelt, Scrollbereiche, Auto-Breite, Suchleiste |
| `apps/web/src/components/attachments/DocumentSidePanel.tsx` | geändert | `widthPx` gilt jetzt auch für `side="left"`; Ziehgriff bleibt rechts-exklusiv |
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Lokale `measureTextWidth` durch geteilte Funktion ersetzt (Font-Konstante `TREE_ROW_FONT`) |
| `tests/unit/web/components/attachments/documentDnd.test.ts` | neu | Drop-Auflösung, Drag-Nutzlast, Gegenbeispiele |
| `tests/unit/web/components/attachments/documentPanelWidth.test.ts` | neu | Längster Eintrag, Aufschläge, Klemmen auf Min/Max |
| `tests/unit/web/pages/DocumentsPage.dnd.test.tsx` | neu | Seiten-Verdrahtung: Drop → richtige Mutation; Klick filtert und schreibt nicht |

## Probleme und Abweichungen

**Erster Lesevorgang lieferte einen veralteten Dateistand.** Die zuerst gelesene Fassung von `DocumentsPage.tsx` kannte den Endungsfilter aus Commit `39ff5cf` nicht. Beim Editieren meldete das Werkzeug „modified since read". Prüfung ergab: `HEAD` unverändert auf `ec76509`, Arbeitsbaum sauber, also keine Fremdänderung durch eine Parallel-Session. Die Datei wurde vollständig neu gelesen und die Umsetzung auf dem tatsächlichen Stand (inkl. viertem Dropdown „Alle Endungen") aufgebaut.

**Bewusster Rückbau einer jüngeren Änderung.** `promptContinueOrClear` — der Dialog „Weitere Bulk-Operation?" aus Log `07.07.26 13:21:20` — wurde entfernt, ebenso die zugehörige `useConfirm`-Nutzung. Das geschah **auf ausdrückliche Nutzerentscheidung**, nicht nebenbei: Der Dialog bestätigte die harmlose Folgefrage (Auswahl behalten), während die eigentliche Schreiboperation unbestätigt durchlief.

**`DocumentTile` wurde bewusst nicht angefasst.** Statt der Kachel `useDraggable` einzubauen, hängt das Ziehen an einem Wrapper (`DraggableTile`). So bleiben die feinjustierte Klick-Verdrahtung (Einfachklick markiert, Doppelklick öffnet, Checkbox und Löschen mit `stopPropagation`) und der bestehende Test `DocumentTile.test.tsx` unverändert. `drag.attributes` wird nicht gespreizt — es setzte `role="button"`/`tabIndex` auf einen Container, der bereits Checkbox und Button enthält, und bringt ohne `KeyboardSensor` keinen Nutzen.

**`measureTextWidth` geteilt statt dupliziert** (Nutzerentscheidung „kein doppelter Code"). Die Funktion wanderte aus `WikiTree` nach `apps/web/src/utils/textMeasure.ts` und bekam den Font als Parameter. `WikiTree` reicht exakt seinen bisherigen Font-String durch; Verhalten identisch, seine Tests laufen unverändert grün. Die zeilenspezifischen Konstanten (`FIXED_OVERHEAD`, `LEVEL_INDENT`) blieben in `WikiTree`.

**Blocker — visuelle Prüfung nicht durchgeführt.** Die Änderung ist visuell. Eine Browser-Verifikation hätte einen Dev-Server plus Anmeldung und die zentrale Aiven-Datenbank erfordert; ein Lauf gegen produktive Daten war nicht vertretbar und nicht beauftragt. Betroffen ist nur die Abnahme der Optik (Scrollbereiche, Spaltenbreite, Filterzeile) — Funktion und Guards sind über Unit-Tests bewiesen. Manuelle Sichtprüfung durch den Nutzer nötig.

**Blocker — MCP-Abschlusskommentar (§13.1.1) abgelehnt.** `add_comment_to_parent` an `PROJ-3` wurde vom Auto-Mode-Klassifizierer blockiert. Gemäß §13.1.1 wurde der Kommentartext stattdessen im Chat ausgegeben; dieser dateibasierte Log ist die verbindliche Mindestdokumentation. Kein Umgehungsversuch.

## Angewendete Leitplanken

`planungsleitplanken` (Plan-Gate), `code-discipline` (Disziplin-Gate vor der ersten Änderung), `test-entwurfsleitplanken` (Testentwurf).

**Testebene:** Unit (jsdom). **Mock-Entscheidung:** `@dnd-kit/core` wird als Page-Grenze gemockt — die Bibliothek ist der externe Collaborator, geprüft wird die eigene Drop-Auflösung; Datenhooks, Toast und Asset-URL sind gestubbt. Die Textmessung ist injizierbar, weil `canvas.getContext("2d")` unter jsdom nicht existiert und ein Test gegen die echte Messung nichts bewiesen hätte. **Isolation:** jsdom, keine API, keine echte Navigation, keine Produktivdaten.

**Prüfungen:** `npm run typecheck -w apps/web` ✅ · `npm run lint -w apps/web` ✅ · 22 neue Tests grün (15 + 7) · bestehende Tests der berührten Bereiche (`WikiTree`, `DocumentTile`, `documentThumbnailSize`, `useDocuments`) 29 grün, unverändert.

## Offene Punkte / Folgeaufgaben

- **Etappe 2 (abgestimmt, nicht umgesetzt):** Mehrere Kategorien und mehrere Tags gleichzeitig als Filter — „oder" innerhalb einer Facette, „und" zwischen den Facetten — und Tags als dritter Abschnitt in die linke Spalte. Erfordert die Erweiterung des Filter-Contracts (`category`/`tag` ein- oder mehrfach) über `api/documents.ts`, `routes/dms.ts` und `services/document.service.ts`, dazu sortierte ID-Mengen im Query-Key gegen Cache-Doppler und Nachführung von `documents-list-contracts.test.ts`.
- **Kein Rückgängig (bewusste Variante A):** Ein Fehl-Drop wird im Detailformular pro Dokument korrigiert. Ein Bulk-Entfernen und ein „Rückgängig" auf dem Toast wären nachrüstbar (Toast-Aktionen werden vom `ToastProvider` bereits unterstützt), brauchen aber zwei neue Bulk-Delete-Routen und die Rückgabe der tatsächlich neu erzeugten Verknüpfungen — sonst reißt ein Rückgängig vorbestehende Zuordnungen mit.
- **Keine E2E-Abdeckung für `/documents`.** Existierte vorher nicht, wurde nicht nebenbei aufgebaut. `tests/browser/web/task-dnd.spec.ts` zeigt, dass echtes Browser-Ziehen testbar wäre.
- **Tastaturbedienung:** Ziehen ist zeigergerätgebunden, wie im Wiki-Seitenbaum. `dnd-kit` böte einen `KeyboardSensor`.
- **Eingeklapptes Panel** bietet keine Ablageziele und klappt beim Ziehen nicht automatisch auf.
- **Beobachtung ohne Auftrag (Skalierung):** `listDocumentLibrary` lädt (außer bei numerischem `folder`) alle `attachments` und filtert erst danach im Speicher (`applyLibraryFilters`). Bei mehreren tausend Dokumenten wird das teuer, inklusive der Pagination. Bestand bereits vorher; nicht angefasst.
- **Leitfaden-Pflege:** `docs/design-leitfaden.md` §8.25 beschreibt die linke Spalte mit fester responsiver Breite und kennt keine Ablageziele. Ein Formulierungsvorschlag folgt über `leitfaden-pflege`; der Leitfaden wurde nicht ungefragt geändert.
