# Log: BacklogForm

**Datum:** 16.05.26  
**Schritt:** 3 — BacklogItemForm-Modal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das BacklogItemForm-Modal nutzt nun einen Tangerine-Gradient-Header mit Breadcrumbs, Item-Bezug und Promote-Action. Stammdaten, Status/Priorität und Feature-Bezug wurden in Sub-Cards aufgeteilt. Status und Priorität sind segmentierte Controls; der Feature-Bezug wird als Linked-Pattern mit bestehendem Feature-Select gepflegt. Der Footer enthält Statushinweis, Löschen, Abbrechen und Speichern.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | BacklogItemForm auf Studie-2-Form-Chrome umgestellt |

## Probleme und Abweichungen

Die Promote- und Lösch-Aktionen sind im Formular selbst deaktiviert, weil die bestehenden Hooks dafür im Page-Container liegen und nicht als Props an das Formular übergeben werden.

## Offene Punkte / Folgeaufgaben

Promote- und Delete-Actions können in einem Folgeauftrag als echte Props in das Form-Modal gehoben werden.
