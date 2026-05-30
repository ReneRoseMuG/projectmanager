# Log: Tab-Board-Außenrand und Header

**Datum:** 21.05.26  
**Schritt:** Fix — Tab-Board-Außenrand und Header  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die füllenden `Section`-Container für List-/Board-Tabs verwenden keinen zusätzlichen Kartenrahmen und kein eigenes Padding mehr. Dadurch liegt die List/Board-View auf Detailformular-Tabs deutlich näher am verfügbaren Inhaltsbereich und wird nicht mehr durch eine zweite Card-Hülle eingeengt. Normale `Section`-Container für Formularfelder behalten ihren bisherigen Rahmen, Hintergrund, Schatten und Innenabstand. Zusätzlich wurde die Abrundung der Page-Variante des Detailformular-Headers entfernt, indem die Page-Form keine obere Formularabrundung und der Header keine `rounded-t-2xl`-Klasse mehr erhält. Die Modal-Variante der Formular-Shell bleibt unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Section.tsx` | geändert | `fill`-Sections rendern ohne Card-Chrome und Padding. |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Page-Header und Page-Form sind oben nicht mehr abgerundet. |
| `tests/unit/web/components/ui/FormModal.test.tsx` | geändert | Erwartung an nicht gerundeten Page-Header angepasst. |
| `tests/unit/web/components/ui/Section.test.tsx` | neu | Normale und füllende Section-Varianten gegen Layout-Regressionen abgesichert. |

## Probleme und Abweichungen

Keine. Der Web-Build meldet weiterhin nur die bekannte Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.

## Ausgeführte Prüfungen

- `npm run test -w apps/web -- FormModal Section ProjectListBoardView TaskListBoardView FeatureListBoardView BacklogListBoardView UseCaseListBoardView MilestoneListBoardView` — grün, 8 Testdateien / 30 Tests.
- `npm run build -w apps/web` — grün, mit bekannter Vite-Chunk-Size-Warnung.
